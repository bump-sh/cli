import {Config} from '@oclif/core'
import {CLIError} from '@oclif/core/errors'
import debug from 'debug'
import {resolve} from 'node:path'

import {BumpApi} from '../api/index.js'
import {DiffRequest, DiffResponse, VersionRequest, VersionResponse, WithDiff} from '../api/models.js'
import {API} from '../definition.js'

export interface DiffResult extends DiffResponse {
  doc_name?: string
}

export class Diff {
  // 120 seconds = 2 minutes
  static readonly TIMEOUT = 120

  private _bump!: BumpApi
  private _config: Config | undefined

  public constructor(config?: Config) {
    if (config) {
      this._config = config
    }
  }

  get bumpClient(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this._config!)
    return this._bump
  }

  get pollingPeriod(): number {
    return process.env.BUMP_POLLING_PERIOD ? Number(process.env.BUMP_POLLING_PERIOD) : 1000
  }

  async createDiff(
    file1: string,
    file2: string,
    expires: string | undefined,
    overlays1?: string[] | undefined,
    overlays2?: string[] | undefined,
  ): Promise<DiffResponse | undefined> {
    const api = await API.load(file1)
    const [previous_definition, previous_references] = await api.extractDefinition(undefined, overlays1)
    const api2 = await API.load(file2)
    const [definition, references] = await api2.extractDefinition(undefined, overlays2 || overlays1)
    const request: DiffRequest = {
      definition,
      expires_at: expires,
      previous_definition,
      previous_references,
      references,
    }

    const response = await this.bumpClient.postDiff(request)

    switch (response.status) {
      case 201: {
        this.d(`Diff created with ID ${response.data.id}`)
        this.d(response.data)
        return response.data
        break
      }

      case 204: {
        break
      }
    }
  }

  async createVersion(
    file: string,
    documentation: string,
    token: string,
    hub: string | undefined,
    branch_name: string | undefined,
    previous_version_id: string | undefined = undefined,
    overlays?: string[] | undefined,
  ): Promise<VersionResponse | undefined> {
    const api = await API.load(file)

    const [definition, references] = await api.extractDefinition(undefined, overlays)
    const request: VersionRequest = {
      branch_name,
      definition,
      documentation,
      hub,
      previous_version_id,
      references,
      unpublished: true,
    }

    const response = await this.bumpClient.postVersion(request, token)

    switch (response.status) {
      case 201: {
        this.d(`Unpublished version created with ID ${response.data.id}`)
        return response.data
        break
      }

      case 204: {
        break
      }
    }
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:diff`)(formatter, ...args)
  }

  extractDiff(versionWithDiff: VersionResponse & WithDiff): DiffResult {
    // TODO: return a real diff_id in the GET /version API
    return {
      breaking: versionWithDiff.diff_breaking,
      details: versionWithDiff.diff_details,
      doc_name: versionWithDiff.doc_name,
      id: versionWithDiff.id,
      markdown: versionWithDiff.diff_markdown,
      public_url: versionWithDiff.diff_public_url,
      text: versionWithDiff.diff_summary,
    }
  }

  isVersion(result: DiffResponse | VersionResponse): result is VersionResponse {
    return (result as VersionResponse).doc_public_url !== undefined
  }

  isVersionWithDiff(result: DiffResponse | (VersionResponse & WithDiff)): result is VersionResponse & WithDiff {
    const {diff_details, diff_markdown, diff_summary} = result as VersionResponse & WithDiff
    return (diff_summary || diff_markdown || diff_details) !== undefined
  }

  async pollingDelay(): Promise<void> {
    await this.delay(this.pollingPeriod)
  }

  public async run(
    file1: string,
    file2: string | undefined,
    documentation: string | undefined,
    hub: string | undefined,
    branch: string | undefined,
    token: string | undefined,
    format: string,
    expires?: string | undefined,
    overlays1?: string[] | undefined,
    overlays2?: string[] | undefined,
  ): Promise<DiffResult | undefined> {
    if (!this._config) this._config = await Config.load(resolve(import.meta.dirname, './../../'))

    let diffVersion: DiffResponse | VersionResponse | undefined

    if (file2 && (!documentation || !token)) {
      diffVersion = await this.createDiff(file1, file2, expires, overlays1, overlays2)
    } else {
      if (!documentation || !token) {
        throw new Error('Please login to bump (with documentation & token) when using a single file argument')
      }

      diffVersion = await this.createVersion(file1, documentation, token, hub, branch, undefined, overlays1)

      if (file2) {
        diffVersion = await this.createVersion(
          file2,
          documentation,
          token,
          hub,
          branch,
          diffVersion && diffVersion.id,
          overlays2 || overlays1,
        )
      }
    }

    if (diffVersion) {
      return this.waitResult(diffVersion, token, {
        format,
        timeout: Diff.TIMEOUT,
      })
    }

    return undefined
  }

  async waitResult(
    apiResponse: DiffResponse | VersionResponse,
    token: string | undefined,
    opts: {format: string; timeout: number},
  ): Promise<DiffResult> {
    let diffResult: DiffResult = {id: apiResponse.id}
    const pollingResponse = await (this.isVersion(apiResponse) && token
      ? this.bumpClient.getVersion(apiResponse.id, token)
      : this.bumpClient.getDiff(apiResponse.id, opts.format))

    if (opts.timeout <= 0) {
      throw new CLIError(
        'We were unable to compute your documentation diff. Sorry about that. Please try again later. If the error persists, please contact support at https://bump.sh.',
      )
    }

    switch (pollingResponse.status) {
      case 200: {
        const diff: DiffResponse | (VersionResponse & WithDiff) = pollingResponse.data

        diffResult = this.isVersionWithDiff(diff) ? this.extractDiff(diff) : diff

        this.d('Received diff:')
        this.d(diffResult)
        return diffResult
        break
      }

      case 202: {
        this.d('Waiting 1 sec before next poll')
        await this.pollingDelay()
        return this.waitResult(apiResponse, token, {
          format: opts.format,
          timeout: opts.timeout - 1,
        })
        break
      }
    }

    return diffResult
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }
}

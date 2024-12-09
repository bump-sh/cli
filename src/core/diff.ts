import {CLIError} from '@oclif/core/errors'
import debug from 'debug'

import {BumpApi} from '../api/index.js'
import {DiffRequest, DiffResponse, VersionRequest, VersionResponse, WithDiff} from '../api/models.js'
import {API} from '../definition.js'

export class Diff {
  // 120 seconds = 2 minutes
  static readonly TIMEOUT = 120

  private _bump!: BumpApi

  public constructor(bumpClient: BumpApi) {
    this._bump = bumpClient
  }

  get pollingPeriod(): number {
    return process.env.BUMP_POLLING_PERIOD ? Number(process.env.BUMP_POLLING_PERIOD) : 1000
  }

  async createDiff(file1: string, file2: string, expires: string | undefined): Promise<DiffResponse | undefined> {
    const api = await API.load(file1)
    const [previous_definition, previous_references] = api.extractDefinition()
    const api2 = await API.load(file2)
    const [definition, references] = api2.extractDefinition()
    const request: DiffRequest = {
      definition,
      expires_at: expires,
      previous_definition,
      previous_references,
      references,
    }

    const response = await this._bump.postDiff(request)

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
  ): Promise<VersionResponse | undefined> {
    const api = await API.load(file)
    const [definition, references] = api.extractDefinition()
    const request: VersionRequest = {
      branch_name,
      definition,
      documentation,
      hub,
      previous_version_id,
      references,
      unpublished: true,
    }

    const response = await this._bump.postVersion(request, token)

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

  extractDiff(versionWithDiff: VersionResponse & WithDiff): DiffResponse {
    // TODO: return a real diff_id in the GET /version API
    return {
      breaking: versionWithDiff.diff_breaking,
      details: versionWithDiff.diff_details,
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
    expires: string | undefined,
  ): Promise<DiffResponse | undefined> {
    let diffVersion: DiffResponse | VersionResponse | undefined

    if (file2 && (!documentation || !token)) {
      diffVersion = await this.createDiff(file1, file2, expires)
    } else {
      if (!documentation || !token) {
        throw new Error('Please login to bump (with documentation & token) when using a single file argument')
      }

      diffVersion = await this.createVersion(file1, documentation, token, hub, branch)

      if (file2) {
        diffVersion = await this.createVersion(file2, documentation, token, hub, branch, diffVersion && diffVersion.id)
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
    result: DiffResponse | VersionResponse,
    token: string | undefined,
    opts: {format: string; timeout: number},
  ): Promise<DiffResponse> {
    const pollingResponse = await (this.isVersion(result) && token
      ? this._bump.getVersion(result.id, token)
      : this._bump.getDiff(result.id, opts.format))

    if (opts.timeout <= 0) {
      throw new CLIError(
        'We were unable to compute your documentation diff. Sorry about that. Please try again later. If the error persists, please contact support at https://bump.sh.',
      )
    }

    switch (pollingResponse.status) {
      case 200: {
        let diff: DiffResponse | (VersionResponse & WithDiff) = pollingResponse.data

        if (this.isVersionWithDiff(diff)) {
          diff = this.extractDiff(diff)
        }

        this.d('Received diff:')
        this.d(diff)
        return diff
        break
      }

      case 202: {
        this.d('Waiting 1 sec before next poll')
        await this.pollingDelay()
        return this.waitResult(result, token, {
          format: opts.format,
          timeout: opts.timeout - 1,
        })
        break
      }
    }

    return {} as DiffResponse
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }
}

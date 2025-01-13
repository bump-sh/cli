import debug from 'debug'

import {BumpApi} from '../api/index.js'
import {VersionRequest, VersionResponse} from '../api/models.js'
import {API} from '../definition.js'

export class Deploy {
  private _bump!: BumpApi

  public constructor(bumpClient: BumpApi) {
    this._bump = bumpClient
  }

  protected async createVersion(request: VersionRequest, token: string): Promise<VersionResponse | undefined> {
    const response = await this._bump.postVersion(request, token)
    let version: VersionResponse | undefined

    switch (response.status) {
      case 204: {
        break
      }

      case 201: {
        version = response.data ?? {doc_public_url: 'https://bump.sh', id: ''}
        break
      }

      default: {
        this.d(`API status response was ${response.status}. Expected 201 or 204.`)
        throw new Error('Unexpected server response. Please contact support at https://bump.sh if this error persists')
      }
    }

    return version
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:deploy`)(formatter, ...args)
  }

  public async run(
    api: API,
    dryRun: boolean,
    documentation: string,
    token: string,
    hub: string | undefined,
    autoCreate: boolean,
    documentationName: string | undefined,
    branch: string | undefined,
    overlay?: string[] | undefined,
  ): Promise<VersionResponse | undefined> {
    let version: VersionResponse | undefined
    if (overlay) {
      /* eslint-disable no-await-in-loop */
      // Alternatively we can apply all overlays in parallel
      // https://stackoverflow.com/questions/48957022/unexpected-await-inside-a-loop-no-await-in-loop
      for (const overlayFile of overlay) {
        await api.applyOverlay(overlayFile)
      }
      /* eslint-enable no-await-in-loop */
    }

    const [definition, references] = api.extractDefinition()

    const request: VersionRequest = {
      auto_create_documentation: autoCreate && !dryRun,
      branch_name: branch,
      definition,
      documentation,
      documentation_name: documentationName,
      hub,
      references,
    }
    if (dryRun) {
      await this.validateVersion(request, token)
    } else {
      version = await this.createVersion(request, token)
    }

    return version
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  async validateVersion(version: VersionRequest, token: string): Promise<undefined> {
    const response = await this._bump.postValidation(version, token)

    switch (response.status) {
      case 200: {
        break
      }

      default: {
        this.d(`API status response was ${response.status}. Expected 200.`)
        throw new Error('Unexpected server response. Please contact support at https://bump.sh if this error persists')
      }
    }
  }
}

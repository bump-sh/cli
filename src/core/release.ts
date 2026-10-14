import {AxiosResponse} from 'axios'
import debug from 'debug'

import {BumpApi} from '../api/index.js'
import {VersionResponse} from '../api/models.js'

export class Release {
  private _bump: BumpApi

  public constructor(bumpClient: BumpApi) {
    this._bump = bumpClient
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:release`)(formatter, ...args)
  }

  public async release(versionId: string, token: string): Promise<VersionResponse | undefined> {
    return this.handleResponse(await this._bump.postVersionRelease(versionId, token))
  }

  public async unrelease(versionId: string, token: string): Promise<VersionResponse | undefined> {
    return this.handleResponse(await this._bump.postVersionUnrelease(versionId, token))
  }

  private handleResponse(response: AxiosResponse<VersionResponse>): VersionResponse | undefined {
    switch (response.status) {
      case 204: {
        return
      }

      case 202: {
        return response.data
      }

      default: {
        this.d(`API status response was ${response.status}. Expected 202 or 204.`)
        throw new Error('Unexpected server response. Please contact support at https://bump.sh if this error persists')
      }
    }
  }
}

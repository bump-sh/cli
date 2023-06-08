import * as Config from '@oclif/config';
import debug from 'debug';

import { API } from '../definition';
import { BumpApi } from '../api';
import { VersionRequest, VersionResponse } from '../api/models';

export class Deploy {
  _bump!: BumpApi;
  _config: Config.IConfig;

  public constructor(config: Config.IConfig) {
    this._config = config;
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
  ): Promise<VersionResponse | undefined> {
    let version: VersionResponse | undefined = undefined;
    const [definition, references] = api.extractDefinition();

    const request: VersionRequest = {
      documentation,
      hub,
      documentation_name: documentationName,
      auto_create_documentation: autoCreate && !dryRun,
      definition,
      references,
      branch_name: branch,
    };

    if (dryRun) {
      await this.validateVersion(request, token);
    } else {
      version = await this.createVersion(request, token);
    }

    return version;
  }

  get bumpClient(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this._config);
    return this._bump;
  }

  async createVersion(
    request: VersionRequest,
    token: string,
  ): Promise<VersionResponse | undefined> {
    const response = await this.bumpClient.postVersion(request, token);
    let version: VersionResponse | undefined = undefined;

    switch (response.status) {
      case 204:
        break;
      case 201:
        version = response.data
          ? response.data
          : { id: '', doc_public_url: 'https://bump.sh' };
        break;
      default:
        this.d(`API status response was ${response.status}. Expected 201 or 204.`);
        throw new Error(
          'Unexpected server response. Please contact support at https://bump.sh if this error persists',
        );
    }

    return version;
  }

  async validateVersion(version: VersionRequest, token: string): Promise<undefined> {
    const response = await this.bumpClient.postValidation(version, token);

    switch (response.status) {
      case 200:
        break;
      default:
        this.d(`API status response was ${response.status}. Expected 200.`);
        throw new Error(
          'Unexpected server response. Please contact support at https://bump.sh if this error persists',
        );
    }

    return;
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:deploy`)(formatter, ...args);
  }
}

import { CLIError } from '@oclif/errors';
import * as Config from '@oclif/config';
import debug from 'debug';

import { API } from '../definition';
import { BumpApi } from '../api';
import { VersionRequest, VersionResponse, WithDiff } from '../api/models';

export class Diff {
  _bump!: BumpApi;
  _config: Config.IConfig;

  public constructor(config: Config.IConfig) {
    this._config = config;
  }

  public async run(
    file1: string,
    file2: string | undefined,
    documentation: string,
    hub: string | undefined,
    token: string,
  ): Promise<WithDiff | undefined> {
    const version: VersionResponse | undefined = await this.createVersion(
      file1,
      documentation,
      token,
      hub,
    );
    let diffVersion: VersionResponse | undefined = undefined;

    if (file2) {
      diffVersion = await this.createVersion(
        file2,
        documentation,
        token,
        hub,
        version && version.id,
      );
    } else {
      diffVersion = version;
    }

    if (diffVersion) {
      return await this.waitResult(diffVersion, token, {
        timeout: 30,
      });
    } else {
      return undefined;
    }
  }

  get bumpClient(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this._config);
    return this._bump;
  }

  get pollingPeriod(): number {
    return 1000;
  }

  async createVersion(
    file: string,
    documentation: string,
    token: string,
    hub: string | undefined,
    previous_version_id: string | undefined = undefined,
  ): Promise<VersionResponse | undefined> {
    const api = await API.load(file);
    const [definition, references] = api.extractDefinition();
    const request: VersionRequest = {
      documentation,
      hub,
      definition,
      references,
      unpublished: true,
      previous_version_id,
    };

    const response = await this.bumpClient.postVersion(request, token);

    switch (response.status) {
      case 201:
        this.d(`Unpublished version created with ID ${response.data.id}`);
        return response.data;
        break;
      case 204:
        break;
    }

    return;
  }

  async waitResult(
    result: VersionResponse,
    token: string,
    opts: { timeout: number },
  ): Promise<WithDiff> {
    const diffResponse = await this.bumpClient.getVersion(result.id, token);

    if (opts.timeout <= 0) {
      throw new CLIError(
        'We were unable to compute your documentation diff. Sorry about that. Please try again later',
      );
    }

    switch (diffResponse.status) {
      case 200:
        const diff: WithDiff = diffResponse.data;

        this.d('Received diff:');
        this.d(diff);
        return diff;
        break;
      case 202:
        this.d('Waiting 1 sec before next poll');
        await this.pollingDelay();
        return await this.waitResult(result, token, {
          timeout: opts.timeout - 1,
        });
        break;
    }

    return {} as WithDiff;
  }

  async pollingDelay(): Promise<void> {
    return await this.delay(this.pollingPeriod);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:diff`)(formatter, ...args);
  }
}

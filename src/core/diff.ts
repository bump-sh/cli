import { CLIError } from '@oclif/errors';
import * as Config from '@oclif/config';
import debug from 'debug';

import { API } from '../definition';
import { BumpApi } from '../api';
import {
  VersionRequest,
  VersionResponse,
  WithDiff,
  DiffRequest,
  DiffResponse,
} from '../api/models';

export class Diff {
  _bump!: BumpApi;
  _config: Config.IConfig;

  public constructor(config: Config.IConfig) {
    this._config = config;
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
    let diffVersion: VersionResponse | DiffResponse | undefined = undefined;

    if (file2 && (!documentation || !token)) {
      diffVersion = await this.createDiff(file1, file2, expires);
    } else {
      if (!documentation || !token) {
        throw new Error(
          'Please login to bump (with documentation & token) when using a single file argument',
        );
      }

      diffVersion = await this.createVersion(file1, documentation, token, hub, branch);

      if (file2) {
        diffVersion = await this.createVersion(
          file2,
          documentation,
          token,
          hub,
          branch,
          diffVersion && diffVersion.id,
        );
      }
    }

    if (diffVersion) {
      return await this.waitResult(diffVersion, token, {
        timeout: 30,
        format,
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

  async createDiff(
    file1: string,
    file2: string,
    expires: string | undefined,
  ): Promise<DiffResponse | undefined> {
    const api = await API.load(file1);
    const [previous_definition, previous_references] = api.extractDefinition();
    const api2 = await API.load(file2);
    const [definition, references] = api2.extractDefinition();
    const request: DiffRequest = {
      previous_definition,
      previous_references,
      definition,
      references,
      expires_at: expires,
    };

    const response = await this.bumpClient.postDiff(request);

    switch (response.status) {
      case 201:
        this.d(`Diff created with ID ${response.data.id}`);
        this.d(response.data);
        return response.data;
        break;
      case 204:
        break;
    }

    return;
  }

  async createVersion(
    file: string,
    documentation: string,
    token: string,
    hub: string | undefined,
    branch_name: string | undefined,
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
      branch_name,
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
    result: VersionResponse | DiffResponse,
    token: string | undefined,
    opts: { timeout: number; format: string },
  ): Promise<DiffResponse> {
    let pollingResponse = undefined;

    if (this.isVersion(result) && token) {
      pollingResponse = await this.bumpClient.getVersion(result.id, token);
    } else {
      pollingResponse = await this.bumpClient.getDiff(result.id, opts.format);
    }

    if (opts.timeout <= 0) {
      throw new CLIError(
        'We were unable to compute your documentation diff. Sorry about that. Please try again later',
      );
    }

    switch (pollingResponse.status) {
      case 200:
        let diff: (VersionResponse & WithDiff) | DiffResponse = pollingResponse.data;

        if (this.isVersionWithDiff(diff)) {
          diff = this.extractDiff(diff);
        }

        this.d('Received diff:');
        this.d(diff);
        return diff;
        break;
      case 202:
        this.d('Waiting 1 sec before next poll');
        await this.pollingDelay();
        return await this.waitResult(result, token, {
          timeout: opts.timeout - 1,
          format: opts.format,
        });
        break;
    }

    return {} as DiffResponse;
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

  isVersion(result: VersionResponse | DiffResponse): result is VersionResponse {
    return (result as VersionResponse).doc_public_url !== undefined;
  }

  isVersionWithDiff(
    result: (VersionResponse & WithDiff) | DiffResponse,
  ): result is VersionResponse & WithDiff {
    return (result as VersionResponse & WithDiff).diff_summary !== undefined;
  }

  extractDiff(versionWithDiff: VersionResponse & WithDiff): DiffResponse {
    // TODO: return a real diff_id in the GET /version API
    return {
      id: versionWithDiff.id,
      public_url: versionWithDiff.diff_public_url,
      text: versionWithDiff.diff_summary,
      markdown: versionWithDiff.diff_markdown,
      details: versionWithDiff.diff_details,
      breaking: versionWithDiff.diff_breaking,
    };
  }
}

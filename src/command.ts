import { Command as Base } from '@oclif/command';
import debug from 'debug';

import { API } from './definition';
import { BumpApi, APIError } from './api';
import { Reference } from './api/models';
import pjson from '../package.json';

export default abstract class Command extends Base {
  private base = `${pjson.name}@${pjson.version}`;
  _bump!: BumpApi;

  get pollingPeriod(): number {
    return 1000;
  }

  get bump(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this.config);
    return this._bump;
  }

  async catch(error?: Error): Promise<void> {
    if (error && APIError.is(error)) {
      this.error(error.message, { exit: error.exitCode });
    }

    throw error;
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:command:${this.constructor.name.toLowerCase()}`)(
      formatter,
      ...args,
    );
  }

  async pollingDelay(): Promise<void> {
    return await this.delay(this.pollingPeriod);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async prepareDefinition(filepath: string): Promise<[string, Reference[]]> {
    const api = await API.loadAPI(filepath);
    const references = [];

    this.d(`${filepath} looks like an ${api.specName} spec version ${api.version}`);

    for (let i = 0; i < api.references.length; i++) {
      const reference = api.references[i];
      references.push({
        location: reference.location,
        content: reference.content,
      });
    }

    return [api.rawDefinition, references];
  }
}

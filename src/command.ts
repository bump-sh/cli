import { Command as Base } from '@oclif/core';
import debug from 'debug';

import { BumpApi, APIError } from './api';
import pjson from '../package.json';

export default abstract class Command extends Base {
  private base = `${pjson.name}@${pjson.version}`;
  _bump!: BumpApi;

  get bump(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this.config);
    return this._bump;
  }

  async catch(error: Record<string, any>): Promise<void> {
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
}

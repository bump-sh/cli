import {Command} from '@oclif/core'
import debug from 'debug'

import {BumpApi} from './api/index.js'

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected _bump!: BumpApi

  protected get bump(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this.config)
    return this._bump
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  protected d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:command:${this.constructor.name.toLowerCase()}`)(formatter, ...args)
  }
}

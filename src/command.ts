import { Command as Base } from '@oclif/command';

import { BumpApi } from './api';
import pjson from '../package.json';

export default abstract class Command extends Base {
  private base = `${pjson.name}@${pjson.version}`;
  _bump!: BumpApi;

  get bump(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this.config, this.version);
    return this._bump;
  }

  get version(): string {
    return this.base;
  }
}

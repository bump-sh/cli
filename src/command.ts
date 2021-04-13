import { Command as Base } from '@oclif/command';

import { BumpApi } from './api';
import pjson from '../package.json';

export default abstract class Command extends Base {
  base = `${pjson.name}@${pjson.version}`;
  _bump!: BumpApi;

  get bump(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this.config);
    return this._bump;
  }
}

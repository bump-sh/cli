import { Command as Base } from '@oclif/command';
import debug from 'debug';

import { API } from './definition';
import { BumpApi, APIError } from './api';
import { Reference } from './api/models';
import pjson from '../package.json';

export default abstract class Command extends Base {
  private base = `${pjson.name}@${pjson.version}`;
  _bump!: BumpApi;

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

  d(message: string): void {
    return debug(`bump-cli:command:${this.constructor.name.toLowerCase()}`)(message);
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

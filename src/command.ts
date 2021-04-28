import { Command as Base } from '@oclif/command';
import { CLIError } from '@oclif/errors';

import { API } from './definition';
import { BumpApi, APIError } from './api';
import { Reference } from './api/models';
import { cli } from './cli';
import pjson from '../package.json';

export default abstract class Command extends Base {
  private base = `${pjson.name}@${pjson.version}`;
  _bump!: BumpApi;

  get bump(): BumpApi {
    if (!this._bump) this._bump = new BumpApi(this.config);
    return this._bump;
  }

  async catch(error: Error): Promise<void> {
    if (error && error instanceof CLIError && 'http' in error) {
      const httpError: APIError = error;

      this.error(httpError.message, { exit: httpError.exitCode });
    }

    throw error;
  }

  async prepareDefinition(filepath: string): Promise<[API, Reference[]]> {
    const api = await API.loadAPI(filepath);
    const references = [];

    cli.debug(`* ${filepath} looks like an ${api.specName} spec version ${api.version}`);

    for (let i = 0; i < api.references.length; i++) {
      const reference = api.references[i];
      references.push({
        location: reference.location,
        content: JSON.stringify(reference.content),
      });
    }

    return [api, references];
  }
}

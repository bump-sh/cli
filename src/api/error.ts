import { CLIError } from '@oclif/errors';
import chalk from 'chalk';
import { AxiosError } from 'axios';

import { InvalidDefinitionError } from './models';

type MessagesAndExitCode = [string[], number];

export default class APIError extends CLIError {
  http: AxiosError;
  exitCode: number;
  status?: number;

  constructor(httpError: AxiosError, info: string[] = [], exit = 100) {
    const status = httpError?.response?.status;

    switch (httpError?.response?.status) {
      case 422:
        [info, exit] = APIError.invalidDefinition(httpError.response.data);
        break;
    }

    if (info.length) {
      super(info.join('\n'));
    } else {
      super(`Unhandled API error (status: ${status})`);
    }

    this.exitCode = exit;
    this.http = httpError;
  }

  static invalidDefinition(error: InvalidDefinitionError): MessagesAndExitCode {
    const info = [];
    const genericMessage = 'Invalid definition file';
    const exit = 122;

    if (error && 'errors' in error) {
      for (const [attr, message] of Object.entries(error.errors)) {
        if (message) {
          info.push(`${chalk.underline(attr)} ${message}`);
        }
      }
      if ('message' in error) {
        info.push(error.message || genericMessage);
      }
    } else {
      info.push(genericMessage);
    }

    return [info, exit];
  }
}

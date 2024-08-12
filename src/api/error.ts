import { CLIError } from '@oclif/errors';
import chalk from 'chalk';
import { AxiosError } from 'axios';
import d from 'debug';
import { InvalidDefinitionError } from './models.js';

type MessagesAndExitCode = [string[], number];
const debug = d('bump-cli:api-client');

export default class APIError extends CLIError {
  http: AxiosError;
  exitCode: number;
  status?: number;

  constructor(httpError: AxiosError, info: string[] = [], exit = 100) {
    let messageAndExitCode: MessagesAndExitCode | undefined;

    switch (httpError?.response?.status) {
      case 422:
        messageAndExitCode = APIError.invalidDefinition(httpError.response.data as InvalidDefinitionError);
        break;
      case 401:
        messageAndExitCode = APIError.unauthenticated();
        break;
      case 402:
        messageAndExitCode = APIError.genericError(httpError.response.data as Error, 'You need to upgrade to a paid plan to perform this request.', 102);
        break;
    }

    if (messageAndExitCode) {
      [info, exit] = messageAndExitCode;
    }

    if (info.length) {
      super(info.join('\n'));
    } else {
      super(`Unhandled API error (status: ${status}) (error: ${httpError})`);
    }

    this.exitCode = exit;
    this.http = httpError;
  }

  static is(error: Record<string, any>): error is APIError {
    return error instanceof CLIError && 'http' in error;
  }

  static notFound(error: Error): MessagesAndExitCode {
    const genericMessage = error.message || "It seems the documentation provided doesn't exist.";
    return [
      [
        genericMessage,
        `In a hub context you might want to try the ${chalk.dim('--auto-create')} flag.\nOtherwise, please check the given ${chalk.dim('--doc')}, ${chalk.dim('--token')} or ${chalk.dim('--hub')} flags`,
      ],
      104,
    ];
  }

  static genericError(error: Error, defaultMessage: string, exitCode: number): MessagesAndExitCode {
    const message = error.message || defaultMessage;
    return [[message], exitCode];
  }

  static invalidDefinition(error: InvalidDefinitionError): MessagesAndExitCode {
    let info: string[] = [];
    const genericMessage = error.message || 'Invalid definition file';
    const exit = 122;

    if (error && 'errors' in error) {
      for (const [attr, message] of Object.entries(error.errors)) {
        info = info.concat(APIError.humanAttributeError(attr, message));
      }
    }

    return [info.length ? info : [genericMessage], exit];
  }
}

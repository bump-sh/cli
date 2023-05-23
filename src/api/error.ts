import { CLIError } from '@oclif/errors';
import chalk from 'chalk';
import { AxiosError } from 'axios';
import d from 'debug';

import { InvalidDefinitionError } from './models';

type MessagesAndExitCode = [string[], number];
const debug = d('bump-cli:api-client');

export default class APIError extends CLIError {
  http: AxiosError;
  exitCode: number;
  status?: number;

  constructor(httpError: AxiosError, info: string[] = [], exit = 100) {
    const status = httpError?.response?.status;
    debug(httpError);

    switch (httpError?.response?.status) {
      case 422:
        [info, exit] = APIError.invalidDefinition(
          httpError.response.data as InvalidDefinitionError,
        );
        break;
      case 401:
        [info, exit] = APIError.unauthenticated();
        break;
      case 402:
        [info, exit] = APIError.paymentRequired(httpError.response.data as Error);
        break;
      case 404:
      case 400:
        [info, exit] = APIError.notFound(httpError.response.data as Error);
        break;
    }

    if (info.length) {
      super(info.join('\n'));
    } else {
      super(`Unhandled API error (status: ${status}) (error: ${httpError})`);
    }

    this.exitCode = exit;
    this.http = httpError;
  }

  static is(error: Error): error is APIError {
    return error instanceof CLIError && 'http' in error;
  }

  static notFound(error: Error): MessagesAndExitCode {
    const genericMessage =
      error.message || "It seems the documentation provided doesn't exist.";

    return [
      [
        genericMessage,
        `In a hub context you might want to try the ${chalk.dim(
          '--auto-create',
        )} flag.\nOtherwise, please check the given ${chalk.dim('--doc')}, ${chalk.dim(
          '--token',
        )} or ${chalk.dim('--hub')} flags`,
      ],
      104,
    ];
  }

  static paymentRequired(error: Error): MessagesAndExitCode {
    const genericMessage =
      error.message || 'You need to upgrade to a paid plan to perform this request.';

    return [[genericMessage], 102];
  }

  static invalidDefinition(error: InvalidDefinitionError): MessagesAndExitCode {
    let info: string[] = [];
    const genericMessage = error.message || 'Invalid definition file';
    const exit = 122;

    if (error && 'errors' in error) {
      for (const [attr, message] of Object.entries(error.errors)) {
        info = info.concat(APIError.humanAttributeError(attr, message));
      }
    } else {
      info.push(genericMessage);
    }

    return [info, exit];
  }

  static humanAttributeError(attribute: string, messages: unknown): string[] {
    let info: string[] = [];

    if (messages instanceof Array) {
      const allMessages = (messages as unknown[])
        .map((message, idx) => {
          if (message instanceof Object) {
            return this.humanAttributeError(idx.toString(), message);
          } else {
            return message;
          }
        })
        .join(', ');
      info.push(`${chalk.underline(attribute)} ${allMessages}`);
    } else if (messages instanceof Object) {
      for (const [child, child_messages] of Object.entries(messages)) {
        info = info.concat(
          this.humanAttributeError(`${attribute}.${child}`, child_messages),
        );
      }
    } else if (messages) {
      info.push(`${chalk.underline(attribute)} ${messages}`);
    }

    return info;
  }

  static unauthenticated(): MessagesAndExitCode {
    return [
      [
        'You are not allowed to deploy to this documentation.',
        'please check your --token flag or BUMP_TOKEN variable',
      ],
      101,
    ];
  }
}

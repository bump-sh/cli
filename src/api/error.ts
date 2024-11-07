import {CLIError} from '@oclif/core/errors'
import {AxiosError} from 'axios'
import chalk from 'chalk'
import d from 'debug'

import {InvalidDefinitionError} from './models.js'

type MessagesAndExitCode = [string[], number]
const debug = d('bump-cli:api-client')

export default class APIError extends CLIError {
  constructor(httpError?: AxiosError | undefined, info: string[] = [], exit = 100) {
    const status = httpError?.response?.status
    debug(httpError)

    if (httpError) {
      switch (status) {
        case 422: {
          ;[info, exit] = APIError.invalidDefinition(httpError.response?.data as InvalidDefinitionError)
          break
        }

        case 401: {
          ;[info, exit] = APIError.unauthenticated()
          break
        }

        case 404:
        case 400: {
          ;[info, exit] = APIError.notFound(httpError.response?.data as Error)
          break
        }
      }

      if (info.length > 0) {
        super(info.join('\n'), {exit})
      } else {
        super(`Unhandled API error (status: ${status}) (error: ${httpError})`, {exit})
      }
    } else {
      super('Unhandled API error', {exit})
    }
  }

  static humanAttributeError(attribute: string, messages: unknown): string[] {
    let info: string[] = []

    if (Array.isArray(messages)) {
      const allMessages = (messages as unknown[])
        .map((message, idx) => {
          if (message instanceof Object) {
            return this.humanAttributeError(idx.toString(), message)
          }

          return message
        })
        .join(', ')
      info.push(`${chalk.underline(attribute)} ${allMessages}`)
    } else if (messages instanceof Object) {
      for (const [child, childMessages] of Object.entries(messages)) {
        const childErrors = this.humanAttributeError(`${attribute}.${child}`, childMessages)
        info = [...info, ...childErrors]
      }
    } else if (messages) {
      info.push(`${chalk.underline(attribute)} ${messages}`)
    }

    return info
  }

  static invalidDefinition(error: InvalidDefinitionError): MessagesAndExitCode {
    let info: string[] = []
    const genericMessage = error.message || 'Invalid definition file'
    const exit = 122

    if (error && 'errors' in error) {
      for (const [attr, message] of Object.entries(error.errors)) {
        const humanErrors = APIError.humanAttributeError(attr, message)
        info = [...info, ...humanErrors]
      }
    } else {
      info.push(genericMessage)
    }

    return [info, exit]
  }

  static is(error: Error): error is APIError {
    return error instanceof CLIError && 'http' in error
  }

  static notFound(error: Error): MessagesAndExitCode {
    const genericMessage = error.message || "It seems the documentation provided doesn't exist."

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
    ]
  }

  static unauthenticated(): MessagesAndExitCode {
    return [
      ['You are not allowed to deploy to this documentation.', 'please check your --token flag or BUMP_TOKEN variable'],
      101,
    ]
  }
}

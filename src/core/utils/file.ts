import {CLIError} from '@oclif/core/errors'
import {readdirSync, statSync} from 'node:fs'
import {basename, extname} from 'node:path'

type FileDescription = {filename: string; label: string; value: string}

export const isDir = (path_or_url: string): boolean => {
  if (isHttpUrl(path_or_url)) {
    return false
  }

  try {
    return statSync(path_or_url).isDirectory()
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(error)
    }
    return false
  }
}

const isHttpUrl = (path: string): boolean => {
  try {
    const url = new URL(path)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export class File {
  protected static readonly supportedFormats = ['.yml', '.yaml', '.json']

  public static listInvalidConventionFiles(path: string, regex: RegExp): FileDescription[] {
    return File.listValidFormatFiles(path).filter(({filename}) => {
      return !regex.test(filename)
    })
  }

  public static listValidConventionFiles(path: string, regex: RegExp): FileDescription[] {
    return File.listValidFormatFiles(path).filter(({filename}) => {
      return regex.test(filename)
    })
  }

  private static listValidFormatFiles(path: string): FileDescription[] {
    return readdirSync(path)
      .filter((file) => {
        return File.supportedFormats.includes(extname(file))
      })
      .map((file) => {
        return {
          filename: basename(file, extname(file)),
          label: basename(file),
          value: file,
        }
      })
  }
}

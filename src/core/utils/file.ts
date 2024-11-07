import {readdirSync, statSync} from 'node:fs'
import {basename, extname} from 'node:path'

type FileDescription = {filename: string; label: string; value: string}

export const isDir = (path: string): boolean => {
  try {
    return statSync(path).isDirectory()
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

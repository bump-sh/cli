import { readdirSync, statSync } from 'fs';
import { extname, basename } from 'path';

type FileDescription = { value: string; label: string; filename: string };

export const isDir = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch (e) {
    return false;
  }
};

export class File {
  protected static readonly supportedFormats = ['.yml', '.yaml', '.json'];

  public static listValidConventionFiles(path: string, regex: RegExp): FileDescription[] {
    return File.listValidFormatFiles(path).filter(({ filename }) => {
      return filename.match(regex);
    });
  }

  public static listInvalidConventionFiles(
    path: string,
    regex: RegExp,
  ): FileDescription[] {
    return File.listValidFormatFiles(path).filter(({ filename }) => {
      return !filename.match(regex);
    });
  }

  private static listValidFormatFiles(path: string): FileDescription[] {
    return readdirSync(path)
      .filter((file) => {
        return File.supportedFormats.includes(extname(file));
      })
      .map((file) => {
        return {
          value: file,
          label: basename(file),
          filename: basename(file, extname(file)),
        };
      });
  }
}

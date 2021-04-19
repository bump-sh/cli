import chalk from 'chalk';

import Command from '../command';
import * as flags from '../flags';
import { fileArg } from '../args';
import { cli } from '../cli';
import { API } from '../definition';
import { PreviewResponse, PreviewRequest, Preview422Error } from '../api/models';

export default class Preview extends Command {
  static description = 'Create a documentation preview for the given file';

  static examples = [
    `$ bump preview FILE
preview of file FILE from ./src/preview.ts!
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  static args = [fileArg];

  async run(): Promise<void> {
    const { args } = this.parse(Preview);

    const api = await API.loadAPI(args.FILE);
    const references = [];

    cli.debug(`* ${args.FILE} looks like an ${api.specName} spec version ${api.version}`);

    for (let i = 0; i < api.references.length; i++) {
      const reference = api.references[i];
      references.push({
        location: reference.location,
        content: JSON.stringify(reference.content),
      });
    }

    cli.action.start("* Let's render a preview on Bump");
    const request: PreviewRequest = {
      definition: JSON.stringify(api.definition),
      references,
    };

    try {
      const response: PreviewResponse = await this.bump.postPreview(request);

      cli.action.stop();

      const publicUrl = response.public_url;
      cli.styledSuccess(
        `Your preview is visible at: ${publicUrl} (Expires at ${response.expires_at})`,
      );
    } catch (error) {
      if (error?.http?.response?.status === 422) {
        const serverError: Preview422Error = error.http.response.data;

        this.invalidDefinitionResponse(serverError);
      }

      throw error;
    }

    return;
  }

  invalidDefinitionResponse(error: Preview422Error): void {
    const errorMessages = [];

    if (error && 'errors' in error) {
      for (const [attr, message] of Object.entries(error.errors)) {
        if (message) {
          errorMessages.push(`${chalk.underline(attr)} ${message}`);
        }
      }
      if ('message' in error) {
        errorMessages.push(error.message);
      }
    } else {
      errorMessages.push('Invalid definition file');
    }

    this.error(errorMessages.join('\n'), { exit: 100 });
  }
}

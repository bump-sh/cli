import Command from '../command';
import * as flags from '../flags';
import { fileArg } from '../args';
import { cli } from '../cli';
import { PreviewResponse, PreviewRequest } from '../api/models';

export default class Preview extends Command {
  static description = 'Create a documentation preview for the given file or URL';

  static examples = [
    `$ bump preview FILE
* Your preview is visible at: https://bump.sh/preview/45807371-9a32-48a7-b6e4-1cb7088b5b9b
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  static args = [fileArg];

  async run(): Promise<void> {
    const { args } = this.parse(Preview);
    const [api, references] = await this.prepareDefinition(args.FILE);

    cli.action.start("* Let's render a preview on Bump");

    const request: PreviewRequest = {
      definition: JSON.stringify(api.definition),
      references,
    };
    const response: { data: PreviewResponse } = await this.bump.postPreview(request);

    cli.action.stop();

    cli.styledSuccess(
      `Your preview is visible at: ${response.data.public_url} (Expires at ${response.data.expires_at})`,
    );

    return;
  }
}

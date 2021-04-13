// Dependencies
import cli from 'cli-ux';

// Local
import Command from '../command';
import * as flags from '../flags';
import { fileArg } from '../args';

export default class Preview extends Command {
  static description = 'Create a documentation preview for the given file';

  static examples = [
    `$ bump preview FILE
preview of file FILE from ./src/preview.ts!
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    specification: flags.specification(),
    strict: flags.strict(),
    'no-external-references': flags.noExternalReferences(),
  };

  static args = [fileArg];

  async run(): Promise<void> {
    const { args } = this.parse(Preview);

    this.warn(`Parsed input argument “${args.FILE}” but nothing to do with it yet`);

    cli.action.start('Trying to create a preview on Bump');
    // const response: Ping = await this.bump.postPreview({
    //   definition: '{}',
    // });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    cli.action.stop();

    return;
  }
}

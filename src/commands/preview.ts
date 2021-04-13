// Dependencies
import { Command, flags } from '@oclif/command';
import cli from 'cli-ux';
// Local
import { getPing, Ping } from '../api';
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
  };

  static args = [fileArg];

  async run(): Promise<void> {
    const { args } = this.parse(Preview);

    this.warn(`Parsed input argument “${args.FILE}” but nothing to do with it yet`);

    cli.action.start('Trying to ping Bump');
    const response: Ping = await getPing();
    cli.action.stop();

    this.log(response.pong);
  }
}

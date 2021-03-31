import { Command, flags } from '@oclif/command';

export default class Deploy extends Command {
  static description =
    'Deploy a given file specification against its schema definition (OpenAPI or AsyncAPI)';

  static examples = [
    `$ bump deploy FILE
deploy of file FILE from ./src/deploy.ts!
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    doc: flags.string({
      char: 'd',
      description: 'Documentation id or slug, default: ""',
    }),
    'doc-name': flags.string({
      char: 'n',
      description: 'Documentation name',
    }),
    token: flags.string({
      char: 't',
      description: 'Documentation or Hub token, default: ""',
    }),
  };

  static args = [{ name: 'FILE', required: true }];

  async run(): Promise<void> {
    const { args } = this.parse(Deploy);

    this.log(`Deploy ${args.FILE} from ./src/commands/deploy.ts`);
  }
}

import { Command, flags } from '@oclif/command';

import { loadSpec } from '../fs';

export default class Validate extends Command {
  static description =
    'Validate a given file specification against its schema definition (OpenAPI or AsyncAPI)';

  static examples = [
    `$ bump validate FILE
Coast is clear!
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    doc: flags.string({
      char: 'd',
      description: 'Documentation public id or slug, default: ""',
    }),
    'doc-name': flags.string({
      char: 'n',
      description: 'Documentation name. Used with --auto-create flag.',
      dependsOn: ['auto-create'],
    }),
    hub: flags.string({
      char: 'b',
      description: 'Hub id or slug',
    }),
    token: flags.string({
      char: 't',
      description: 'Documentation or Hub token, default: ""',
    }),
    specification: flags.string({
      char: 's',
      description: 'Specification of the definition',
    }),
    strict: flags.boolean({
      description: 'Strict validation mode, default: "false"',
    }),
    'auto-create': flags.boolean({
      description:
        'Automatically create the documentation if needed (only available with a --hub and when specifying a name for documentation --doc-name), default: false',
      dependsOn: ['hub', 'doc-name'],
    }),
    'no-external-references': flags.boolean({
      description: 'Do not import external references ($ref), default: false',
    }),
  };

  static args = [
    {
      name: 'FILE',
      required: true,
      description:
        'Path or URL to your API documentation. OpenAPI (2.0 to 3.0.2) and AsyncAPI (2.0) specifications are currently supported.',
    },
  ];

  async run(): Promise<void> {
    const { args } = this.parse(Validate);

    this.log(`Validating ${args.FILE}…`);

    fs.loadAPI(args.FILE).then((api) => {
      this.log(`Spec ${api.spec} version ${api.version} parsed`);
    });

    return;
  }
}

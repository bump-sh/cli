import { Command } from '@oclif/command';

import * as flags from '../flags';
import { API } from '../definitions';

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
    doc: flags.doc(),
    'doc-name': flags.docName(),
    hub: flags.hub(),
    token: flags.token(),
    specification: flags.specification(),
    strict: flags.strict(),
    'auto-create': flags.autoCreate(),
    'no-external-references': flags.noExternalReferences(),
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

    API.loadAPI(args.FILE).then((api) => {
      this.log(`Spec ${api.specName} version ${api.version} parsed`);
    });

    return;
  }
}

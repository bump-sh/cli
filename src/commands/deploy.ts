import Command from '../command';
import * as flags from '../flags';
import { fileArg } from '../args';
import { cli } from '../cli';
import { VersionRequest } from '../api/models';

export default class Deploy extends Command {
  static description =
    'Create a new version of your documentation from the given file or URL';

  static examples = [
    `Deploy a new version of an existing documentation

$> bump deploy FILE --doc <your_doc_id_or_slug> --token <your_doc_token>
* Let's deploy a new documentation version on Bump... done
* Your new documentation version will soon be ready
`,
    `Deploy a new version of an existing documentation attached to a hub

$> bump deploy FILE --doc <doc_slug> --hub <your_hub_id_or_slug> --token <your_doc_token>
* Let's deploy a new documentation version on Bump... done
* Your new documentation version will soon be ready
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    doc: flags.doc(),
    'doc-name': flags.docName(),
    hub: flags.hub(),
    token: flags.token(),
    'auto-create': flags.autoCreate(),
  };

  static args = [fileArg];

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  async run(): Promise<void> {
    const { args, flags } = this.parse(Deploy);
    const [api, references] = await this.prepareDefinition(args.FILE);

    cli.action.start("* Let's deploy a new documentation version on Bump");

    const request: VersionRequest = {
      documentation: flags.doc!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
      hub: flags.hub,
      documentation_name: flags['doc-name'],
      auto_create_documentation: flags['auto-create'],
      definition: JSON.stringify(api.definition),
      references,
    };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await this.bump.postVersion(request, flags.token!);

    cli.action.stop();

    if (response.status === 201) {
      cli.styledSuccess('Your new documentation version will soon be ready');
    } else if (response.status === 204) {
      this.warn('Your documentation has not changed!');
    }

    return;
  }
}

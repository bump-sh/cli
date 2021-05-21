import Command from '../command';
import * as flags from '../flags';
import { fileArg } from '../args';
import { cli } from '../cli';
import { VersionRequest, VersionResponse } from '../api/models';

export default class Deploy extends Command {
  static description =
    'create a new version of your documentation from the given file or URL';

  static examples = [
    `Deploy a new version of an existing documentation

$ bump deploy FILE --doc <your_doc_id_or_slug> --token <your_doc_token>
* Let's deploy a new documentation version on Bump... done
* Your new documentation version will soon be ready
`,
    `Deploy a new version of an existing documentation attached to a hub

$ bump deploy FILE --doc <doc_slug> --hub <your_hub_id_or_slug> --token <your_doc_token>
* Let's deploy a new documentation version on Bump... done
* Your new documentation version will soon be ready
`,
    `Validate a new documentation version before deploying it

$ bump deploy FILE --dry-run --doc <doc_slug> --token <your_doc_token>
* Let's validate a new documentation version on Bump... done
* Definition is valid
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    doc: flags.doc(),
    'doc-name': flags.docName(),
    hub: flags.hub(),
    token: flags.token(),
    'auto-create': flags.autoCreate(),
    'dry-run': flags.dryRun(),
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
    const [definition, references] = await this.prepareDefinition(args.FILE);
    const action = flags['dry-run'] ? 'validate' : 'deploy';
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    const [documentation, token] = [flags.doc!, flags.token!];

    cli.action.start(`* Let's ${action} a new documentation version on Bump`);

    const request: VersionRequest = {
      documentation,
      hub: flags.hub,
      documentation_name: flags['doc-name'],
      auto_create_documentation: flags['auto-create'] && !flags['dry-run'],
      definition,
      references,
    };

    const response = flags['dry-run']
      ? await this.bump.postValidation(request, token)
      : await this.bump.postVersion(request, token);

    cli.action.stop();

    switch (response.status) {
      case 200:
        cli.styledSuccess('Definition is valid');
        break;
      case 201:
        const version: VersionResponse = response.data
          ? response.data
          : { doc_public_url: 'https://bump.sh' };

        cli.styledSuccess(
          `Your new documentation version will soon be ready at ${version.doc_public_url}`,
        );
        break;
      case 204:
        this.warn('Your documentation has not changed!');
        break;
    }

    return;
  }
}

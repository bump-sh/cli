import Command from '../command';
import * as flags from '../flags';
import { Deploy as CoreDeploy } from '../core/deploy';
import { fileArg } from '../args';
import { cli } from '../cli';
import { VersionResponse } from '../api/models';

import { statSync } from 'fs';

export default class Deploy extends Command {
  static description =
    'Create a new version of your documentation from the given file or URL.';

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
    branch: flags.branch(),
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

    const [dryRun, documentation, token, hub, autoCreate, documentationName, branch] = [
      flags['dry-run'],
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      flags.doc!,
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      flags.token!,
      flags.hub,
      flags['auto-create'],
      flags['doc-name'],
      flags.branch,
    ];
    const file = await statSync(args.FILE);

    if (file.isDirectory()) {
      throw new Error(
        'Deploy with a directory is not yet implemented. Please wait while we are working on it!',
      );
    } else {
      await this.deploySingleFile(
        args.FILE,
        dryRun,
        documentation,
        token,
        hub,
        autoCreate,
        documentationName,
        branch,
      );
    }

    return;
  }

  private async deploySingleFile(
    file: string,
    dryRun: boolean,
    documentation: string,
    token: string,
    hub: string | undefined,
    autoCreate: boolean,
    documentationName: string | undefined,
    branch: string | undefined,
  ): Promise<void> {
    const action = dryRun ? 'validate' : 'deploy';
    cli.action.start(`* Let's ${action} a new documentation version on Bump`);

    const response: VersionResponse | undefined = await new CoreDeploy(this.config).run(
      file,
      dryRun,
      documentation,
      token,
      hub,
      autoCreate,
      documentationName,
      branch,
    );

    cli.action.stop();

    if (dryRun) {
      cli.styledSuccess('Definition is valid');
    } else {
      if (response) {
        cli.styledSuccess(
          `Your new documentation version will soon be ready at ${response.doc_public_url}`,
        );
      } else {
        this.warn('Your documentation has not changed');
      }
    }

    return;
  }
}

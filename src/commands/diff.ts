import { CLIError } from '@oclif/errors';

import Command from '../command';
import * as flags from '../flags';
import { fileArg } from '../args';
import { cli } from '../cli';
import { VersionRequest, VersionResponse } from '../api/models';

export default class Diff extends Command {
  static description =
    'Get a comparaison diff with your documentation from the given file or URL';

  static examples = [
    `Compare a potential new version with the currently published one:

  $ bump diff FILE --doc <your_doc_id_or_slug> --token <your_doc_token>
  * Let's compare the given definition version... done
  Removed: GET /compare
  Added: GET /versions/{versionId}
`,
    `Store the diff in a dedicated file:

  $ bump diff FILE --doc <doc_slug> --token <doc_token> > /tmp/my-saved-diff
  * Let's compare the given definition version... done

  $ cat /tmp/my-saved-diff
  Removed: GET /compare
  Added: GET /versions/{versionId}
`,
    `In case of a non modified definition FILE compared to your existing documentation, no changes are output:

  $ bump diff FILE --doc <doc_slug> --token <your_doc_token>
  * Let's compare the given definition version... done
   ›   Warning: Your documentation has not changed
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    doc: flags.doc(),
    hub: flags.hub(),
    token: flags.token(),
    open: flags.open({ description: 'Open the visual diff in your browser' }),
  };

  static args = [fileArg];

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  async run(): Promise<VersionResponse | void> {
    const { args, flags } = this.parse(Diff);
    const [definition, references] = await this.prepareDefinition(args.FILE);
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    const [documentation, token] = [flags.doc!, flags.token!];

    cli.action.start("* Let's compare the given definition version");

    const request: VersionRequest = {
      documentation,
      hub: flags.hub,
      definition,
      references,
      unpublished: true,
    };

    const response = await this.bump.postVersion(request, token);
    switch (response.status) {
      case 201:
        let version: VersionResponse = response.data;
        this.d(`Unpublished version created with ID ${version.id}`);

        version = await this.waitChangesResult(version.id, token, {
          timeout: 30,
        });
        cli.action.stop();

        if (version && version.diff_summary) {
          await cli.log(version.diff_summary);
          if (flags.open && version.diff_public_url) {
            await cli.open(version.diff_public_url);
          }
        } else {
          this.warn('There were no structural changes in your new definition');
        }

        return version;
        break;
      case 204:
        cli.action.stop();
        this.warn('Your documentation has not changed');
        break;
    }

    return;
  }

  async waitChangesResult(
    versionId: string,
    token: string,
    opts: { timeout: number },
  ): Promise<VersionResponse> {
    const diffResponse = await this.bump.getVersion(versionId, token);

    if (opts.timeout <= 0) {
      throw new CLIError(
        'We were unable to compute your documentation diff. Sorry about that. Please try again later',
      );
    }

    switch (diffResponse.status) {
      case 200:
        const version: VersionResponse = diffResponse.data;

        this.d(`Received version:`);
        this.d(version);
        return version;
        break;
      case 202:
        this.d('Waiting 1 sec before next pool');
        await this.pollingDelay();
        return await this.waitChangesResult(versionId, token, {
          timeout: opts.timeout - 1,
        });
        break;
    }

    return {} as VersionResponse;
  }
}

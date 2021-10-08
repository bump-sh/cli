import { CLIError } from '@oclif/errors';

import Command from '../command';
import * as flags from '../flags';
import { fileArg, otherFileArg } from '../args';
import { cli } from '../cli';
import { VersionRequest, VersionResponse } from '../api/models';

export default class Diff extends Command {
  static description =
    'Get a comparaison diff with your documentation from the given file or URL';

  static examples = [
    `Compare a potential new version with the currently published one:

  $ bump diff FILE --doc <your_doc_id_or_slug> --token <your_doc_token>
  * Let's compare the given definition file with the currently deployed one... done
  Removed: GET /compare
  Added: GET /versions/{versionId}
`,
    `Store the diff in a dedicated file:

  $ bump diff FILE --doc <doc_slug> --token <doc_token> > /tmp/my-saved-diff
  * Let's compare the given definition file with the currently deployed one... done

  $ cat /tmp/my-saved-diff
  Removed: GET /compare
  Added: GET /versions/{versionId}
`,
    `In case of a non modified definition FILE compared to your existing documentation, no changes are output:

  $ bump diff FILE --doc <doc_slug> --token <your_doc_token>
  * Let's compare the given definition file with the currently deployed one... done
   ›   Warning: Your documentation has not changed
`,
    `Compare two different input files or URL independently to the one published on bump.sh

  $ bump diff FILE FILE2 --doc <doc_slug> --token <your_doc_token>
  * Let's compare the two given definition files... done
  Updated: POST /versions
    Body attribute added: previous_version_id
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    doc: flags.doc(),
    hub: flags.hub(),
    token: flags.token(),
    open: flags.open({ description: 'Open the visual diff in your browser' }),
  };

  static args = [fileArg, otherFileArg];

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  async run(): Promise<VersionResponse | void> {
    const { args, flags } = this.parse(Diff);
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    const [documentation, hub, token] = [flags.doc!, flags.hub, flags.token!];

    if (args.FILE2) {
      cli.action.start("* Let's compare the two given definition files");
    } else {
      cli.action.start(
        "* Let's compare the given definition file with the currently deployed one",
      );
    }

    const version: VersionResponse | undefined = await this.createVersion(
      args.FILE,
      documentation,
      token,
      hub,
    );
    let diffVersion: VersionResponse | undefined = undefined;

    if (args.FILE2) {
      diffVersion = await this.createVersion(
        args.FILE2,
        documentation,
        token,
        hub,
        version && version.id,
      );
    }

    diffVersion = diffVersion || version;

    if (diffVersion) {
      diffVersion = await this.waitChangesResult(diffVersion.id, token, {
        timeout: 30,
      });
      await this.displayCompareResult(diffVersion, token, flags.open);
    }

    cli.action.stop();

    return diffVersion;
  }

  async createVersion(
    file: string,
    documentation: string,
    token: string,
    hub: string | undefined,
    previous_version_id: string | undefined = undefined,
  ): Promise<VersionResponse | undefined> {
    const [definition, references] = await this.prepareDefinition(file);
    const request: VersionRequest = {
      documentation,
      hub,
      definition,
      references,
      unpublished: true,
      previous_version_id,
    };

    const response = await this.bump.postVersion(request, token);

    switch (response.status) {
      case 201:
        this.d(`Unpublished version created with ID ${response.data.id}`);
        return response.data;
        break;
      case 204:
        this.warn('Your documentation has not changed');
        break;
    }

    return;
  }

  async displayCompareResult(
    result: VersionResponse,
    token: string,
    open: boolean,
  ): Promise<void> {
    if (result && result.diff_summary) {
      await cli.log(result.diff_summary);
      if (open && result.diff_public_url) {
        await cli.open(result.diff_public_url);
      }
    } else {
      this.warn('There were no structural changes in your new definition');
    }
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

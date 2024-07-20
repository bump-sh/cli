import { CLIError } from '@oclif/errors';
import {marked} from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';

import Command from '../command.js';
import * as flagsBuilder from '../flags.js';
import { Diff as CoreDiff } from '../core/diff.js';
import { fileArg, otherFileArg } from '../args.js';
import { cli } from '../cli/index.js';
import { DiffResponse } from '../api/models.js';

export default class Diff extends Command {
  static description =
    'Get a comparison diff with your documentation from the given file or URL.';

  static examples = [
    `Compare a potential new version with the currently published one:

  $ bump diff FILE --doc <your_doc_id_or_slug> --token <your_doc_token>
  * Comparing the given definition file with the currently deployed one... done
  Removed: GET /compare
  Added: GET /versions/{versionId}
`,
    `Store the diff in a dedicated file:

  $ bump diff FILE --doc <doc_slug> --token <doc_token> > /tmp/my-saved-diff
  * Comparing the given definition file with the currently deployed one... done

  $ cat /tmp/my-saved-diff
  Removed: GET /compare
  Added: GET /versions/{versionId}
`,
    `In case of a non modified definition FILE compared to your existing documentation, no changes are output:

  $ bump diff FILE --doc <doc_slug> --token <your_doc_token>
  * Comparing the given definition file with the currently deployed one... done
   ›   Warning: Your documentation has not changed
`,
    `Compare two different input files or URL independently to the one published on bump.sh

  $ bump diff FILE FILE2 --doc <doc_slug> --token <your_doc_token>
  * Comparing the two given definition files... done
  Updated: POST /versions
    Body attribute added: previous_version_id
`,
  ];

  static flags = {
    help: flagsBuilder.help({ char: 'h' }),
    doc: flagsBuilder.doc(),
    hub: flagsBuilder.hub(),
    branch: flagsBuilder.branch(),
    token: flagsBuilder.token({ required: false }),
    open: flagsBuilder.open({ description: 'Open the visual diff in your browser' }),
    'fail-on-breaking': flagsBuilder.failOnBreaking(),
    format: flagsBuilder.format(),
    expires: flagsBuilder.expires(),
  };

  static args = [fileArg, otherFileArg];

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  async run(): Promise<void> {
    const { args, flags } = this.parse(Diff);
    /* Flags.format has a default value, so it's always defined. But
     * oclif types doesn't detect it */
    const [documentation, hub, branch, token, format, expires] = [
      flags.doc,
      flags.hub,
      flags.branch,
      flags.token,
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      flags.format!,
      flags.expires,
    ];

    if (format === 'text') {
      if (args.FILE2) {
        cli.action.start('* Comparing the two given definition files');
      } else {
        cli.action.start(
          '* Comparing the given definition file with the currently deployed one',
        );
      }
    }

    if (!args.FILE2 && (!documentation || !token)) {
      throw new CLIError(
        'Please provide a second file argument or login with an existing token',
      );
    }

    const diff: DiffResponse | undefined = await new CoreDiff(this.config).run(
      args.FILE,
      args.FILE2,
      documentation,
      hub,
      branch,
      token,
      format,
      expires,
    );

    cli.action.stop();

    if (diff) {
      await this.displayCompareResult(
        diff,
        format,
        flags.open,
        flags['fail-on-breaking'],
      );
    } else {
      await cli.log('No changes detected.');
    }

    return;
  }

  async displayCompareResult(
    result: DiffResponse,
    format: string,
    open: boolean,
    failOnBreaking: boolean,
  ): Promise<void> {
    if (format == 'text' && result.text) {
      await cli.log(result.text);
    } else if (format == 'markdown' && result.markdown) {
      marked.setOptions({
        // Define custom renderer
        renderer: new TerminalRenderer({
          tab: 2,
          heading: chalk.blue.bold,
        }),
      });

      await cli.log(marked(result.markdown));
    } else if (format == 'json' && result.details) {
      await cli.log(JSON.stringify(result.details, null, 2));
    } else if (format == 'html' && result.html) {
      await cli.log(result.html);
    } else {
      await cli.log('No structural changes detected.');
    }

    if (open && result.public_url) {
      await cli.open(result.public_url);
    }

    if (failOnBreaking && result.breaking) {
      this.exit(1);
    }
  }
}

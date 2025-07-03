import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/errors'

import {DiffResponse} from '../api/models.js'
import {fileArg, otherFileArg} from '../args.js'
import {BaseCommand} from '../base-command.js'
import {Diff as CoreDiff} from '../core/diff.js'
import * as flagsBuilder from '../flags.js'

export default class Diff extends BaseCommand<typeof Diff> {
  static override args = {
    file: fileArg,
    otherFile: otherFileArg,
  }

  static override description = 'Get a comparison diff with your documentation from the given file or URL.'

  static override examples = [
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
  ]

  static override flags = {
    branch: flagsBuilder.branch(),
    doc: flagsBuilder.doc(),
    expires: flagsBuilder.expires(),
    'fail-on-breaking': flagsBuilder.failOnBreaking({allowNo: true}),
    format: flagsBuilder.format(),
    hub: flagsBuilder.hub(),
    overlay: flagsBuilder.overlay(),
    token: flagsBuilder.token({required: false}),
  }

  async displayCompareResult(result: DiffResponse, format: string, failOnBreaking: boolean): Promise<void> {
    if (format === 'text' && result.text) {
      ux.stdout(result.text)
    } else if (format === 'markdown' && result.markdown) {
      ux.stdout(result.markdown)
    } else if (format === 'json' && result.details) {
      ux.stdout(JSON.stringify(result.details, null, 2))
    } else if (format === 'html' && result.html) {
      ux.stdout(result.html)
    } else {
      ux.stdout('No structural changes detected.')
    }

    if (failOnBreaking && result.breaking) {
      this.exit(1)
    }
  }

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  async run(): Promise<void> {
    const {args, flags} = await this.parse(Diff)
    const [documentation, hub, branch, token, format, expires, overlays] = [
      flags.doc,
      flags.hub,
      flags.branch,
      flags.token,
      flags.format,
      flags.expires,
      flags.overlay,
    ]
    if (format === 'text') {
      if (args.otherFile) {
        ux.action.start('* Comparing the two given definition files')
      } else {
        ux.action.start('* Comparing the given definition file with the currently deployed one')
      }
    }

    if (!args.otherFile && (!documentation || !token)) {
      throw new CLIError('Please provide a second file argument or login with an existing token')
    }

    ux.action.status = '...diff on Bump.sh in progress'

    const diff: DiffResponse | undefined = await new CoreDiff(this.config).run(
      args.file,
      args.otherFile,
      documentation,
      hub,
      branch,
      token,
      format,
      expires,
      overlays,
    )

    ux.action.stop()

    if (diff) {
      await this.displayCompareResult(diff, format, flags['fail-on-breaking'])
    } else {
      ux.stdout('No changes detected.')
    }
  }
}

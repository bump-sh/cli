import {ux} from '@oclif/core'
import chalk from 'chalk'

import {VersionResponse} from '../api/models.js'
import {versionIdArg} from '../args.js'
import {BaseCommand} from '../base-command.js'
import {Release as CoreRelease} from '../core/release.js'
import * as flagsBuilder from '../flags.js'

export default class Unrelease extends BaseCommand<typeof Unrelease> {
  static override args = {
    versionId: versionIdArg,
  }

  static override description =
    'Unrelease a released version, which is no longer publicly visible in your documentation and your changelog.'

  static override examples = [
    `Unrelease a released version:

${chalk.dim('$ bump unrelease VERSION_ID --token <your_doc_token>')}
* Let's unrelease this version on Bump.sh... done
* Your documentation version is being unreleased
`,
  ]

  static override flags = {
    token: flagsBuilder.token(),
  }

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Unrelease)

    ux.action.start("Let's unrelease this version on Bump.sh")
    ux.action.status = args.versionId

    const version: VersionResponse | undefined = await new CoreRelease(this.bump).unrelease(
      args.versionId,
      flags.token!,
    )

    if (version) {
      const docName = version.doc_name || args.versionId
      ux.stdout(ux.colorize('green', `Your ${docName} documentation version is being unreleased.`))
    } else {
      ux.warn('Version is already deployed, nothing was done')
    }

    ux.action.stop()
  }
}

import {ux} from '@oclif/core'
import chalk from 'chalk'

import {VersionResponse} from '../api/models.js'
import {versionIdArg} from '../args.js'
import {BaseCommand} from '../base-command.js'
import {Release as CoreRelease} from '../core/release.js'
import * as flagsBuilder from '../flags.js'

export default class Release extends BaseCommand<typeof Release> {
  static override args = {
    versionId: versionIdArg,
  }

  static override description =
    'Release a deployed version, which becomes publicly visible in your documentation and your changelog.'

  static override examples = [
    `Release a deployed version:

${chalk.dim('$ bump release VERSION_ID --token <your_doc_token>')}
* Let's release this version on Bump.sh... done
* Your documentation version is being released
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
    const {args, flags} = await this.parse(Release)

    ux.action.start("Let's release this version on Bump.sh")
    ux.action.status = args.versionId

    const version: VersionResponse | undefined = await new CoreRelease(this.bump).release(args.versionId, flags.token!)

    if (version) {
      const docName = version.doc_name || args.versionId
      ux.stdout(ux.colorize('green', `Your ${docName} documentation version is being released.`))
      if (version.doc_public_url) {
        ux.stdout(ux.colorize('green', 'It will soon be publicly visible at:'))
        ux.stdout(ux.colorize('underline', version.doc_public_url))
      }
    } else {
      ux.warn('Version is already released, nothing was done')
    }

    ux.action.stop()
  }
}

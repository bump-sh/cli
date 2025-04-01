import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/errors'
import chalk from 'chalk'

import {VersionResponse} from '../api/models.js'
import {fileArg} from '../args.js'
import {BaseCommand} from '../base-command.js'
import {DefinitionDirectory} from '../core/definition-directory.js'
import {Deploy as CoreDeploy} from '../core/deploy.js'
import {isDir} from '../core/utils/file.js'
import {confirm as promptConfirm} from '../core/utils/prompts.js'
import {API} from '../definition.js'
import * as flagsBuilder from '../flags.js'

export default class Deploy extends BaseCommand<typeof Deploy> {
  static args = {file: fileArg}

  static description = 'Create a new version of your documentation from the given file or URL.'

  static examples = [
    `Deploy a new version of ${chalk.underline('an existing documentation')}

${chalk.dim('$ bump deploy FILE --doc <your_doc_id_or_slug> --token <your_doc_token>')}
* Let's deploy on Bump.sh... done
* Your new documentation version will soon be ready
`,
    `Deploy a new version of ${chalk.underline('an existing documentation attached to a hub')}

${chalk.dim('$ bump deploy FILE --doc <doc_slug> --hub <your_hub_id_or_slug> --token <your_doc_token>')}
* Let's deploy on Bump.sh... done
* Your new documentation version will soon be ready
`,
    `Deploy a whole directory of ${chalk.underline('API definitions files to a hub')}

${chalk.dim('$ bump deploy DIR --filename-pattern *-{slug}-api --hub <hub_slug> --token <hub_token>')}
We've found 2 valid API definitions to deploy
└─ DIR
   └─ source-my-service-api.yml (OpenAPI spec version 3.1.0)
   └─ source-my-jobs-service-api.yml (AsyncAPI spec version 2.6.0)

Let's deploy those documentations to your <hub_slug> hub on Bump.sh

* Your new documentation version will soon be ready
Let's deploy a new version to your my-service documentation on Bump.sh... done

* Your new documentation version will soon be ready
Let's deploy a new version to your my-jobs-service documentation on Bump.sh... done
`,
    `${chalk.underline('Validate a new documentation version')} before deploying it

${chalk.dim('$ bump deploy FILE --dry-run --doc <doc_slug> --token <your_doc_token>')}
* Let's validate on Bump.sh... done
* Definition is valid
`,
  ]

  static flags = {
    'auto-create': flagsBuilder.autoCreate(),
    branch: flagsBuilder.branch(),
    doc: flagsBuilder.doc(),
    'doc-name': flagsBuilder.docName(),
    'dry-run': flagsBuilder.dryRun(),
    'filename-pattern': flagsBuilder.filenamePattern(),
    hub: flagsBuilder.hub(),
    interactive: flagsBuilder.interactive(),
    overlay: flagsBuilder.overlay(),
    preview: flagsBuilder.preview(),
    token: flagsBuilder.token(),
  }

  protected async deployDirectory(
    dir: string,
    dryRun: boolean,
    token: string,
    hub: string,
    autoCreate: boolean,
    interactive: boolean,
    filenamePattern: string,
    documentationName: string | undefined,
    branch: string | undefined,
  ): Promise<void> {
    const definitionDirectory = new DefinitionDirectory(dir, filenamePattern)

    await definitionDirectory.readDefinitions()

    await ux.action.pauseAsync(async () => {
      definitionDirectory.stdoutDefinitions()

      // In “interactive” mode we ask the user if he wants to add more
      // definitions to deploy. He is thus presented a form to select
      // some files from the target directory.
      if (interactive) {
        let confirm = true
        if (definitionDirectory.definitionsExists()) {
          confirm = await promptConfirm('Do you want to add more files to deploy?')
        }

        if (confirm) {
          await ux.action.pauseAsync(async () => {
            await definitionDirectory.interactiveSelection()
          })
        }
      }
    })

    if (definitionDirectory.definitionsExists()) {
      await ux.action.pauseAsync(async () => {
        definitionDirectory.stdoutDefinitions()

        if (interactive) {
          await definitionDirectory.sequentialMap(async (definition) => {
            await definitionDirectory.renameToConvention(definition)
          })
        }
      })
      ux.action.status = `...to your ${hub} hub on Bump.sh`

      await definitionDirectory.sequentialMap(async (definition) => {
        await this.deploySingleFile(
          definition.definition,
          dryRun,
          definition.slug,
          token,
          hub,
          autoCreate,
          definition.slug || documentationName,
          branch,
        )
      })
    } else {
      throw new CLIError(
        `No documentation found in ${dir} with the pattern '${filenamePattern}'.\nYou should check with the ${chalk.dim(
          '--filename-pattern',
        )} flag to select your files from your naming convention.\nIf you don't have a naming convention we can help naming your API definition files:\nTry the ${chalk.dim(
          '--interactive',
        )} flag for that.`,
      )
    }
  }

  protected async deploySingleFile(
    api: API,
    dryRun: boolean,
    documentation: string,
    token: string,
    hub: string | undefined,
    autoCreate: boolean,
    documentationName: string | undefined,
    branch: string | undefined,
    overlay?: string[] | undefined,
    temporary?: boolean | undefined,
  ): Promise<void> {
    ux.action.status = `...a new version to your ${documentation} documentation`

    const response: VersionResponse | undefined = await new CoreDeploy(this.bump).run(
      api,
      dryRun,
      documentation,
      token,
      hub,
      autoCreate,
      documentationName,
      branch,
      overlay,
      temporary,
    )

    if (dryRun) {
      ux.stdout(ux.colorize('green', 'Definition is valid'))
    } else if (response) {
      process.stdout.write(ux.colorize('green', `Your ${documentation} documentation...`))
      ux.stdout(
        ux.colorize('green', `has received a new ${temporary ? 'preview' : 'deployment'} which will soon be ready at:`),
      )
      ux.stdout(ux.colorize('underline', response.doc_public_url!))
    } else {
      ux.warn(`Your ${documentation} documentation has not changed`)
    }
  }

  /*
    Oclif doesn't type parsed args & flags correctly and especially
    required-ness which is not known by the compiler, thus the use of
    the non-null assertion '!' in this command.
    See https://github.com/oclif/oclif/issues/301 for details
  */
  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Deploy)

    const [
      dryRun,
      documentation,
      token,
      hub,
      autoCreate,
      interactive,
      filenamePattern,
      documentationName,
      branch,
      overlay,
      temporary,
    ] = [
      flags['dry-run'],
      flags.doc,

      flags.token!,
      flags.hub,
      flags['auto-create'],
      flags.interactive,
      /* Flags.filenamePattern has a default value, so it's always defined. But
       * oclif types doesn't detect it */

      flags['filename-pattern']!,
      flags['doc-name'],
      flags.branch,
      flags.overlay,
      /* when --preview is provided, generate temporary version */
      flags.preview,
    ]

    const action = dryRun ? 'validate' : temporary ? 'preview' : 'deploy'
    ux.action.start(`Let's ${action} on Bump.sh`)

    if (isDir(args.file)) {
      if (hub) {
        await this.deployDirectory(
          args.file,
          dryRun,
          token,
          hub,
          autoCreate,
          interactive,
          filenamePattern,
          documentationName,
          branch,
        )
      } else {
        throw new CLIError('Missing required flag --hub when deploying an entire directory')
      }
    } else if (documentation) {
      const api = await API.load(args.file)
      this.d(`${args.file} looks like an ${api.specName} spec version ${api.version}`)

      await this.deploySingleFile(
        api,
        dryRun,
        documentation,
        token,
        hub,
        autoCreate,
        documentationName,
        branch,
        overlay,
        temporary,
      )
    } else {
      throw new CLIError('Missing required flag --doc=<slug>')
    }

    ux.action.stop()
  }
}

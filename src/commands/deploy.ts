import chalk from 'chalk';
import { RequiredFlagError } from '@oclif/parser/lib/errors.js';
import { CLIError } from '@oclif/errors';

import Command from '../command.js';
import * as flagsBuilder from '../flags.js';
import { DefinitionDirectory } from '../core/definition_directory.js';
import { Deploy as CoreDeploy } from '../core/deploy.js';
import { confirm as promptConfirm } from '../core/utils/prompts.js';
import { isDir } from '../core/utils/file.js';
import { fileArg } from '../args.js';
import { cli } from '../cli/index.js';
import { VersionResponse } from '../api/models.js';
import { API } from '../definition.js';

export default class Deploy extends Command {
  static description =
    'Create a new version of your documentation from the given file or URL.';

  static examples = [
    `Deploy a new version of ${chalk.underline('an existing documentation')}

${chalk.dim('$ bump deploy FILE --doc <your_doc_id_or_slug> --token <your_doc_token>')}
* Let's deploy a new documentation version on Bump... done
* Your new documentation version will soon be ready
`,
    `Deploy a new version of ${chalk.underline(
      'an existing documentation attached to a hub',
    )}

${chalk.dim(
  '$ bump deploy FILE --doc <doc_slug> --hub <your_hub_id_or_slug> --token <your_doc_token>',
)}
* Let's deploy a new documentation version on Bump... done
* Your new documentation version will soon be ready
`,
    `Deploy a whole directory of ${chalk.underline('API definitions files to a hub')}

${chalk.dim(
  '$ bump deploy DIR --filename-pattern *-{slug}-api --hub <hub_slug> --token <hub_token>',
)}
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
* Let's validate a new documentation version on Bump... done
* Definition is valid
`,
  ];

  static flags = {
    help: flagsBuilder.help({ char: 'h' }),
    doc: flagsBuilder.doc(),
    'doc-name': flagsBuilder.docName(),
    hub: flagsBuilder.hub(),
    branch: flagsBuilder.branch(),
    token: flagsBuilder.token(),
    'auto-create': flagsBuilder.autoCreate(),
    interactive: flagsBuilder.interactive(),
    'filename-pattern': flagsBuilder.filenamePattern(),
    'dry-run': flagsBuilder.dryRun(),
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
    ] = [
      flags['dry-run'],
      flags.doc,
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      flags.token!,
      flags.hub,
      flags['auto-create'],
      flags.interactive,
      /* Flags.filenamePattern has a default value, so it's always defined. But
       * oclif types doesn't detect it */
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      flags['filename-pattern']!,
      flags['doc-name'],
      flags.branch,
    ];

    if (isDir(args.FILE)) {
      if (hub) {
        await this.deployDirectory(
          args.FILE,
          dryRun,
          token,
          hub,
          autoCreate,
          interactive,
          filenamePattern,
          documentationName,
          branch,
        );
      } else {
        throw new RequiredFlagError({ flag: Deploy.flags.hub, parse: {} });
      }
    } else {
      if (documentation) {
        const api = await API.load(args.FILE);
        this.d(`${args.FILE} looks like an ${api.specName} spec version ${api.version}`);

        await this.deploySingleFile(
          api,
          dryRun,
          documentation,
          token,
          hub,
          autoCreate,
          documentationName,
          branch,
        );
      } else {
        throw new RequiredFlagError({ flag: Deploy.flags.doc, parse: {} });
      }
    }

    return;
  }

  private async deployDirectory(
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
    const definitionDirectory = new DefinitionDirectory(dir, filenamePattern);
    const action = dryRun ? 'validate' : 'deploy';

    await definitionDirectory.readDefinitions();

    // In “interactive” mode we ask the user if he wants to add more
    // definitions to deploy. He is thus presented a form to select
    // some files from the target directory.
    if (interactive) {
      let confirm = true;
      if (definitionDirectory.definitionsExists()) {
        await promptConfirm('Do you want to add more files to deploy?').catch(() => {
          confirm = false;
        });
      }
      if (confirm) {
        await definitionDirectory.interactiveSelection();
      }
    }

    if (definitionDirectory.definitionsExists()) {
      cli.info(
        chalk.underline(
          `Let's ${action} those documentations to your ${hub} hub on Bump.sh`,
        ),
      );

      await definitionDirectory.sequentialMap(async (definition) => {
        if (interactive) {
          await definitionDirectory.renameToConvention(definition);
        }

        await this.deploySingleFile(
          definition.definition,
          dryRun,
          definition.slug,
          token,
          hub,
          autoCreate,
          definition.slug || documentationName,
          branch,
        );

        return definition;
      });
    } else {
      throw new CLIError(
        `No documentations found in ${dir}.\nYou should check the ${chalk.dim(
          '--filename-pattern',
        )} flag to select your files from your naming convention.\nIf you don't have a naming convention we can help naming your API definition files:\nTry the ${chalk.dim(
          '--interactive',
        )} flag for that.`,
      );
    }

    return;
  }

  private async deploySingleFile(
    api: API,
    dryRun: boolean,
    documentation: string,
    token: string,
    hub: string | undefined,
    autoCreate: boolean,
    documentationName: string | undefined,
    branch: string | undefined,
  ): Promise<void> {
    const action = dryRun ? 'validate' : 'deploy';
    cli.action.start(
      `Let's ${action} a new version to your ${documentation} documentation on Bump.sh`,
    );

    const response: VersionResponse | undefined = await new CoreDeploy(this.config).run(
      api,
      dryRun,
      documentation,
      token,
      hub,
      autoCreate,
      documentationName,
      branch,
    );

    if (dryRun) {
      await cli.styledSuccess('Definition is valid');
    } else {
      if (response) {
        await cli.styledSuccess(
          `Your new documentation version will soon be ready at ${response.doc_public_url}`,
        );
      } else {
        await cli.warn('Your documentation has not changed');
      }
    }

    cli.action.stop();

    return;
  }
}

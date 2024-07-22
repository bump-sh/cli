import chalk from 'chalk';
import debug from 'debug';
import { rename } from 'fs';
import { join, extname, dirname, resolve, basename } from 'node:path';
import * as p from '@clack/prompts';
import { CLIError } from '@oclif/errors';

import { cli } from '../cli/index.js';
import { API } from '../definition.js';
import { File } from './utils/file.js';
import { confirm as promptConfirm } from '../core/utils/prompts.js';

export type DefinitionConfig = {
  definition: API;
  file: string;
  slug: string;
};

export class DefinitionDirectory {
  protected readonly path: string;
  protected readonly definitions: DefinitionConfig[];

  protected readonly filenamePattern: RegExp;
  protected readonly humanFilenamePattern: string;
  protected buildNewFilename: (slug: string) => string;

  public constructor(directory: string, filenamePattern: string) {
    this.path = resolve(directory);
    this.definitions = [];
    // Transform basic patterns '*' or '{text}' into a real RegExp
    this.filenamePattern = new RegExp(
      '^' + filenamePattern.replace('*', '.*?').replace(/{.*?}/, '(?<slug>.+?)') + '$',
    );

    this.buildNewFilename = (slug) =>
      filenamePattern.replace('*', '').replace(/{.*?}/, slug);

    this.humanFilenamePattern = filenamePattern.replace(
      /{(.*?)}/,
      `${chalk.inverse('{$1}')}`,
    );
  }

  public async readDefinitions(): Promise<DefinitionConfig[]> {
    for await (const { value, filename } of File.listValidConventionFiles(
      this.path,
      this.filenamePattern,
    )) {
      const file = join(this.path, value);
      /* We already check the filenamePattern match inside the
      `File.listValidConventionFiles` method so we are sure the group
      matched exists. */
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      const slug = filename.match(this.filenamePattern)!.groups!.slug!;
      const definition = await API.load(file);
      this.definitions.push({
        file,
        definition,
        slug,
      });
    }

    if (this.definitions.length) {
      cli.info(
        chalk.underline(
          `We've found ${this.definitions.length} valid API definitions to deploy`,
        ),
      );
      const subtree = cli.tree();
      this.definitions.forEach(({ file, definition }) =>
        subtree.insert(
          `${basename(file)} (${definition.specName} spec version ${definition.version})`,
        ),
      );
      const tree = cli.tree();
      tree.insert(this.path, subtree);

      tree.display();
      cli.info('');
    }

    return this.definitions;
  }

  public definitionsExists(): boolean {
    return !!this.definitions.length;
  }

  public async sequentialMap(
    callback: (definition: DefinitionConfig) => Promise<DefinitionConfig>,
  ): Promise<void> {
    for (const definition of this.definitions) {
      await callback(definition);
    }

    return;
  }

  public async renameToConvention(documentation: DefinitionConfig): Promise<void> {
    const { file, slug } = documentation;
    if (basename(file, extname(file)).match(this.filenamePattern)) return;

    // Default convention is defined in the flags.ts file for the
    // 'filenamePattern' flag.
    const newFilename = this.buildNewFilename(slug);
    const newFile = `${dirname(file)}/${newFilename}${extname(file)}`;

    let confirm = true;
    await promptConfirm(
      `Do you want to rename ${file} to ${newFile} (for later deployments)?`,
    ).catch(() => {
      confirm = false;
    });

    if (confirm) {
      await rename(file, newFile, (err) => {
        if (err) throw err;
        cli.styledSuccess(`Renamed ${file} to ${newFile}.`);
      });
    }

    return;
  }

  public async interactiveSelection(): Promise<DefinitionConfig[]> {
    p.intro(
      `This interactive form will help you rename your API contrat files to follow the expected naming convention.\n${chalk.gray(
        '│  ',
      )}Once finished, the selected files will be deployed to Bump.sh.\n${chalk.gray(
        '│  ',
      )}\n${chalk.gray('│  ')}File naming convention: ${
        this.humanFilenamePattern
      }${chalk.dim('.[json|yml|yaml]')}\n`,
    );

    const fileOptions = File.listInvalidConventionFiles(this.path, this.filenamePattern);
    if (!fileOptions.length) {
      throw new CLIError(
        `No JSON or YAML files needing a rename were found in ${
          this.path
        }.\nAre you sure you need the ${chalk.dim('--interactive')} flag?`,
      );
    }
    let shouldContinue = true;

    while (shouldContinue) {
      const filePrompt = {
        fileName: () =>
          p.select({
            message: `Which file do you want to deploy from ${chalk.dim(this.path)}?`,
            options: fileOptions,
          }),
      };
      const groupPrompt = {
        /* Results type should be taken from the previous prompts
         * defined with clack/prompt  */
        slug: ({ results }: { results: { fileName?: unknown } }) =>
          p.text({
            message: `What is the ${chalk.inverse(
              'documentation slug',
            )} for this ${chalk.dim(results.fileName as string)} file?`,
          }),
      };
      const prompt = await p.group(
        {
          ...filePrompt,
          ...groupPrompt,
          shouldContinue: () =>
            p.confirm({ message: 'Do you want to select another file?' }),
        },
        {
          onCancel: () => {
            p.cancel('Deploy cancelled.');
            process.exit(0);
          },
        },
      );

      const file = join(this.path, prompt.fileName as string);
      const definition = await API.load(file);
      this.d(
        `${file} looks like an ${definition.specName} spec version ${definition.version}`,
      );

      this.definitions.push({
        file,
        definition,
        slug: prompt.slug,
      });
      shouldContinue = prompt.shouldContinue;
    }

    p.outro(`You're all set. Your deployments will start soon.`);

    return this.definitions;
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:interactive`)(formatter, ...args);
  }
}

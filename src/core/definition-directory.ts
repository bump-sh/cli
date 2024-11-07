import * as p from '@clack/prompts'
import {ux} from '@oclif/core'
import {CLIError, ExitError} from '@oclif/core/errors'
import chalk from 'chalk'
import debug from 'debug'
import {rename} from 'node:fs'
import {basename, dirname, extname, join, resolve} from 'node:path'

import {confirm as promptConfirm} from '../core/utils/prompts.js'
import {API} from '../definition.js'
import {File} from './utils/file.js'

export type DefinitionConfig = {
  definition: API
  file: string
  slug: string
}

export class DefinitionDirectory {
  protected buildNewFilename: (slug: string) => string
  protected readonly definitions: DefinitionConfig[]

  protected readonly filenamePattern: RegExp
  protected readonly humanFilenamePattern: string
  protected readonly path: string

  public constructor(directory: string, filenamePattern: string) {
    this.path = resolve(directory)
    this.definitions = []
    // // Transform basic patterns '*' or '{text}' into a real RegExp
    this.filenamePattern = new RegExp('^' + filenamePattern.replace('*', '.*?').replace(/{.*?}/, '(?<slug>.+?)') + '$')

    this.buildNewFilename = (slug) => filenamePattern.replace('*', '').replace(/{.*?}/, slug)

    this.humanFilenamePattern = filenamePattern.replace(/{(.*?)}/, `${chalk.inverse('{$1}')}`)
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:interactive`)(formatter, ...args)
  }

  public definitionsExists(): boolean {
    return this.definitions.length > 0
  }

  public async interactiveSelection(): Promise<DefinitionConfig[]> {
    p.intro(
      `This interactive form will help you rename your API contrat files to follow the expected naming convention.\n${chalk.gray(
        '│  ',
      )}Once finished, the selected files will be deployed to Bump.sh.\n${chalk.gray(
        '│  ',
      )}\n${chalk.gray('│  ')}File naming convention: ${this.humanFilenamePattern}${chalk.dim('.[json|yml|yaml]')}\n`,
    )

    let fileOptions = File.listInvalidConventionFiles(this.path, this.filenamePattern)
    if (fileOptions.length === 0) {
      throw new CLIError(
        `No JSON or YAML files needing a rename were found in ${
          this.path
        }.\nAre you sure you need the ${chalk.dim('--interactive')} flag?`,
      )
    }

    let shouldContinue = true

    while (shouldContinue) {
      fileOptions = fileOptions.filter(({label}) => {
        // keep file only if it's NOT already present in the directory
        return (
          this.definitions.findIndex(({file}) => {
            return basename(file) === label
          }) === -1
        )
      })
      const filePrompt = {
        fileName: () =>
          p.select({
            message: `Which file do you want to deploy from ${chalk.dim(this.path)}?`,
            options: fileOptions,
          }),
      }
      const groupPrompt = {
        /* Results type should be taken from the previous prompts
         * defined with clack/prompt  */
        slug: ({results}: {results: {fileName?: unknown}}) =>
          p.text({
            message: `What is the ${chalk.inverse(
              'documentation slug',
            )} for this ${chalk.dim(results.fileName as string)} file?`,
          }),
      }
      // eslint-disable-next-line no-await-in-loop
      const prompt = await p.group(
        {
          ...filePrompt,
          ...groupPrompt,
          shouldContinue: () => p.confirm({message: 'Do you want to select another file?'}),
        },
        {
          onCancel() {
            p.cancel('Deploy cancelled.')
            throw new ExitError(1)
          },
        },
      )

      const file = join(this.path, prompt.fileName as string)
      // eslint-disable-next-line no-await-in-loop
      const definition = await API.load(file)
      this.d(`${file} looks like an ${definition.specName} spec version ${definition.version}`)

      this.definitions.push({
        definition,
        file,
        slug: prompt.slug,
      })
      shouldContinue = prompt.shouldContinue
    }

    p.outro(`You're all set. Your deployments will start soon.`)

    return this.definitions
  }

  public async map(callback: (definition: DefinitionConfig) => Promise<DefinitionConfig>): Promise<DefinitionConfig[]> {
    return Promise.all(this.definitions.map((definition) => callback(definition)))
  }

  public async readDefinitions(): Promise<DefinitionConfig[]> {
    for await (const {filename, value} of File.listValidConventionFiles(this.path, this.filenamePattern)) {
      const file = join(this.path, value)
      /* We already check the filenamePattern match inside the
      `File.listValidConventionFiles` method so we are sure the group
      matched exists. */

      const slug = filename.match(this.filenamePattern)!.groups!.slug!
      const definition = await API.load(file)
      this.definitions.push({
        definition,
        file,
        slug,
      })
    }

    return this.definitions
  }

  public async renameToConvention(documentation: DefinitionConfig): Promise<void> {
    const {file, slug} = documentation
    if (this.filenamePattern.test(basename(file, extname(file)))) return

    // Default convention is defined in the flags.ts file for the
    // 'filenamePattern' flag.
    const newFilename = this.buildNewFilename(slug)
    const newFile = `${dirname(file)}/${newFilename}${extname(file)}`

    const confirm = await promptConfirm(`Do you want to rename ${file} to ${newFile} (for later deployments)?`)

    if (confirm) {
      await rename(file, newFile, (err) => {
        if (err) throw err
        ux.stdout(ux.colorize('green', `Renamed ${file} to ${newFile}.`))
      })
    }
  }

  public async sequentialMap(callback: (definition: DefinitionConfig) => Promise<void>): Promise<DefinitionConfig[]> {
    for (const definition of this.definitions) {
      // We explicitly need a sequential run of promises, so the await
      // in loop is needed.
      /* eslint-disable-next-line no-await-in-loop */
      await callback(definition)
    }

    return this.definitions
  }

  public stdoutDefinitions(): void {
    if (this.definitions.length > 0) {
      ux.stdout(chalk.underline(`We've found ${this.definitions.length} valid API definitions to deploy`))
      ux.stdout(`└─ ${this.path}`)
      let iterations = this.definitions.length
      for (const {definition, file} of this.definitions) {
        const filename: string = `${basename(file)} (${definition.specName} spec version ${definition.version})`
        iterations -= 1
        if (iterations) {
          ux.stdout(`   ├─ ${filename}`)
        } else {
          ux.stdout(`   └─ ${filename}`)
        }
      }

      ux.stdout('')
    }
  }
}

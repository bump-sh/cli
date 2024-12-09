import {ux} from '@oclif/core'
import chalk from 'chalk'
import {existsSync} from 'node:fs'
import {mkdir, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

import {fileArg, overlayFileArg} from '../args.js'
import {BaseCommand} from '../base-command.js'
import {confirm as promptConfirm} from '../core/utils/prompts.js'
import {API} from '../definition.js'
import * as flagsBuilder from '../flags.js'

export default class Overlay extends BaseCommand<typeof Overlay> {
  static override args = {
    file: fileArg,
    overlay: overlayFileArg,
  }

  static override description = 'Apply an OpenAPI specified overlay to your API definition.'

  static override examples = [
    `Apply the OVERLAY_FILE to the existing DEFINITION_FILE. The resulting
definition is output on stdout meaning you can redirect it to a new
file.

${chalk.dim('$ bump overlay DEFINITION_FILE OVERLAY_FILE > destination/file.json')}
* Let's apply the overlay to the main definition... done
`,
  ]

  static override flags = {
    out: flagsBuilder.out(),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Overlay)
    const outputPath = flags.out

    ux.action.start("* Let's apply the overlay to the main definition")

    ux.action.status = '...loading definition file'

    const api = await API.load(args.file)

    ux.action.status = '...applying overlay'

    await api.applyOverlay(args.overlay)
    const [overlayedDefinition] = api.extractDefinition(outputPath)

    ux.action.stop()

    if (outputPath) {
      await mkdir(dirname(outputPath), {recursive: true})
      let confirm = true
      if (existsSync(outputPath)) {
        confirm = await promptConfirm(`Do you want to override the existing destination file? (${outputPath})`)
      }

      if (confirm) {
        await writeFile(outputPath, overlayedDefinition)
      }
    } else {
      ux.stdout(overlayedDefinition)
    }
  }
}

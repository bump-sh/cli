import chalk from 'chalk';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'path';

import { API } from '../definition';
import { confirm as promptConfirm } from '../core/utils/prompts';
import Command from '../command';
import * as flagsBuilder from '../flags';
import { fileArg, overlayFileArg } from '../args';
import { cli } from '../cli';

export default class Overlay extends Command {
  static description = 'Apply an OpenAPI specified overlay to your API definition.';

  static examples = [
    `Apply the OVERLAY_FILE to the existing DEFINITION_FILE. The resulting
definition is output on stdout meaning you can redirect it to a new
file.

${chalk.dim('$ bump overlay DEFINITION_FILE OVERLAY_FILE > destination/file.json')}
* Let's apply the overlay to the main definition... done
`,
  ];

  static flags = {
    help: flagsBuilder.help({ char: 'h' }),
    out: flagsBuilder.out(),
  };

  static args = [fileArg, overlayFileArg];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Overlay);
    const outputPath = flags.out;

    cli.action.start("* Let's apply the overlay to the main definition");

    const api = await API.load(args.FILE);

    await api.applyOverlay(args.OVERLAY_FILE);
    const [overlayedDefinition] = api.extractDefinition(outputPath);

    cli.action.stop();

    if (outputPath) {
      await mkdir(dirname(outputPath), { recursive: true });
      let confirm = true;
      if (existsSync(outputPath)) {
        await promptConfirm(
          `Do you want to override the existing destination file? (${outputPath})`,
        ).catch(() => {
          confirm = false;
        });
      }
      if (confirm) {
        await writeFile(outputPath, overlayedDefinition);
      }
    } else {
      cli.log(overlayedDefinition);
    }

    return;
  }
}

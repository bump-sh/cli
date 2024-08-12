import { CLIError } from '@oclif/errors';
import { safeStringify } from '@stoplight/yaml';

import { API } from '../definition';
import Command from '../command';
import * as flagsBuilder from '../flags';
import { fileArg, overlayFileArg } from '../args';
import { cli } from '../cli';
import { applyOverlay } from '../core/overlay';

export default class Overlay extends Command {
  static description = 'Apply an OpenAPI specified overlay to your API definition.';

  static examples = [
    `$ bump overlay DEFINITION_FILE OVERLAY_FILE
`,
  ];

  static flags = {
    help: flagsBuilder.help({ char: 'h' }),
  };

  static args = [fileArg, overlayFileArg];

  async run(): Promise<void> {
    const { args } = this.parse(Overlay);

    const newDefinition = await this.applyOverlay(args.FILE, args.OVERLAY_FILE);

    cli.log(newDefinition);

    return;
  }

  async applyOverlay(file: string, overlayFile: string): Promise<string> {
    const api = await API.load(file);
    const definition = api.definition;

    this.d(`${file} looks like an ${api.specName} spec version ${api.version}`);

    const overlay = await API.load(overlayFile);
    const overlayDefinition = overlay.definition;

    if (!API.isOpenAPIOverlay(overlayDefinition)) {
      throw new CLIError(`${overlayFile} does not look like an OpenAPI overlay`);
    }

    cli.action.start("* Let's apply the overlay to the main definition");

    const newDefinition = applyOverlay(definition, overlayDefinition);

    cli.action.stop();

    if (file.endsWith('.json')) {
      return JSON.stringify(newDefinition);
    } else {
      return safeStringify(newDefinition);
    }
  }
}

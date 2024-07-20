import { API } from '../definition.js';
import Command from '../command.js';
import * as flagsBuilder from '../flags.js';
import { fileArg, overlayFileArg } from '../args.js';
import { cli } from '../cli/index.js';

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
    const [definition, references] = api.extractDefinition();

    const overlay = await API.load(overlayFile);
    const [overlayDefinition, overlayReferences] = overlay.extractDefinition();

    this.d(`${file} looks like an ${api.specName} spec version ${api.version}`);

    cli.action.start("* Let's apply the overlay to the main definition");

    // New tentative to import ESM module
    //
    // const applyOverlay = await (eval('import("preparse")') as Promise<typeof import('preparse')>);
    // const newDefinition = await applyOverlay(definition, overlayDefinition);

    const { applyOverlay } = await import('preparse');
    const newDefinition = applyOverlay(definition, overlayDefinition);

    // other tentative to import ESM module
    //
    // const newDefinition = await (import('preparse').then(({ applyOverlay }) => applyOverlay(definition, overlayDefinition)));

    cli.action.stop();

    return newDefinition;
  }
}

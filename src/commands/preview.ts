import Command from '../command';
import * as flags from '../flags';
import { cli } from '../cli';
import { API } from '../definitions';
import { PreviewRes, PreviewReq } from '../api/models';

export default class Preview extends Command {
  static description = 'Create a documentation preview for the given file';

  static examples = [
    `$ bump preview FILE
preview of file FILE from ./src/preview.ts!
`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    specification: flags.specification(),
    strict: flags.strict(),
    'no-external-references': flags.noExternalReferences(),
  };

  static args = [{ name: 'FILE', required: true }];

  async run(): Promise<void> {
    const { args } = this.parse(Preview);

    const api = await API.loadAPI(args.FILE);
    const references = [];

    cli.debug(`* ${args.FILE} looks like an ${api.specName} spec version ${api.version}`);

    cli.debug('* Parsed $refs:');
    cli.debug(api.references.map((ref) => ref.location).join('\n'));

    for (let i = 0; i < api.references.length; i++) {
      const reference = api.references[i];
      references.push({
        location: reference.location,
        content: JSON.stringify(reference.content),
      });
    }

    cli.action.start("* Let's render a preview on Bump");
    const req: PreviewReq = {
      definition: JSON.stringify(api.definition),
      references,
    };
    const response: PreviewRes = await this.bump.postPreview(req);
    cli.action.stop();

    // const publicUrl = `${vars.apiUrl}/preview/${response.id}`;
    cli.styledSuccess(
      `Your preview is visible at: ${response.public_url} (Expires at ${response.expires_at})`,
    );

    return;
  }
}

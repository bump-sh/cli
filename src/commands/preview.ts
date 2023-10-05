import { API } from '../definition';
import Command from '../command';
import * as flagsBuilder from '../flags';
import { fileArg } from '../args';
import { cli } from '../cli';
import { PreviewResponse, PreviewRequest } from '../api/models';

import { watch } from 'fs';
import { Mutex } from 'async-mutex';

export default class Preview extends Command {
  static description = 'Create a documentation preview from the given file or URL.';

  static examples = [
    `$ bump preview FILE
* Your preview is visible at: https://bump.sh/preview/45807371-9a32-48a7-b6e4-1cb7088b5b9b
`,
  ];

  static flags = {
    help: flagsBuilder.help({ char: 'h' }),
    live: flagsBuilder.live({
      description: 'Generate a preview each time you save the given file',
    }),
    open: flagsBuilder.open({
      description: 'Open the generated preview URL in your browser',
    }),
  };

  static args = [fileArg];

  async run(): Promise<void> {
    const { args, flags } = this.parse(Preview);
    const currentPreview: PreviewResponse = await this.preview(args.FILE, flags.open);

    if (flags.live) {
      await this.waitForChanges(args.FILE, currentPreview);
    }

    return;
  }

  async preview(
    file: string,
    open = false,
    currentPreview: PreviewResponse | undefined = undefined,
  ): Promise<PreviewResponse> {
    const api = await API.load(file);
    const [definition, references] = api.extractDefinition();

    this.d(`${file} looks like an ${api.specName} spec version ${api.version}`);

    if (!currentPreview) {
      cli.action.start("* Let's render a preview on Bump");
    }

    const request: PreviewRequest = {
      definition,
      references,
    };
    const response: { data: PreviewResponse } = currentPreview
      ? await this.bump.putPreview(currentPreview.id, request)
      : await this.bump.postPreview(request);

    if (!currentPreview) {
      cli.action.stop();
      cli.styledSuccess(
        `Your preview is visible at: ${response.data.public_url} (Expires at ${response.data.expires_at})`,
      );
    }

    if (open && response.data.public_url) {
      await cli.open(response.data.public_url);
    }

    return response.data;
  }

  async waitForChanges(file: string, preview: PreviewResponse): Promise<void> {
    const mutex = new Mutex();
    let currentPreview: PreviewResponse = preview;

    cli.action.start(`Waiting for changes on file ${file}...`);

    watch(file, async () => {
      if (!mutex.isLocked()) {
        const release = await mutex.acquire();

        this.preview(file, false, currentPreview)
          .then((preview) => {
            currentPreview = preview;
            cli.action.start(`Waiting for changes on file ${file}`);
          })
          .catch((err) => {
            this.warn(err);
          })
          .finally(() => {
            setTimeout(() => {
              release();
            }, 1000); // Prevent previewing faster than once per second
          });
      }
    });
  }
}

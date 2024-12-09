import {ux} from '@oclif/core'
import {Mutex} from 'async-mutex'
import {watch} from 'node:fs'
import {default as openBrowser} from 'open'

import {PreviewRequest, PreviewResponse} from '../api/models.js'
import {fileArg} from '../args.js'
import {BaseCommand} from '../base-command.js'
import {API} from '../definition.js'
import * as flagsBuilder from '../flags.js'

export default class Preview extends BaseCommand<typeof Preview> {
  static override args = {
    file: fileArg,
  }

  static override description = 'Create a documentation preview from the given file or URL.'

  static override examples = [
    `$ <%= config.bin %> <%= command.id %> FILE
* Your preview is visible at: https://bump.sh/preview/45807371-9a32-48a7-b6e4-1cb7088b5b9b
`,
  ]

  static override flags = {
    live: flagsBuilder.live({
      description: 'Generate a preview each time you save the given file',
    }),
    open: flagsBuilder.open({
      description: 'Open the generated preview URL in your browser',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Preview)

    ux.action.start("* Let's render a preview on Bump.sh")

    const currentPreview: PreviewResponse = await this.preview(args.file, flags.open)

    if (flags.live) {
      await this.waitForChanges(args.file, currentPreview)
    } else {
      ux.action.stop()
    }
  }

  private async preview(
    file: string,
    open = false,
    currentPreview: PreviewResponse | undefined = undefined,
  ): Promise<PreviewResponse> {
    const api = await API.load(file)
    const [definition, references] = api.extractDefinition()

    this.d(`${file} looks like an ${api.specName} spec version ${api.version}`)

    const request: PreviewRequest = {
      definition,
      references,
    }
    ux.action.status = '...in progress'
    const response: {data: PreviewResponse} = currentPreview
      ? await this.bump.putPreview(currentPreview.id, request)
      : await this.bump.postPreview(request)

    if (!currentPreview) {
      ux.action.status = '...done'
      ux.stdout(
        ux.colorize(
          'green',
          `Your preview is visible at: ${response.data.public_url} (Expires at ${response.data.expires_at})`,
        ),
      )
    }

    if (open && response.data.public_url) {
      await openBrowser(response.data.public_url)
    }

    return response.data
  }

  private async waitForChanges(file: string, preview: PreviewResponse): Promise<void> {
    const mutex = new Mutex()
    let currentPreview: PreviewResponse = preview

    ux.action.status = `Waiting for changes on file ${file}...`

    watch(file, async () => {
      if (!mutex.isLocked()) {
        const release = await mutex.acquire()

        this.preview(file, false, currentPreview)
          .then((preview) => {
            currentPreview = preview
            ux.stdout(ux.colorize('green', ` ↳ has been updated (Expires at ${preview.expires_at})`))
            ux.action.status = `Waiting for changes on file ${file}`
          })
          .catch((error) => {
            this.warn(error)
          })
          .finally(() => {
            setTimeout(() => {
              release()
            }, 1000) // Prevent previewing faster than once per second
          })
      }
    })
  }
}

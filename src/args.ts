import {Args} from '@oclif/core'

const fileArg = Args.string({
  description:
    'Path or URL to your API documentation file. OpenAPI (2.0 to 3.1.0) and AsyncAPI (2.x) specifications are currently supported.\nPath can also be a directory when deploying to a Hub.',
  name: 'FILE',
  required: true,
})

const otherFileArg = Args.string({
  description: 'Path or URL to a second API documentation file to compute its diff',
  name: 'FILE2',
})

const overlayFileArg = Args.string({
  description: 'Path or URL to an overlay file',
  name: 'OVERLAY_FILE',
  required: true,
})

export {fileArg, otherFileArg, overlayFileArg}

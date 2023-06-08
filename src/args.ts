const fileArg = {
  name: 'FILE',
  required: true,
  description:
    'Path or URL to your API documentation file. OpenAPI (2.0 to 3.1.0) and AsyncAPI (2.x) specifications are currently supported.\nPath can also be a directory when deploying to a Hub.',
};

const otherFileArg = {
  name: 'FILE2',
  description: 'Path or URL to a second API documentation file to compute its diff',
};

export { fileArg, otherFileArg };

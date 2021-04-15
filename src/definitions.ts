import * as asyncapi from '@asyncapi/specs';

const supportedSpecs = {
  openapi: {
    '2.0.x': require('oas-schemas/schemas/v2.0/schema.json'),
    '3.0.x': require('oas-schemas/schemas/v3.0/schema.json'),
    '3.1.x': require('oas-schemas/schemas/v3.1/schema.json'),
  },
  asyncapi: {
    '2.0.0': asyncapi['2.0.0'],
  },
};

class UnsupportedFormat extends Error {
  constructor(message = '') {
    const compatOpenAPI = Object.keys(supportedSpecs.openapi).join(', ');
    const compatAsyncAPI = Object.keys(supportedSpecs.asyncapi).join(', ');

    const errorMsgs = [
      `Unsupported API specification (${message})`,
      `Please try with an OpenAPI ${compatOpenAPI} or AsyncAPI ${compatAsyncAPI} format.`,
    ];
    super(errorMsgs.join('\n'));
  }
}

class API {
  definition!: APIFormat;
  version!: string;
  specName!: string;
  spec?: Record<string, unknown>;

  constructor(content: APIFormat) {
    if (!(content instanceof Object)) {
      throw new UnsupportedFormat();
    }

    if ('openapi' in content) {
      this.specName = 'OpenAPI';
      this.version = content.openapi;
      this.spec = supportedSpecs.openapi[this.withoutPatchVersion()];
    } else if ('asyncapi' in content) {
      this.specName = 'AsyncAPI';
      this.version = content.asyncapi;
      this.spec = supportedSpecs.asyncapi[this.version];
    } else {
      throw new UnsupportedFormat();
    }

    if (this.spec === undefined) {
      throw new UnsupportedFormat(`${this.specName} ${this.version}`);
    } else {
      this.definition = content;
    }
  }

  withoutPatchVersion(): string {
    const [major, minor] = this.version.split('.', 3);

    return `${major}.${minor}.x`;
  }
}

type APIFormat = OpenAPI | AsyncAPI;

// http://spec.openapis.org/oas/v3.1.0#oasObject
interface OpenAPI {
  readonly openapi: string;
  readonly info: string;
}

// https://www.asyncapi.com/docs/specifications/2.0.0#A2SObject
interface AsyncAPI {
  readonly asyncapi: string;
  readonly info: string;
}

export { API };

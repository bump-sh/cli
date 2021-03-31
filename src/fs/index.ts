import * as fs from 'fs';
import { promisify } from 'util';
import * as YAML from 'yaml';
import axios from 'axios';

class UnsupportedFormat extends Error {
  constructor() {
    super('Unsupported API specification.');
  }
}
class API {
  definition!: Spec;
  version!: string;
  spec!: string;

  constructor(content: Spec) {
    if (!(content instanceof Object)) {
      throw new UnsupportedFormat();
    }

    if ('openapi' in content) {
      this.spec = 'OpenAPI';
      this.version = content.openapi;
    } else if ('asyncapi' in content) {
      this.spec = 'AsyncAPI';
      this.version = content.asyncapi;
    } else {
      throw new UnsupportedFormat();
    }

    this.definition = content;
  }
}

type Spec = OpenAPI | AsyncAPI;

// http://spec.openapis.org/oas/v3.1.0#oasObject
interface OpenAPI {
  readonly openapi: string;
  readonly info: string;
  readonly servers?: Record<string, unknown>;
  readonly paths?: Record<string, unknown>;
  readonly webhooks?: Record<string, unknown>;
  readonly components?: Record<string, unknown>;
  readonly security?: Record<string, unknown>;
  readonly tags?: Record<string, unknown>;
  readonly externalDocs?: Record<string, unknown>;
}

// https://www.asyncapi.com/docs/specifications/2.0.0#A2SObject
interface AsyncAPI {
  readonly asyncapi: string;
  readonly id?: string;
  readonly info: string;
  readonly servers?: Record<string, unknown>;
  readonly channels: Record<string, unknown>;
  readonly components?: Record<string, unknown>;
  readonly tags?: Record<string, unknown>;
  readonly externalDocs?: Record<string, unknown>;
}

async function fetch(path: string): Promise<string> {
  if (new RegExp('^https?://').test(path)) {
    return axios.get<string>(path).then((response) => response.data);
  } else {
    return promisify(fs.readFile)(path, {
      encoding: 'UTF-8',
    });
  }
}

async function loadAPI(path: string): Promise<API> {
  return fetch(path).then((specContent) => {
    return new API(YAML.parse(specContent));
  });
}

export { loadAPI, API };

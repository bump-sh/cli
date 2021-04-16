import { CLIError } from '@oclif/errors';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import asyncapi from '@asyncapi/specs';
import {
  JSONSchema4Type,
  JSONSchema4Object,
  JSONSchema6Type,
  JSONSchema6Object,
} from 'json-schema';
import path from 'path';

class SupportedFormat {
  static readonly openapi: Record<string, SpecSchema> = {
    '2.0.x': require('oas-schemas/schemas/v2.0/schema.json'),
    '3.0.x': require('oas-schemas/schemas/v3.0/schema.json'),
    '3.1.x': require('oas-schemas/schemas/v3.1/schema.json'),
  };
  static readonly asyncapi: Record<string, SpecSchema> = {
    '2.0.0': asyncapi['2.0.0'],
  };
}

class UnsupportedFormat extends CLIError {
  constructor(message = '') {
    const compatOpenAPI = Object.keys(SupportedFormat.openapi).join(', ');
    const compatAsyncAPI = Object.keys(SupportedFormat.asyncapi).join(', ');

    const errorMsgs = [
      `Unsupported API specification (${message})`,
      `Please try again with an OpenAPI ${compatOpenAPI} or AsyncAPI ${compatAsyncAPI} format.`,
    ];

    super(errorMsgs.join('\n'));
  }
}

class API {
  readonly filepath: string;
  readonly definition: APIDefinition;
  readonly references: APIReference[];
  readonly version: string;
  readonly specName: string;
  readonly spec?: SpecSchema;

  constructor(filepath: string, $refs: $RefParser.$Refs) {
    this.filepath = filepath;
    this.references = [];

    const definition = this.resolveContent($refs);

    if (
      typeof definition.openapi === 'string' ||
      typeof definition.swagger === 'string'
    ) {
      this.specName = 'OpenAPI';
      this.version = (definition.openapi || definition.swagger) as string;
      this.definition = (definition as unknown) as OpenAPI;
      this.spec = SupportedFormat.openapi[this.versionWithoutPatch()];
    } else if (typeof definition.asyncapi === 'string') {
      this.specName = 'AsyncAPI';
      this.version = definition.asyncapi;
      this.definition = (definition as unknown) as AsyncAPI;
      this.spec = SupportedFormat.asyncapi[this.version];
    } else {
      throw new UnsupportedFormat();
    }

    if (this.spec === undefined) {
      throw new UnsupportedFormat(`${this.specName} ${this.version}`);
    }
  }

  versionWithoutPatch(): string {
    const [major, minor] = this.version.split('.', 3);

    return `${major}.${minor}.x`;
  }

  resolveContent($refs: $RefParser.$Refs): JSONSchema4Object | JSONSchema6Object {
    const paths = $refs.paths();
    let mainReference;
    let absPath = paths.shift();

    while (typeof absPath !== 'undefined') {
      if (absPath.includes(this.filepath)) {
        mainReference = absPath;
      } else {
        const content = $refs.get(absPath);

        if (!content) {
          throw new UnsupportedFormat('Reference ${absPath} is empty');
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        /* The internals of the $RefParser doesn't have types exposed */
        /* thus the need to cast 'as any' to be able to dig into the obj */
        const refType = ($refs as any)._$refs[absPath].pathType;
        /* Resolve all reference paths to the main api definition file */
        const location: string =
          refType === 'file'
            ? path.relative(path.dirname(this.filepath), absPath)
            : absPath;

        this.references.push({
          location,
          content,
        });
      }
      absPath = paths.shift();
    }

    if (typeof mainReference === 'undefined') {
      throw new UnsupportedFormat(
        "JSON Schema $ref parser couldn't parse the main definition",
      );
    }

    const content = $refs.get(mainReference);

    if (!content || !(content instanceof Object) || !('info' in content)) {
      throw new UnsupportedFormat(
        "Definition needs to be an object with at least an 'info' key",
      );
    }

    return content;
  }

  static async loadAPI(path: string): Promise<API> {
    return $RefParser
      .resolve(path, {
        parse: { json: true },
        dereference: { circular: false },
      })
      .then(($refs) => {
        return new API(path, $refs);
      })
      .catch((err: Error) => {
        throw new CLIError(err);
      });
  }
}

type APIReference = {
  location: string;
  content: JSONSchema4Type | JSONSchema6Type;
};

type APIDefinition = OpenAPI | AsyncAPI;

// http://spec.openapis.org/oas/v3.1.0#oasObject
interface OpenAPI {
  readonly openapi?: string;
  readonly swagger?: string;
  readonly info: string;
}

// https://www.asyncapi.com/docs/specifications/2.0.0#A2SObject
interface AsyncAPI {
  readonly asyncapi: string;
  readonly info: string;
}

export { API };

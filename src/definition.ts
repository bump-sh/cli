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
  readonly location: string;
  readonly definition: APIDefinition;
  readonly references: APIReference[];
  readonly version: string;
  readonly specName: string;
  readonly spec?: SpecSchema;

  constructor(location: string, $refs: $RefParser.$Refs) {
    this.location = location;
    this.references = [];

    const definition = this.resolveContent($refs);

    if (API.isOpenAPI(definition)) {
      this.specName = 'OpenAPI';
      this.version = (definition.openapi || definition.swagger) as string;
      this.definition = definition;
      this.spec = SupportedFormat.openapi[this.versionWithoutPatch()];
    } else if (API.isAsyncAPI(definition)) {
      this.specName = 'AsyncAPI';
      this.version = definition.asyncapi;
      this.definition = definition;
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

  /* Resolve reference absolute paths to the main api location when possible */
  resolveRelativeLocation(absPath: string): string {
    const url = (location: string): Location | { hostname: string } => {
      try {
        return new URL(location);
      } catch {
        return { hostname: '' };
      }
    };
    const definitionUrl = url(this.location);
    const refUrl = url(absPath);

    if (
      absPath.match(/^\//) ||
      (absPath.match(/^https?:\/\//) && definitionUrl.hostname === refUrl.hostname)
    ) {
      return path.relative(path.dirname(this.location), absPath);
    } else {
      return absPath;
    }
  }

  resolveContent($refs: $RefParser.$Refs): JSONSchema4Object | JSONSchema6Object {
    const paths = $refs.paths();
    let mainReference;
    let absPath = paths.shift();

    while (typeof absPath !== 'undefined') {
      if (absPath === this.location || absPath === path.resolve(this.location)) {
        mainReference = absPath;
      } else {
        const content = $refs.get(absPath);

        if (!content) {
          throw new UnsupportedFormat('Reference ${absPath} is empty');
        }

        this.references.push({
          location: this.resolveRelativeLocation(absPath),
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

  static isOpenAPI(
    definition: JSONSchema4Object | JSONSchema6Object,
  ): definition is OpenAPI {
    return (
      typeof definition.openapi === 'string' || typeof definition.swagger === 'string'
    );
  }

  static isAsyncAPI(
    definition: JSONSchema4Object | JSONSchema6Object,
  ): definition is AsyncAPI {
    return 'asyncapi' in definition;
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
type OpenAPI = JSONSchema4Object & {
  readonly openapi?: string;
  readonly swagger?: string;
  readonly info: string;
};

// https://www.asyncapi.com/docs/specifications/2.0.0#A2SObject
type AsyncAPI = JSONSchema4Object & {
  readonly asyncapi: string;
  readonly info: string;
};

export { API };

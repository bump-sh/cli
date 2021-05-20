import { CLIError } from '@oclif/errors';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { defaults } from '@apidevtools/json-schema-ref-parser/lib/options';
import asyncapi from '@asyncapi/specs';
import {
  JSONSchema4,
  JSONSchema4Object,
  JSONSchema6,
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
  readonly rawDefinition: string;
  readonly definition: APIDefinition;
  readonly references: APIReference[];
  readonly version: string;
  readonly specName: string;
  readonly spec?: SpecSchema;

  constructor(location: string, $refs: $RefParser.$Refs) {
    this.location = location;
    this.references = [];

    const [raw, parsed] = this.resolveContent($refs);
    this.rawDefinition = raw as string;

    this.definition = parsed;
    this.specName = this.getSpecName(parsed);
    this.version = this.getVersion(parsed);
    this.spec = this.getSpec(parsed);

    if (this.spec === undefined) {
      throw new UnsupportedFormat(`${this.specName} ${this.version}`);
    }
  }

  getSpec(definition: APIDefinition): Record<string, unknown> {
    if (API.isAsyncAPI(definition)) {
      return SupportedFormat.asyncapi[this.version];
    } else {
      return SupportedFormat.openapi[this.versionWithoutPatch()];
    }
  }

  getSpecName(definition: APIDefinition): string {
    if (API.isAsyncAPI(definition)) {
      return 'AsyncAPI';
    } else {
      return 'OpenAPI';
    }
  }

  getVersion(definition: APIDefinition): string {
    if (API.isAsyncAPI(definition)) {
      return definition.asyncapi;
    } else {
      return (definition.openapi || definition.swagger) as string;
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

  resolveContent($refs: $RefParser.$Refs): [string, APIDefinition] {
    const paths = $refs.paths();
    let mainReference;
    let absPath = paths.shift();

    while (typeof absPath !== 'undefined') {
      if (absPath === this.location || absPath === path.resolve(this.location)) {
        mainReference = absPath;
      } else {
        // $refs.get is not properly typed so we need to force it
        // with the resulting type of our custom defined parser
        const { raw } = $refs.get(absPath) as JSONSchemaWithRaw;

        if (!raw) {
          throw new UnsupportedFormat('Reference ${absPath} is empty');
        }

        this.references.push({
          location: this.resolveRelativeLocation(absPath),
          content: raw,
        });
      }
      absPath = paths.shift();
    }

    if (typeof mainReference === 'undefined') {
      throw new UnsupportedFormat(
        "JSON Schema $ref parser couldn't parse the main definition",
      );
    }

    // $refs.get is not properly typed so we need to force it
    // with the resulting type of our custom defined parser
    const { raw, parsed } = $refs.get(mainReference) as JSONSchemaWithRaw;

    if (!parsed || !(parsed instanceof Object) || !('info' in parsed)) {
      throw new UnsupportedFormat(
        "Definition needs to be an object with at least an 'info' key",
      );
    }

    if (!API.isOpenAPI(parsed) && !API.isAsyncAPI(parsed)) {
      throw new UnsupportedFormat();
    }

    return [raw, parsed];
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
    const JSONParser = defaults.parse.json;
    const YAMLParser = defaults.parse.yaml;
    // We override the default parsers from $RefParser to be able
    // to keep the raw content of the files parsed
    const withRawTextParser = (
      parser: $RefParser.ParserOptions,
    ): $RefParser.ParserOptions => {
      return {
        ...parser,
        parse: async (file: $RefParser.FileInfo): Promise<JSONSchemaWithRaw> => {
          const parsed = (await parser.parse(file)) as JSONSchema4 | JSONSchema6;
          return { parsed, raw: defaults.parse.text.parse(file) };
        },
      };
    };

    return $RefParser
      .resolve(path, {
        parse: {
          json: withRawTextParser(JSONParser),
          yaml: withRawTextParser(YAMLParser),
        },
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

type JSONSchemaWithRaw = {
  readonly parsed: JSONSchema4 | JSONSchema6;
  readonly raw: string;
};

type APIReference = {
  location: string;
  content: string;
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

import { CLIError } from '@oclif/errors';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { defaults } from '@apidevtools/json-schema-ref-parser/lib/options';
import asyncapi from '@asyncapi/specs';
import {
  JSONSchema4,
  JSONSchema4Object,
  JSONSchema4Array,
  JSONSchema6,
  JSONSchema6Object,
  JSONSchema7,
} from 'json-schema';
import path from 'path';

type SpecSchema = JSONSchema4 | JSONSchema6 | JSONSchema7;

class SupportedFormat {
  static readonly openapi: Record<string, SpecSchema> = {
    '2.0': require('oas-schemas/schemas/v2.0/schema.json'),
    '3.0': require('oas-schemas/schemas/v3.0/schema.json'),
    '3.1': require('oas-schemas/schemas/v3.1/schema.json'),
  };
  static readonly asyncapi: Record<string, SpecSchema> = {
    '2.0': asyncapi.schemas['2.0.0'],
    '2.1': asyncapi.schemas['2.1.0'],
    '2.2': asyncapi.schemas['2.2.0'],
    '2.3': asyncapi.schemas['2.3.0'],
    '2.4': asyncapi.schemas['2.4.0'],
    '2.5': asyncapi.schemas['2.5.0'],
    '2.6': asyncapi.schemas['2.6.0'],
  };
}

class UnsupportedFormat extends CLIError {
  constructor(message = '') {
    const compatOpenAPI = Object.keys(SupportedFormat.openapi).join(', ');
    const compatAsyncAPI = Object.keys(SupportedFormat.asyncapi).join(', ');

    const errorMsgs = [
      `Unsupported API specification (${message})`,
      `Please try again with an OpenAPI ${compatOpenAPI} or AsyncAPI ${compatAsyncAPI} file.`,
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

  getSpec(definition: APIDefinition): SpecSchema {
    if (API.isAsyncAPI(definition)) {
      return SupportedFormat.asyncapi[this.versionWithoutPatch()];
    } else if (API.isOpenAPIOverlay(definition)) {
      return { overlay: { type: 'string' } };
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

    return `${major}.${minor}`;
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
      absPath.match(/^\//) || // Unix style filesystem path
      absPath.match(/^[a-zA-Z]+\:\\/) || // Windows style filesystem path
      (absPath.match(/^https?:\/\//) && definitionUrl.hostname === refUrl.hostname) // Same domain URLs
    ) {
      return path.relative(path.dirname(this.location), absPath);
    } else {
      return absPath;
    }
  }

  resolveContent($refs: $RefParser.$Refs): [string, APIDefinition] {
    const values = $refs.values();
    let mainReference: JSONSchemaWithRaw = { parsed: {}, raw: '' };

    for (const [absPath, reference] of Object.entries(values)) {
      if (absPath === this.location || absPath === path.resolve(this.location)) {
        // $refs.values is not properly typed so we need to force it
        // with the resulting type of our custom defined parser
        mainReference = reference as JSONSchemaWithRaw;
      } else {
        // $refs.values is not properly typed so we need to force it
        // with the resulting type of our custom defined parser
        const { raw } = reference as JSONSchemaWithRaw;

        if (!raw) {
          throw new UnsupportedFormat('Reference ${absPath} is empty');
        }

        this.references.push({
          location: this.resolveRelativeLocation(absPath),
          content: raw,
        });
      }
    }

    const { raw, parsed } = mainReference;

    if (!parsed || !(parsed instanceof Object) || !('info' in parsed)) {
      throw new UnsupportedFormat(
        "Definition needs to be an object with at least an 'info' key",
      );
    }

    if (
      !API.isOpenAPI(parsed) &&
      !API.isAsyncAPI(parsed) &&
      !API.isOpenAPIOverlay(parsed)
    ) {
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

  static isOpenAPIOverlay(
    definition: JSONSchema4Object | JSONSchema6Object,
  ): definition is OpenAPIOverlay {
    return 'overlay' in definition;
  }

  public extractDefinition(): [string, APIReference[]] {
    const references = [];

    for (let i = 0; i < this.references.length; i++) {
      const reference = this.references[i];
      references.push({
        location: reference.location,
        content: reference.content,
      });
    }

    return [this.rawDefinition, references];
  }

  static async load(path: string): Promise<API> {
    const JSONParser = defaults.parse.json;
    const YAMLParser = defaults.parse.yaml;
    const TextParser = defaults.parse.text;
    // We override the default parsers from $RefParser to be able
    // to keep the raw content of the files parsed
    const withRawTextParser = (
      parser: $RefParser.ParserOptions,
    ): $RefParser.ParserOptions => {
      return {
        ...parser,
        parse: async (file: $RefParser.FileInfo): Promise<JSONSchemaWithRaw> => {
          const parsed = (await parser.parse(file)) as JSONSchema4 | JSONSchema6;
          return { parsed, raw: TextParser.parse(file) };
        },
      };
    };

    return $RefParser
      .resolve(path, {
        parse: {
          json: withRawTextParser(JSONParser),
          yaml: withRawTextParser(YAMLParser),
          text: {
            ...TextParser,
            parse: async (file: $RefParser.FileInfo): Promise<JSONSchemaWithRaw> => {
              const parsed = await TextParser.parse(file);
              return { parsed, raw: parsed };
            },
            canParse: ['.md', '.markdown'],
            encoding: 'utf8',
          },
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

type APIDefinition = OpenAPI | AsyncAPI | OpenAPIOverlay;

// http://spec.openapis.org/oas/v3.1.0#oasObject
type OpenAPI = JSONSchema4Object & {
  readonly openapi?: string;
  readonly swagger?: string;
  readonly info: string;
};

type OpenAPIOverlay = JSONSchema4Object & {
  readonly overlay: string;
  readonly info: string;
  readonly actions: JSONSchema4Array;
};

// https://www.asyncapi.com/docs/specifications/2.0.0#A2SObject
type AsyncAPI = JSONSchema4Object & {
  readonly asyncapi: string;
  readonly info: string;
};

export { API, APIDefinition, OpenAPIOverlay, SupportedFormat };

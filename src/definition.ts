import {default as $RefParser, getJsonSchemaRefParserDefaultOptions} from '@apidevtools/json-schema-ref-parser'
import asyncapi from '@asyncapi/specs'
import {CLIError} from '@oclif/core/errors'
import {safeStringify} from '@stoplight/yaml'
import debug from 'debug'
import {
  JSONSchema4,
  JSONSchema4Array,
  JSONSchema4Object,
  JSONSchema6,
  JSONSchema6Object,
  JSONSchema7,
} from 'json-schema'
import {createRequire} from 'node:module'
import {default as nodePath} from 'node:path'

// Used to require JSON files
const require = createRequire(import.meta.url)

import {Overlay} from './core/overlay.js'

type SpecSchema = JSONSchema4 | JSONSchema6 | JSONSchema7

class SupportedFormat {
  static readonly asyncapi: Record<string, SpecSchema> = {
    '2.0': asyncapi.schemas['2.0.0'],
    '2.1': asyncapi.schemas['2.1.0'],
    '2.2': asyncapi.schemas['2.2.0'],
    '2.3': asyncapi.schemas['2.3.0'],
    '2.4': asyncapi.schemas['2.4.0'],
    '2.5': asyncapi.schemas['2.5.0'],
    '2.6': asyncapi.schemas['2.6.0'],
  }

  static readonly openapi: Record<string, SpecSchema> = {
    '2.0': require('oas-schemas/schemas/v2.0/schema.json'),
    '3.0': require('oas-schemas/schemas/v3.0/schema.json'),
    '3.1': require('oas-schemas/schemas/v3.1/schema.json'),
  }
}

class UnsupportedFormat extends CLIError {
  constructor(message = '') {
    const compatOpenAPI = Object.keys(SupportedFormat.openapi).join(', ')
    const compatAsyncAPI = Object.keys(SupportedFormat.asyncapi).join(', ')

    const errorMsgs = [
      `Unsupported API specification (${message})`,
      `Please try again with an OpenAPI ${compatOpenAPI} or AsyncAPI ${compatAsyncAPI} file.`,
    ]

    super(errorMsgs.join('\n'))
  }
}

class API {
  readonly definition: APIDefinition
  readonly location: string
  overlayedDefinition: APIDefinition | undefined
  readonly rawDefinition: string
  readonly references: APIReference[]
  readonly spec?: SpecSchema
  readonly specName: string
  readonly version: string

  constructor(location: string, values: SpecSchema) {
    this.location = location
    this.references = []

    const [raw, parsed] = this.resolveContent(values)
    this.rawDefinition = raw as string

    this.definition = parsed
    this.specName = this.getSpecName(parsed)
    this.version = this.getVersion(parsed)
    this.spec = this.getSpec(parsed)

    if (this.spec === undefined) {
      throw new UnsupportedFormat(`${this.specName} ${this.version}`)
    }
  }

  static isAsyncAPI(definition: JSONSchema4Object | JSONSchema6Object): definition is AsyncAPI {
    return 'asyncapi' in definition
  }

  static isOpenAPI(definition: JSONSchema4Object | JSONSchema6Object): definition is OpenAPI {
    return typeof definition.openapi === 'string' || typeof definition.swagger === 'string'
  }

  static isOpenAPIOverlay(definition: JSONSchema4Object | JSONSchema6Object): definition is OpenAPIOverlay {
    return 'overlay' in definition
  }

  static async load(path: string): Promise<API> {
    const {json, text, yaml} = getJsonSchemaRefParserDefaultOptions().parse
    // Not sure why the lib types the parser as potentially
    // “undefined”, hence the forced typing in the following consts.
    const TextParser = text as $RefParser.Plugin
    const JSONParser = json as $RefParser.Plugin
    const YAMLParser = yaml as $RefParser.Plugin
    // We override the default parsers from $RefParser to be able
    // to keep the raw content of the files parsed
    const withRawTextParser = (parser: $RefParser.Plugin): $RefParser.Plugin => ({
      ...parser,
      async parse(file: $RefParser.FileInfo): Promise<JSONSchemaWithRaw> {
        if (typeof parser.parse === 'function' && typeof TextParser.parse === 'function') {
          const parsed = (await parser.parse(file)) as JSONSchema4 | JSONSchema6
          return {parsed, raw: TextParser.parse(file) as string}
        }

        // Not sure why the lib states that Plugin.parse can be a
        // scalar number | string (on not only a callable function)
        return {}
      },
    })

    return $RefParser
      .resolve(path, {
        dereference: {circular: false},
        parse: {
          json: withRawTextParser(JSONParser),
          text: {
            ...TextParser,
            canParse: ['.md', '.markdown'],
            encoding: 'utf8',
            async parse(file: $RefParser.FileInfo): Promise<JSONSchemaWithRaw> {
              if (typeof TextParser.parse === 'function') {
                const parsed = (await TextParser.parse(file)) as string
                return {parsed, raw: parsed}
              }

              // Not sure why the lib states that Plugin.parse can be a
              // scalar number | string (on not only a callable function)
              return {}
            },
          },
          yaml: withRawTextParser(YAMLParser),
        },
      })
      .then(($refs) => {
        const values = $refs.values()
        return new API(path, values)
      })
      .catch((error: Error) => {
        throw new CLIError(error)
      })
  }

  public async applyOverlay(overlayPath: string): Promise<void> {
    const overlay = await API.load(overlayPath)
    const overlayDefinition = overlay.definition

    if (!API.isOpenAPIOverlay(overlayDefinition)) {
      throw new Error(`${overlayPath} does not look like an OpenAPI overlay`)
    }

    this.overlayedDefinition = await new Overlay().run(this.definition, overlayDefinition)
  }

  public extractDefinition(outputPath?: string): [string, APIReference[]] {
    const references = []

    for (let i = 0; i < this.references.length; i++) {
      const reference = this.references[i]
      references.push({
        content: reference.content,
        location: reference.location,
      })
    }

    return [this.serializeDefinition(outputPath), references]
  }

  getSpec(definition: APIDefinition): SpecSchema {
    if (API.isAsyncAPI(definition)) {
      return SupportedFormat.asyncapi[this.versionWithoutPatch()]
    }

    if (API.isOpenAPIOverlay(definition)) {
      return {overlay: {type: 'string'}}
    }

    return SupportedFormat.openapi[this.versionWithoutPatch()]
  }

  getSpecName(definition: APIDefinition): string {
    if (API.isAsyncAPI(definition)) {
      return 'AsyncAPI'
    }

    return 'OpenAPI'
  }

  getVersion(definition: APIDefinition): string {
    if (API.isAsyncAPI(definition)) {
      return definition.asyncapi
    }

    return (definition.openapi || definition.swagger) as string
  }

  guessFormat(output?: string): string {
    return (output || this.location).endsWith('.json') ? 'json' : 'yaml'
  }

  isMainRefPath(path: string): boolean {
    // $refs from json-schema-ref-parser lib returns posix style
    // paths. We need to make sure we compare all paths in posix style
    // independently of the platform runtime.
    const resolvedAbsLocation = nodePath
      .resolve(this.location)
      .split(nodePath?.win32?.sep)
      .join(nodePath?.posix?.sep ?? '/')

    return path === this.location || path === resolvedAbsLocation
  }

  resolveContent(values: SpecSchema): [string, APIDefinition] {
    let mainReference: JSONSchemaWithRaw = {parsed: {}, raw: ''}

    for (const [absPath, reference] of Object.entries(values)) {
      if (this.isMainRefPath(absPath)) {
        // $refs.values is not properly typed so we need to force it
        // with the resulting type of our custom defined parser
        mainReference = reference as JSONSchemaWithRaw
      } else {
        // $refs.values is not properly typed so we need to force it
        // with the resulting type of our custom defined parser
        const {raw} = reference as JSONSchemaWithRaw

        if (!raw) {
          throw new UnsupportedFormat(`Reference ${absPath} is empty`)
        }

        this.references.push({
          content: raw,
          location: this.resolveRelativeLocation(absPath),
        })
      }
    }

    const {parsed, raw} = mainReference

    if (!parsed || !raw || !(parsed instanceof Object) || !('info' in parsed)) {
      debug('bump-cli:definition')(
        `Main location (${this.location}) not found or empty (within ${JSON.stringify(Object.keys(values))})`,
      )
      throw new UnsupportedFormat("Definition needs to be an object with at least an 'info' key")
    }

    if (!API.isOpenAPI(parsed) && !API.isAsyncAPI(parsed) && !API.isOpenAPIOverlay(parsed)) {
      throw new UnsupportedFormat()
    }

    return [raw, parsed]
  }

  /* Resolve reference absolute paths to the main api location when possible */
  resolveRelativeLocation(absPath: string): string {
    const definitionUrl = this.url()
    const refUrl = this.url(absPath)

    if (
      (refUrl.hostname === '' && // filesystem path
        (/^\//.test(absPath) || // Unix style
          /^[A-Za-z]+:[/\\]/.test(absPath))) || // Windows style
      (/^https?:\/\//.test(absPath) && definitionUrl.hostname === refUrl.hostname) // Same domain URLs
    ) {
      const relativeLocation = nodePath.relative(nodePath.dirname(this.location), absPath)
      debug('bump-cli:definition')(`Resolved relative $ref location: ${relativeLocation}`)
      return relativeLocation
    }

    return absPath
  }

  serializeDefinition(outputPath?: string): string {
    if (this.overlayedDefinition) {
      return this.guessFormat(outputPath) === 'json'
        ? JSON.stringify(this.overlayedDefinition)
        : safeStringify(this.overlayedDefinition)
    }

    return this.rawDefinition
  }

  versionWithoutPatch(): string {
    const [major, minor] = this.version.split('.', 3)

    return `${major}.${minor}`
  }

  private url(location: string = this.location): {hostname: string} | Location {
    try {
      return new URL(location)
    } catch {
      return {hostname: ''}
    }
  }
}

type JSONSchemaWithRaw = {
  readonly parsed?: JSONSchema4 | JSONSchema6 | string
  readonly raw?: string
}

type APIReference = {
  content: string
  location: string
}

type APIDefinition = AsyncAPI | OpenAPI | OpenAPIOverlay

type InfoObject = {
  readonly description?: string
  readonly title: string
  readonly version: string
}

// http://spec.openapis.org/oas/v3.1.0#oasObject
type OpenAPI = {
  readonly info: InfoObject
  readonly openapi?: string
  readonly swagger?: string
} & JSONSchema4Object

type OpenAPIOverlay = {
  readonly actions: JSONSchema4Array
  readonly info: InfoObject
  readonly overlay: string
} & JSONSchema4Object

// https://www.asyncapi.com/docs/specifications/2.0.0#A2SObject
type AsyncAPI = {
  readonly asyncapi: string
  readonly info: InfoObject
} & JSONSchema4Object

export {API, APIDefinition, OpenAPIOverlay, SupportedFormat}

import {default as $RefParser, getJsonSchemaRefParserDefaultOptions} from '@apidevtools/json-schema-ref-parser'
import asyncapi from '@asyncapi/specs'
import {CLIError} from '@oclif/core/errors'
import {parseWithPointers, safeStringify} from '@stoplight/yaml'
import debug from 'debug'
import {
  JSONSchema4,
  JSONSchema4Array,
  JSONSchema4Object,
  JSONSchema6,
  JSONSchema6Object,
  JSONSchema7,
} from 'json-schema'
import {default as nodePath} from 'node:path'

import {Overlay} from './core/overlay.js'
import arazzoSchemas from './core/schemas/arazzo-schemas/index.js'
import flowerSchemas from './core/schemas/flower-schemas/index.js'
import openapiSchemas from './core/schemas/oas-schemas/index.js'

type JSONSchema = JSONSchema4 | JSONSchema6 | JSONSchema7

class SupportedFormat {
  static readonly arazzo: Record<string, JSONSchema> = arazzoSchemas.schemas

  static readonly asyncapi: Record<string, JSONSchema> = {
    '2.0': asyncapi.schemas['2.0.0'],
    '2.1': asyncapi.schemas['2.1.0'],
    '2.2': asyncapi.schemas['2.2.0'],
    '2.3': asyncapi.schemas['2.3.0'],
    '2.4': asyncapi.schemas['2.4.0'],
    '2.5': asyncapi.schemas['2.5.0'],
    '2.6': asyncapi.schemas['2.6.0'],
  }

  static readonly flower: Record<string, JSONSchema> = flowerSchemas.schemas

  static readonly openapi: Record<string, JSONSchema> = openapiSchemas.schemas
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
  readonly specName?: string
  readonly version?: string

  constructor(location: string, data: Record<string, JSONSchemaWithRaw>) {
    this.location = location

    const [raw, parsed, references] = this._resolveContentFrom(data)
    this.references = references || []
    this.rawDefinition = raw as string
    this.definition = parsed

    this.specName = this.getSpecName(parsed)
    this.version = this.getVersion(parsed)

    if (!this.getSpec(parsed)) {
      throw new UnsupportedFormat(`${this.specName} ${this.version}`)
    }
  }

  static isArazzo(definition: JSONSchema4Object | JSONSchema6Object): definition is Arazzo {
    return 'arazzo' in definition
  }

  static isAsyncAPI(definition: JSONSchema4Object | JSONSchema6Object): definition is AsyncAPI {
    return 'asyncapi' in definition
  }

  static isFlower(definition: JSONSchema4Object | JSONSchema6Object): definition is Flower {
    return 'flower' in definition
  }

  static isOpenAPI(definition: JSONSchema4Object | JSONSchema6Object): definition is OpenAPI {
    return typeof definition.openapi === 'string' || typeof definition.swagger === 'string'
  }

  static isOpenAPIOverlay(definition: JSONSchema4Object | JSONSchema6Object): definition is OpenAPIOverlay {
    return 'overlay' in definition
  }

  static isSupportedFormat(definition: JSONSchema4Object | JSONSchema6Object): definition is APIDefinition {
    return (
      API.isOpenAPI(definition) ||
      API.isAsyncAPI(definition) ||
      API.isOpenAPIOverlay(definition) ||
      API.isFlower(definition) ||
      API.isArazzo(definition)
    )
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
        // JSON schema refs parser lib doesn't type the output of this
        // method well (it types it as a generic JSON schema) where as
        // it builds a Map of string (the path/URLs of each reference)
        // to JSONSchema (the reference value)
        //
        // We also change the reference values in our custom parsers
        // defined above to include the raw values which gets “widen”
        // by the lib. We thus need to force the type output to a more
        // precise type.
        const data = $refs.values() as Record<string, JSONSchemaWithRaw>
        return new API(path, data)
      })
      .catch((error: Error) => {
        throw new CLIError(error)
      })
  }

  public async applyOverlay(overlayPath: string): Promise<void> {
    const overlay = await API.load(overlayPath)
    const overlayDefinition = overlay.definition
    const currentDefinition = this.overlayedDefinition || this.definition

    if (!API.isOpenAPIOverlay(overlayDefinition)) {
      throw new Error(`${overlayPath} does not look like an OpenAPI overlay`)
    }

    for (const reference of overlay.references) {
      // Keep overlay reference data only if there's no existing refs with the same location
      if (this.references.every((existing) => existing.location !== reference.location)) {
        this.references.push(reference)
      }
    }
    this.overlayedDefinition = await new Overlay().run(currentDefinition, overlayDefinition)
  }

  public async extractDefinition(
    outputPath?: string,
    overlays?: string[] | undefined,
  ): Promise<[string, APIReference[]]> {
    if (overlays) {
      /* eslint-disable no-await-in-loop */
      // Alternatively we can apply all overlays in parallel
      // https://stackoverflow.com/questions/48957022/unexpected-await-inside-a-loop-no-await-in-loop
      for (const overlayFile of overlays) {
        debug('bump-cli:definition')(`Applying overlay (${overlayFile}) to definition (location: ${this.location})`)
        await this.applyOverlay(overlayFile)
      }
      /* eslint-enable no-await-in-loop */
    }

    const references = []

    for (let i = 0; i < this.references.length; i++) {
      const {content, location, name} = this.references[i]
      references.push({content, location, name})
    }

    return [this.serializeDefinition(outputPath), references]
  }

  getSpec(definition: APIDefinition): JSONSchema | undefined {
    if (API.isArazzo(definition)) {
      return SupportedFormat.arazzo[this.versionWithoutPatch()]
    }

    if (API.isAsyncAPI(definition)) {
      return SupportedFormat.asyncapi[this.versionWithoutPatch()]
    }

    if (API.isOpenAPIOverlay(definition)) {
      return {overlay: {type: 'string'}}
    }

    if (API.isFlower(definition)) {
      return SupportedFormat.flower[this.versionWithoutPatch()]
    }

    if (API.isOpenAPI(definition)) {
      return SupportedFormat.openapi[this.versionWithoutPatch()]
    }

    return undefined
  }

  getSpecName(definition: APIDefinition): string | undefined {
    if (API.isArazzo(definition)) {
      return 'Arazzo'
    }
    if (API.isAsyncAPI(definition)) {
      return 'AsyncAPI'
    }
    if (API.isFlower(definition)) {
      return 'Flower'
    }
    if (API.isOpenAPIOverlay(definition)) {
      return 'OpenAPIOverlay'
    }
    if (API.isOpenAPI(definition)) {
      return 'OpenAPI'
    }

    return undefined
  }

  getVersion(definition: APIDefinition): string | undefined {
    if (API.isArazzo(definition)) {
      return definition.arazzo
    }

    if (API.isAsyncAPI(definition)) {
      return definition.asyncapi
    }

    if (API.isFlower(definition)) {
      return definition.flower
    }

    if (API.isOpenAPIOverlay(definition)) {
      return definition.overlay
    }

    if (API.isOpenAPI(definition)) {
      return (definition.openapi || definition.swagger) as string
    }

    return undefined
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

  serializeDefinition(outputPath?: string): string {
    if (this.overlayedDefinition) {
      const {comments} = parseWithPointers(this.rawDefinition, {attachComments: true})
      const dumpOptions = {comments, lineWidth: Number.POSITIVE_INFINITY, noRefs: true}
      return this.guessFormat(outputPath) === 'json'
        ? JSON.stringify(this.overlayedDefinition)
        : safeStringify(this.overlayedDefinition, dumpOptions)
    }

    return this.rawDefinition
  }

  versionWithoutPatch(): string {
    if (!this.version) {
      return ''
    }
    const [major, minor] = this.version.split('.', 3)

    return `${major}.${minor}`
  }

  private _resolveContentFrom(data: Record<string, JSONSchemaWithRaw>): [string, APIDefinition, APIReference[]] {
    let definition: JSONSchema | string | undefined
    let rawDefinition: string | undefined
    const references: APIReference[] = []

    // data contains all refs as a map of paths/URLs and their
    // correspond values
    for (const [absPath, reference] of Object.entries(data)) {
      if (this.isMainRefPath(absPath)) {
        ;({parsed: definition, raw: rawDefinition} = reference)
      } else {
        if (!reference.raw) {
          throw new UnsupportedFormat(`Reference ${absPath} is empty`)
        }

        references.push({
          content: reference.raw,
          location: this._resolveRelativeLocation(absPath),
        })
      }
    }

    if (
      !definition ||
      !rawDefinition ||
      !(definition instanceof Object) ||
      !('info' in definition || 'flower' in definition)
    ) {
      debug('bump-cli:definition')(
        `Main location (${this.location}) not found or empty (within ${JSON.stringify(Object.keys(data))})`,
      )
      throw new UnsupportedFormat('Definition needs to be a valid Object')
    }

    if (!API.isSupportedFormat(definition)) {
      throw new UnsupportedFormat()
    }

    return [rawDefinition, definition, references]
  }

  /* Resolve reference paths to the main api location when possible */
  private _resolveRelativeLocation(path: string): string {
    const definitionUrl = this.url()
    const refUrl = this.url(path)
    const unixStyle: boolean = /^\//.test(path)
    const windowsStyle: boolean = /^[A-Za-z]+:[/\\]/.test(path)
    const isUrl = /^https?:\/\//.test(path)

    // Guard: Absolute URL on different domain we return an untouched
    // path
    if (isUrl && definitionUrl.hostname !== refUrl.hostname) {
      return path
    }

    const isAbsolutePath: boolean = refUrl.hostname === '' && (unixStyle || windowsStyle)
    // Absolute path or URL on **same domain**
    const isAbsolute: boolean = isAbsolutePath || isUrl

    const relativeLocation: string = isAbsolute
      ? nodePath.relative(nodePath.dirname(this.location), path)
      : nodePath.join(nodePath.dirname(this.location), path)

    debug('bump-cli:definition')(`Resolved relative $ref location: ${relativeLocation}`)
    return relativeLocation
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
  readonly parsed?: JSONSchema4 | JSONSchema4Object | JSONSchema6 | JSONSchema6Object | string
  readonly raw?: string
}

type APIReference = {
  content: string
  location: string
}

type APIDefinition = Arazzo | AsyncAPI | Flower | OpenAPI | OpenAPIOverlay

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

type Flower = {
  readonly flower: string
} & JSONSchema4Object

type Arazzo = {
  readonly arazzo: string
  readonly info: InfoObject
} & JSONSchema4Object

export {API, APIDefinition, OpenAPI, OpenAPIOverlay, SupportedFormat}

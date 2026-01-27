import type {JSONSchema7} from 'json-schema'

// All spec version definitions are copied from the official
// spec repo https://spec.openapis.org/oas/
import schemaV01 from './v0.1/schema.json' with {type: 'json'}

export default {
  schemas: {
    '0.1': schemaV01 as JSONSchema7,
  },
}

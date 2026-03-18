import type {JSONSchema7} from 'json-schema'

// Spec definitions are copied from the official
// spec repo https://spec.openapis.org/arazzo/
import schemaV10 from './v1.0/schema.json' with {type: 'json'}

export default {
  schemas: {
    '1.0': schemaV10 as JSONSchema7,
  },
}

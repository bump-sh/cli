import type {JSONSchema7} from 'json-schema'

// Spec definitions are copied from the official
// spec repo https://spec.openapis.org/arazzo/
import schemaV10 from './v1.0/schema.json' with {type: 'json'}
import schemaV11 from './v1.1/schema.json' with {type: 'json'}

export default {
  schemas: {
    '1.0': schemaV10 as JSONSchema7,
    '1.1': schemaV11 as JSONSchema7,
  },
}

import type {JSONSchema7} from 'json-schema'

import schemaV01 from './v0.1/schema.json' with {type: 'json'}

export default {
  schemas: {
    '0.1': schemaV01 as JSONSchema7,
  },
}

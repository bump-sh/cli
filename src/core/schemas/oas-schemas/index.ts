import type {JSONSchema4, JSONSchema7} from 'json-schema'

import schemaV20 from './v2.0/schema.json' with {type: 'json'}
import schemaV30 from './v3.0/schema.json' with {type: 'json'}
import schemaV31 from './v3.1/schema.json' with {type: 'json'}
import schemaV32 from './v3.2/schema.json' with {type: 'json'}

export default {
  schemas: {
    '2.0': schemaV20 as JSONSchema4,
    '3.0': schemaV30 as JSONSchema4,
    '3.1': schemaV31 as JSONSchema7,
    '3.2': schemaV32 as JSONSchema7,
  },
}

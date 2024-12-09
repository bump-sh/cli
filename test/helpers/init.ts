import path from 'node:path'

process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json')
process.env.BUMP_HOST = 'bump.sh'

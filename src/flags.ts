import {Flags, Interfaces} from '@oclif/core'

// Custom flags for bump-cli
const doc = Flags.custom<string>({
  char: 'd',
  async default(): Promise<string | undefined> {
    const envDoc = process.env.BUMP_ID
    if (envDoc) return envDoc
    // Search doc id in .bump/config.json file?
  },
  description: 'Documentation public id or slug. Can be provided via BUMP_ID environment variable',
})

const docName = Flags.custom<string>({
  char: 'n',
  dependsOn: ['auto-create'],
  description: 'Documentation name. Used with --auto-create flag.',
})

const hub = Flags.custom<string>({
  char: 'b',
  async default(): Promise<string | undefined> {
    const envHub = process.env.BUMP_HUB_ID
    if (envHub) return envHub
    // Search hub id in .bump/config.json file?
  },
  description: 'Hub id or slug. Can be provided via BUMP_HUB_ID environment variable',
})

const filenamePattern = Flags.custom<string>({
  default: '{slug}-api',
  description: `Pattern to extract the documentation slug from filenames when deploying a DIRECTORY. Pattern uses only '*' and '{slug}' as special characters to extract the slug from a filename without extension. Used with --hub flag only.`,
})

const branch = Flags.custom<string>({
  char: 'B',
  async default(): Promise<string | undefined> {
    const envBranch = process.env.BUMP_BRANCH_NAME
    if (envBranch) return envBranch
  },
  description: 'Branch name. Can be provided via BUMP_BRANCH_NAME environment variable',
})

const token = Flags.custom<string>({
  char: 't',
  async default(): Promise<string | undefined> {
    const envToken = process.env.BUMP_TOKEN
    if (envToken) return envToken
  },
  description: 'Documentation or Hub token. Can be provided via BUMP_TOKEN environment variable',
  required: true,
})

const autoCreate = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    ...opts,
    dependsOn: ['hub'],
    description:
      'Automatically create the documentation if needed (only available with a --hub flag). Documentation name can be provided with --doc-name flag. Default: false',
  })
}

const interactive = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    ...opts,
    dependsOn: ['hub'],
    description:
      "Interactively create a configuration file to deploy a Hub (only available with a --hub flag). This will start an interactive process if you don't have a CLI configuration file. Default: false",
  })
}

const dryRun = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    ...opts,
    description:
      'Validate a new documentation version. Does everything a normal deploy would do except publishing the new version. Useful in automated environments such as test platforms or continuous integration. Default: false',
  })
}

const open = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    ...opts,
    char: 'o',
    default: false,
  })
}

const failOnBreaking = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    ...opts,
    char: 'F',
    async default(): Promise<boolean> {
      const envCi = process.env.CI
      if (envCi) {
        return true
      }

      return false
    },
    description:
      'Fail when diff contains a breaking change. Defaults to false locally. In CI environments where the env variable CI=1 is set, it defaults to true.',
  })
}

const live = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    ...opts,
    char: 'l',
    default: false,
  })
}

const format = Flags.custom<string>({
  char: 'f',
  default: 'text',
  description: 'Format in which to provide the diff result',
  options: ['text', 'markdown', 'json', 'html'],
})

const expires = Flags.custom<string>({
  char: 'e',
  description:
    "Specify a longer expiration date for public diffs (defaults to 1 day). Use iso8601 format to provide a date, or you can use `--expires 'never'` to keep the result live indefinitely.",
})

const out = Flags.custom<string>({
  char: 'o',
  description: 'Output file path',
})

const overlay = Flags.custom<string[]>({
  char: 'o',
  description: 'Path or URL of overlay file(s) to apply before deploying',
  multiple: true,
})

export {
  autoCreate,
  branch,
  doc,
  docName,
  dryRun,
  expires,
  failOnBreaking,
  filenamePattern,
  format,
  hub,
  interactive,
  live,
  open,
  out,
  overlay,
  token,
}

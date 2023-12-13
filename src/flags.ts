import { flags } from '@oclif/command';
import * as Parser from '@oclif/parser';

// Re-export oclif flags https://oclif.io/docs/flags
export * from '@oclif/command/lib/flags';

// Custom flags for bump-cli
const doc = flags.build({
  char: 'd',
  description:
    'Documentation public id or slug. Can be provided via BUMP_ID environment variable',
  default: () => {
    const envDoc = process.env.BUMP_ID;
    if (envDoc) return envDoc;
    // Search doc id in .bump/config.json file?
  },
});

const docName = flags.build({
  char: 'n',
  description: 'Documentation name. Used with --auto-create flag.',
  dependsOn: ['auto-create'],
});

const hub = flags.build({
  char: 'b',
  description: 'Hub id or slug. Can be provided via BUMP_HUB_ID environment variable',
  default: () => {
    const envHub = process.env.BUMP_HUB_ID;
    if (envHub) return envHub;
    // Search hub id in .bump/config.json file?
  },
});

const filenamePattern = flags.build({
  description: `Pattern to extract the documentation slug from filenames when deploying a DIRECTORY. Pattern uses only '*' and '{slug}' as special characters to extract the slug from a filename without extension. Used with --hub flag only.`,
  default: '{slug}-api',
});

const branch = flags.build({
  char: 'B',
  description: 'Branch name. Can be provided via BUMP_BRANCH_NAME environment variable',
  default: () => {
    const envBranch = process.env.BUMP_BRANCH_NAME;
    if (envBranch) return envBranch;
  },
});

const token = flags.build({
  char: 't',
  required: true,
  description:
    'Documentation or Hub token. Can be provided via BUMP_TOKEN environment variable',
  default: () => {
    const envToken = process.env.BUMP_TOKEN;
    if (envToken) return envToken;
  },
});

const autoCreate = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    description:
      'Automatically create the documentation if needed (only available with a --hub flag). Documentation name can be provided with --doc-name flag. Default: false',
    dependsOn: ['hub'],
    ...options,
  });
};

const interactive = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    description:
      "Interactively create a configuration file to deploy a Hub (only available with a --hub flag). This will start an interactive process if you don't have a CLI configuration file. Default: false",
    dependsOn: ['hub'],
    ...options,
  });
};

const dryRun = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    description:
      'Validate a new documentation version. Does everything a normal deploy would do except publishing the new version. Useful in automated environments such as test platforms or continuous integration. Default: false',
    ...options,
  });
};

const open = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    char: 'o',
    default: false,
    ...options,
  });
};

const failOnBreaking = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    char: 'F',
    description: 'Fail when diff contains a breaking change',
    default: () => {
      const envCi = process.env.CI;
      if (envCi) {
        return true;
      } else {
        return false;
      }
    },
    ...options,
  });
};

const live = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    char: 'l',
    default: false,
    ...options,
  });
};

const format = flags.build({
  char: 'f',
  description: 'Format in which to provide the diff result',
  default: 'text',
  options: ['text', 'markdown', 'json', 'html'],
});

const expires = flags.build({
  char: 'e',
  description:
    "Specify a longer expiration date for public diffs (defaults to 1 day). Use iso8601 format to provide a date, or you can use `--expires 'never'` to keep the result live indefinitely.",
});

const out = flags.build({
  char: 'o',
  description: 'Output file path',
});

export {
  doc,
  docName,
  hub,
  branch,
  token,
  autoCreate,
  interactive,
  filenamePattern,
  dryRun,
  open,
  failOnBreaking,
  live,
  format,
  expires,
  out,
};

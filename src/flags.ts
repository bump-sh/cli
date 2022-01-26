import { flags } from '@oclif/command';
import * as Parser from '@oclif/parser';

// Re-export oclif flags https://oclif.io/docs/flags
export * from '@oclif/command/lib/flags';

// Custom flags for bum-cli
const doc = flags.build({
  char: 'd',
  required: true,
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

export { doc, docName, hub, token, autoCreate, dryRun, open, live, format };

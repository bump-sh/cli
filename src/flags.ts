import { flags } from '@oclif/command';
import * as Parser from '@oclif/parser';

// Re-export oclif flags https://oclif.io/docs/flags
export * from '@oclif/command/lib/flags';

// Custom flags for bum-cli
const doc = flags.build({
  char: 'd',
  description: 'Documentation public id or slug, default: ""',
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
  description: 'Hub id or slug',
  default: () => {
    const envHub = process.env.BUMP_HUB_ID;
    if (envHub) return envHub;
    // Search hub id in .bump/config.json file?
  },
});

const token = flags.build({
  char: 't',
  description: 'Documentation or Hub token, default: ""',
});

const autoCreate = (options = {}): Parser.flags.IBooleanFlag<boolean> => {
  return flags.boolean({
    description:
      'Automatically create the documentation if needed (only available with a --hub and when specifying a name for documentation --doc-name), default: false',
    dependsOn: ['hub', 'doc-name'],
    ...options,
  });
};

export { doc, docName, hub, token, autoCreate };

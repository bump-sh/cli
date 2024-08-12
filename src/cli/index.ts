import { CliUx } from '@oclif/core';

import success from './styled/success';

type Levels = 'info' | 'debug';

if (process.env.BUMP_LOG_LEVEL) {
  const logLevel: string = process.env.BUMP_LOG_LEVEL;
  CliUx.config['outputLevel'] = logLevel as Levels;
}
const cli = {
  ...CliUx.ux,
  get styledSuccess(): typeof success {
    return success;
  },
};

export { cli };

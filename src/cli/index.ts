import cliUx from 'cli-ux';

import success from './styled/success';

type Levels = 'info' | 'debug';

if (process.env.BUMP_LOG_LEVEL) {
  const logLevel: string = process.env.BUMP_LOG_LEVEL;
  cliUx.config['outputLevel'] = logLevel as Levels;
}
const cli = {
  ...cliUx,
  get styledSuccess(): typeof success {
    return success;
  },
};

export { cli };

import { CLIError } from '@oclif/errors';
import * as p from '@clack/prompts';

export const confirm = async (message = 'Continue?'): Promise<void> => {
  const prompt = await p.group(
    {
      shouldContinue: () => p.confirm({ message: message }),
    },
    {
      onCancel: () => {
        p.cancel('Cancelled.');
        process.exit(0);
      },
    },
  );

  if (!prompt.shouldContinue) {
    throw new CLIError(`Cancelled`);
  }

  return;
};

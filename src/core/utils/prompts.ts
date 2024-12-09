import * as p from '@clack/prompts'
import {ExitError} from '@oclif/core/errors'

export const confirm = async (message = 'Continue?'): Promise<boolean> => {
  const prompt = await p.group(
    {
      shouldContinue: () => p.confirm({message}),
    },
    {
      onCancel() {
        p.cancel('Cancelled.')
        throw new ExitError(1)
      },
    },
  )

  return prompt.shouldContinue
}

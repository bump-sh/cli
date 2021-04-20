import { expect, test } from '@oclif/test';
import nock from 'nock';

nock.disableNetConnect();

describe('validate subcommand', () => {
  test
    .stdout()
    .command(['validate', 'FILE'])
    .catch((err) => {
      expect(err.message).to.contain('no such file or directory');
      throw err;
    })
    .exit(2)
    .it('Tries to validate given file', ({ stdout }) => {
      expect(stdout).to.contain('Validating FILE');
    });

  test
    .stdout()
    .command(['validate', 'examples/invalid/openapi.yml'])
    .catch((err) => {
      expect(err.message).to.contain('Unsupported API specification');
      throw err;
    })
    .exit(2)
    .it('Displays an error on invalid definition file', ({ stdout }) => {
      expect(stdout).to.contain('Validating examples/invalid/openapi.yml');
    });

  test
    .stdout()
    .command(['validate'])
    .catch((err) => {
      expect(err.message).to.contain('Missing 1 required arg');
      throw err;
    })
    .exit(2)
    .it('exits with status 2 when no file args provided', ({ stdout }) => {
      expect(stdout).to.equal('');
    });
});

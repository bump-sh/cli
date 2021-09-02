import base, { expect } from '@oclif/test';
import nock from 'nock';
import * as sinon from 'sinon';
import Command from '../../src/command';

nock.disableNetConnect();

const test = base.env({ BUMP_TOKEN: 'BAR' });

describe('diff subcommand', () => {
  let pollingStub: sinon.SinonStub;
  beforeEach(() => {
    pollingStub = sinon.stub(Command.prototype, 'pollingPeriod');
    pollingStub.get(() => 0);
  });

  afterEach(() => {
    pollingStub.restore();
  });

  describe('Successful runs', () => {
    test
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/versions')
          .once()
          .reply(201, { id: '123', doc_public_url: 'http://localhost/doc/1' })
          .get('/api/v1/versions/123')
          .once()
          .reply(202)
          .get('/api/v1/versions/123')
          .once()
          .reply(200, { diff_summary: 'Updated: POST /versions' });
      })
      .stdout()
      .stderr()
      .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
      .it('asks for a diff to Bump', async ({ stdout, stderr }) => {
        expect(stderr).to.match(/Let's compare the given definition file/);
        expect(stdout).to.contain('Updated: POST /versions');
      });

    test
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/versions')
          .once()
          .reply(201, { id: '123', doc_public_url: 'http://localhost/doc/1' })
          .post('/api/v1/versions', (body) => body.previous_version_id === '123')
          .once()
          .reply(201, { id: '321', doc_public_url: 'http://localhost/doc/1' })
          .get('/api/v1/versions/321')
          .once()
          .reply(202)
          .get('/api/v1/versions/321')
          .once()
          .reply(200, { diff_summary: 'Updated: POST /versions' });
      })
      .stdout()
      .stderr()
      .command([
        'diff',
        'examples/valid/openapi.v3.json',
        'examples/valid/openapi.v2.json',
        '--doc',
        'coucou',
      ])
      .it('asks for a diff between the two files to Bump', async ({ stdout, stderr }) => {
        expect(stderr).to.match(/Let's compare the two given definition files/);
        expect(stdout).to.contain('Updated: POST /versions');
      });

    test
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/versions')
          .once()
          .reply(201, { id: '123', doc_public_url: 'http://localhost/doc/1' })
          .get('/api/v1/versions/123')
          .once()
          .reply(200, {});
      })
      .stdout()
      .stderr()
      .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
      .it('asks for a diff with content change only', async ({ stdout, stderr }) => {
        expect(stderr).to.match(/Let's compare the given definition file/);
        expect(stderr).to.contain('no structural changes in your new definition');
        expect(stdout).to.eq('');
      });

    test
      .nock('https://bump.sh', (api) => {
        api.post('/api/v1/versions').once().reply(204, {});
      })
      .stdout()
      .stderr()
      .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
      .it('notifies an unchanged definition', async ({ stdout, stderr }) => {
        expect(stderr).to.match(/Let's compare the given definition file/);
        expect(stderr).to.contain('Your documentation has not changed');
        expect(stdout).to.eq('');
      });
  });

  describe('Server errors', () => {
    describe('Authentication error', () => {
      test
        .nock('https://bump.sh', (api) => api.post('/api/v1/versions').reply(401))
        .stdout()
        .stderr()
        .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
        .catch((err) => {
          expect(err.message).to.contain('not allowed to deploy');
          throw err;
        })
        .exit(101)
        .it("Doesn't create a diff version");
    });

    describe('Not found error', () => {
      test
        .nock('https://bump.sh', (api) => api.post('/api/v1/versions').reply(404))
        .stdout()
        .stderr()
        .command(['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
        .catch((err) => {
          expect(err.message).to.contain(
            "It seems the documentation provided doesn't exist",
          );
          throw err;
        })
        .exit(104)
        .it("Doesn't create a diff version");
    });

    describe('Timeout reached while polling for results', () => {
      test
        .nock('https://bump.sh', (api) => {
          api
            .post('/api/v1/versions')
            .once()
            .reply(201, { id: '123', doc_public_url: 'http://localhost/doc/1' })
            .get('/api/v1/versions/123')
            .times(31)
            .reply(202);
        })
        .stdout()
        .stderr()
        .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
        .catch((err) => {
          expect(err.message).to.contain(
            'We were unable to compute your documentation diff',
          );
          throw err;
        })
        .exit(2)
        .it('asks for a diff to Bump', async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Let's compare the given definition file/);
          expect(stdout).to.eq('');
        });
    });
  });

  describe('User bad usages', () => {
    test
      .command(['diff', 'FILE', '--doc', 'coucou'])
      .catch((err) => expect(err.message).to.match(/no such file or directory/))
      .it('Fails diff of an inexistant file');

    test
      .command(['diff'])
      .exit(2)
      .it('exits with status 2 when no file argument is provided');

    test
      .command(['diff', 'examples/valid/openapi.v3.json'])
      .catch((err) => expect(err.message).to.match(/missing required flag(.|\n)+--doc/im))
      .it('fails when no documentation id or slug is provided');

    test
      .env({ BUMP_TOKEN: '' }, { clear: true })
      .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
      .catch((err) =>
        expect(err.message).to.match(/missing required flag(.|\n)+--token/im),
      )
      .it('fails when no access token is provided');
  });
});

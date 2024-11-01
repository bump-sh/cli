import base, { expect } from '@oclif/test';
import nock from 'nock';
import * as sinon from 'sinon';
import { Diff } from '../../lib/core/diff';

nock.disableNetConnect();

const test = base.env({ BUMP_TOKEN: 'BAR' });

describe('diff subcommand', () => {
  let pollingStub: sinon.SinonStub;
  beforeEach(() => {
    pollingStub = sinon.stub(Diff.prototype, 'pollingPeriod');
    pollingStub.get(() => 0);
  });

  afterEach(() => {
    pollingStub.restore();
  });

  describe('Successful runs', () => {
    test
      .nock('https://bump.sh', (api) => {
        api
          .post(
            '/api/v1/versions',
            (body) => body.documentation === 'coucou' && !body.branch_name,
          )
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
      .it(
        'asks for a diff to Bump and returns the newly created version',
        async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Comparing the given definition file/);
          expect(stdout).to.contain('Updated: POST /versions');
        },
      );

    test
      .nock('https://bump.sh', (api) => {
        api
          .post(
            '/api/v1/versions',
            (body) => body.documentation === 'coucou' && !body.branch_name,
          )
          .once()
          .reply(201, { id: '123', doc_public_url: 'http://localhost/doc/1' })
          .get('/api/v1/versions/123')
          .once()
          .reply(202)
          .get('/api/v1/versions/123')
          .once()
          .reply(200, { diff_details: [] });
      })
      .stdout()
      .stderr()
      .command([
        'diff',
        'examples/valid/openapi.v3.json',
        '--doc',
        'coucou',
        '--format',
        'json',
      ])
      .it(
        'asks for a diff to Bump and returns the newly created version (no content change)',
        async ({ stdout, stderr }) => {
          expect(stderr).to.eq('');
          expect(stdout).to.contain('[]');
        },
      );

    test
      .nock('https://bump.sh', (api) => {
        api
          .post(
            '/api/v1/versions',
            (body) => body.documentation === 'coucou' && body.branch_name === 'next',
          )
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
      .command([
        'diff',
        'examples/valid/openapi.v3.json',
        '--doc',
        'coucou',
        '--branch',
        'next',
      ])
      .it(
        'asks for a diff to Bump on given branch and returns the newly created version',
        async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Comparing the given definition file/);
          expect(stdout).to.contain('Updated: POST /versions');
        },
      );

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
        expect(stderr).to.match(/Comparing the two given definition files/);
        expect(stdout).to.contain('Updated: POST /versions');
      });

    test
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/versions')
          .once()
          .reply(204)
          .post('/api/v1/versions')
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
      .it(
        'asks for a diff between the two files to Bump even when first file has no changes compared to currently deployed version',
        async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Comparing the two given definition files/);
          expect(stdout).to.contain('Updated: POST /versions');
        },
      );

    test
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/versions')
          .once()
          .reply(201, { id: '321', doc_public_url: 'http://localhost/doc/1' })
          .post('/api/v1/versions')
          .once()
          .reply(204);
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
      .it(
        "doesn't display any diff when second file has no changes",
        async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Comparing the two given definition files/);
          expect(stdout).to.not.contain('Updated: POST /versions');
        },
      );

    test
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/diffs')
          .once()
          .reply(201, {
            id: '321abc',
            public_url: 'http://localhost/preview/321abc',
          })
          .get('/api/v1/diffs/321abc?formats[]=text')
          .once()
          .reply(202)
          .get('/api/v1/diffs/321abc?formats[]=text')
          .once()
          .reply(200, { diff_summary: 'Updated: POST /versions' });
      })
      .stdout()
      .stderr()
      .command([
        'diff',
        'examples/valid/openapi.v3.json',
        'examples/valid/openapi.v2.json',
      ])
      .it(
        'asks for a public diff between the two files to Bump',
        async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Comparing the two given definition files/);
          expect(stdout).to.contain('Updated: POST /versions');
        },
      );

    base
      .env({ CI: '1' })
      .nock('https://bump.sh', (api) => {
        api
          .post('/api/v1/diffs')
          .once()
          .reply(201, {
            id: '321abc',
            public_url: 'http://localhost/preview/321abc',
          })
          .get('/api/v1/diffs/321abc?formats[]=text')
          .once()
          .reply(202)
          .get('/api/v1/diffs/321abc?formats[]=text')
          .once()
          .reply(200, { diff_summary: 'Updated: POST /versions', diff_breaking: true });
      })
      .stdout()
      .stderr()
      .command([
        'diff',
        'examples/valid/openapi.v3.json',
        'examples/valid/openapi.v2.json',
      ])
      .exit(1)
      .it(
        'asks for a public diff between the two files to Bump and exit 1 due to breaking change',
        async ({ stdout, stderr }) => {
          expect(stderr).to.match(/Comparing the two given definition files/);
          expect(stdout).to.contain('Updated: POST /versions');
        },
      );

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
        expect(stderr).to.match(/Comparing the given definition file/);
        expect(stdout).to.contain('No structural changes detected.');
      });

    test
      .nock('https://bump.sh', (api) => {
        api.post('/api/v1/versions').once().reply(204, {});
      })
      .stdout()
      .stderr()
      .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
      .it('notifies an unchanged definition', async ({ stdout, stderr }) => {
        expect(stderr).to.match(/Comparing the given definition file/);
        expect(stdout).to.contain('No changes detected.');
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
            .times(121)
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
          expect(stderr).to.match(/Comparing the given definition file/);
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
      .catch((err) =>
        expect(err.message).to.match(/Please provide a second file argument or login/im),
      )
      .it('fails when no documentation id or slug is provided');

    test
      .env({ BUMP_TOKEN: '' }, { clear: true })
      .command(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'])
      .catch((err) =>
        expect(err.message).to.match(/Please provide a second file argument or login/im),
      )
      .it('fails when no access token is provided');
  });
});

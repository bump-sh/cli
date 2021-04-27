import { expect, test } from '@oclif/test';
import nock from 'nock';

nock.disableNetConnect();

describe('preview subcommand', () => {
  describe('Successful preview', () => {
    test
      .nock('https://bump.sh', (api) =>
        api.post('/api/v1/previews').reply(200, {
          id: '123abc-cba321',
          expires_at: new Date(),
          public_url: 'https://bump.sh/preview/123abc-cba321',
        }),
      )
      .stdout()
      .stderr()
      .command(['preview', 'examples/valid/openapi.v3.json'])
      .it('Creates a preview from an openapi file', ({ stdout, stderr }) => {
        expect(stderr).to.match(/Let's render a preview on Bump... done/);

        expect(stdout).to.match(/preview is visible at/);
        expect(stdout).to.match(/https:\/\/bump.sh\/preview\/123abc-cba321/);
      });

    test
      .nock('http://example.org', (api) => {
        api
          .get('/param-lights.json')
          .replyWithFile(200, 'examples/valid/params/lights.json', {
            'Content-Type': 'application/json',
          });
      })
      .nock('https://bump.sh', (api) => {
        api.post('/api/v1/previews').reply(200, {
          id: '123abc-cba321',
          expires_at: new Date(),
          public_url: 'https://bump.sh/preview/123abc-cba321',
        });
      })
      .stdout()
      .stderr()
      .command(['preview', 'examples/valid/asyncapi.v2.yml'])
      .it('Creates a preview from an asyncapi file with $refs', ({ stdout, stderr }) => {
        expect(stderr).to.match(/Let's render a preview on Bump... done/);

        expect(stdout).to.match(/preview is visible at/);
        expect(stdout).to.match(/https:\/\/bump.sh\/preview\/123abc-cba321/);
      });
  });

  describe('Server errors', () => {
    describe('Validation error', () => {
      test
        .nock('https://bump.sh', (api) =>
          api.post('/api/v1/previews').reply(422, {
            message: 'Invalid definition file',
            errors: {
              raw_definition: 'failed schema #: "openapi" wasn\'t supplied.',
            },
          }),
        )
        .stderr()
        .stdout()
        .command(['preview', 'examples/valid/openapi.v3.json'])
        .catch((err) => {
          expect(err.message).to.contain('"openapi" wasn\'t supplied.');
          throw err;
        })
        .exit(122)
        .it('Fails with an error message from the API response', ({ stdout }) => {
          expect(stdout).to.not.match(/preview is visible at/);
        });
    });

    describe('Server internal error', () => {
      test
        .nock('https://bump.sh', (api) => api.post('/api/v1/previews').reply(500))
        .stderr()
        .stdout()
        .command(['preview', 'examples/valid/openapi.v3.json'])
        .catch((err) => {
          expect(err.message).to.contain('Unhandled API error (status: 500)');
          throw err;
        })
        .exit(100)
        .it('Fails rendering and displays a generic error', ({ stdout }) => {
          expect(stdout).to.not.match(/preview is visible at/);
        });
    });
  });

  describe('User bad usages', () => {
    test
      .command(['preview', 'FILE'])
      .catch((err) => expect(err.message).to.match(/no such file or directory/))
      .it('Fails previewing an inexistant file');

    test
      .command(['preview'])
      // checks to ensure the command exits with status 2
      .exit(2)
      .it('exits with status 2 when no file argument is provided');
  });
});

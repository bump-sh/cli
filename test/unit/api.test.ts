import * as os from 'os';
import * as path from 'path';
import * as sinon from 'sinon';
import base, { expect } from '@oclif/test';
import * as Config from '@oclif/config';
import nock from 'nock';
import chalk from 'chalk';

import { BumpApi } from '../../src/api/index.js';
import { PreviewRequest } from '../../src/api/models.js';

nock.disableNetConnect();
const root = path.join(__dirname, '../../');
const test = base.add('config', () => Config.load(root));
// Force no colors in output messages
chalk.level = 0;

describe('BumpApi HTTP client class', () => {
  describe('nominal authenticated API call', () => {
    const matchAuthorizationHeader = sinon.spy(sinon.stub().returns(true));

    test
      .nock(
        'https://bump.sh',
        {
          reqheaders: {
            Authorization: matchAuthorizationHeader,
          },
        },
        (api) => api.post('/api/v1/versions').reply(201, {}),
      )
      .do(
        async (ctx) =>
          await new BumpApi(ctx.config).postVersion(
            { documentation: 'hello', definition: '' },
            'my-secret-token',
          ),
      )
      .it('sends valid Authorization headers', async () => {
        expect(matchAuthorizationHeader.firstCall.args[0]).to.equal(
          'Basic bXktc2VjcmV0LXRva2Vu',
        );
      });
  });

  describe('Customizing the API client with env variables', () => {
    const matchUserAgentHeader = sinon.spy(sinon.stub().returns(true));

    test
      .env(
        { BUMP_HOST: 'http://localhost', BUMP_USER_AGENT: 'ua-extra-content' },
        { clear: true },
      )
      .nock(
        'http://localhost',
        {
          reqheaders: {
            'User-Agent': matchUserAgentHeader,
          },
        },
        (api) => api.post('/api/v1/versions').reply(201, {}),
      )
      .do(
        async (ctx) =>
          await new BumpApi(ctx.config).postVersion(
            {
              documentation: 'hello',
              definition: '',
            },
            'token',
          ),
      )
      .it('sends User-Agent with custom content', async () => {
        expect(matchUserAgentHeader.firstCall.args[0]).to.match(
          new RegExp(
            `^bump-cli/([0-9\.]+)(-[a-z]+)? ${os.platform()}-${os.arch()} node-v[0-9\.]+ ua-extra-content$`,
          ),
        );
      });
  });

  describe('Handling HTTP errors', () => {
    test
      .nock('https://bump.sh', (api) =>
        api.post('/api/v1/previews').reply(422, {
          errors: {
            documentation: {
              slug: 'is invalid',
            },
            references: [{ location: 'not a filepath' }, { content: 'is invalid' }],
            param: ['invalid', 'too small', 'wrong'],
          },
        }),
      )
      .do(
        async (ctx) =>
          await new BumpApi(ctx.config).postPreview({
            definition: '{}',
          } as PreviewRequest),
      )
      .catch(
        (err) => {
          expect(err.message).to.match(/documentation.slug is invalid/);
          expect(err.message).to.match(
            /references 0.location not a filepath, 1.content is invalid/,
          );

          expect(err.message).to.match(/param invalid, too small, wrong/);
        },
        { raiseIfNotThrown: false },
      )
      .it('displays error information to the user');
  });
});

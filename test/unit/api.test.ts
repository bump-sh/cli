import * as os from 'os';
import * as sinon from 'sinon';
import base, { expect } from '@oclif/test';
import * as Config from '@oclif/config';
import nock from 'nock';

import { BumpApi } from '../../src/api';
import { PreviewRequest } from '../../src/api/models';

nock.disableNetConnect();
const test = base.add('config', () => Config.load());

describe('BumpApi HTTP client class', () => {
  describe('nominal authenticated API call', () => {
    const matchUserAgentHeader = sinon.spy(sinon.stub().returns(true));
    const matchAuthorizationHeader = sinon.spy(sinon.stub().returns(true));

    test
      .nock(
        'https://bump.sh',
        {
          reqheaders: {
            'User-Agent': matchUserAgentHeader,
            Authorization: matchAuthorizationHeader,
          },
        },
        (api) =>
          api.get('/api/v1/ping').reply(200, {
            pong: 'bonjour',
          }),
      )
      .do(async (ctx) => await new BumpApi(ctx.config, 'my-secret-token').getPing())
      .it('sends valid User-Agent & Authorization headers', async () => {
        expect(matchUserAgentHeader.firstCall.args[0]).to.match(
          new RegExp(`@oclif/test/([0-9\.]+) ${os.platform()}-${os.arch()}`),
        );

        expect(matchAuthorizationHeader.firstCall.args[0]).to.equal(
          'Basic bXktc2VjcmV0LXRva2Vu',
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

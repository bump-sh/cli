import {Config} from '@oclif/core'
import {expect} from 'chai'
import chalk from 'chalk'
import nock from 'nock'
import * as os from 'node:os'
import {spy, stub} from 'sinon'

import {BumpApi} from '../../src/api'
import {PreviewRequest} from '../../src/api/models'

nock.disableNetConnect()
// Force no colors in output messages
chalk.level = 0
// Default oclif config from root of repo
const config = await Config.load('../../')

describe('BumpApi HTTP client class', () => {
  describe('nominal authenticated API call', () => {
    it('sends valid Authorization headers', async () => {
      const matchAuthorizationHeader = spy(stub().returns(true))

      nock('https://bump.sh', {
        reqheaders: {
          Authorization: matchAuthorizationHeader,
        },
      })
        .post('/api/v1/versions')
        .reply(201, {})

      await new BumpApi(config).postVersion({definition: '', documentation: 'hello'}, 'my-secret-token')

      expect(matchAuthorizationHeader.firstCall.args[0]).to.equal('Basic bXktc2VjcmV0LXRva2Vu')
    })
  })

  describe('Customizing the API client with env variables', () => {
    it('sends User-Agent with custom content', async () => {
      // Create a stub for user agent header
      const matchUserAgentHeader = spy(stub().returns(true))

      // Mock env variables BUMP_HOST & BUMP_USER_AGENT
      process.env.BUMP_HOST = process.env.BUMP_HOST || ''
      process.env.BUMP_USER_AGENT = process.env.BUMP_USER_AGENT || ''
      const stubs = [
        stub(process.env, 'BUMP_HOST').value('http://localhost'),
        stub(process.env, 'BUMP_USER_AGENT').value('ua-extra-content'),
      ]

      // Mock HTTP request
      nock('http://localhost', {
        reqheaders: {
          'User-Agent': matchUserAgentHeader,
        },
      })
        .post('/api/v1/versions')
        .reply(201, {})

      // System under test
      await new BumpApi(config).postVersion(
        {
          definition: '',
          documentation: 'hello',
        },
        'token',
      )

      expect(matchUserAgentHeader.firstCall.args[0]).to.match(
        new RegExp(`^bump-cli/([0-9.]+)(-[a-z0-9.]+)? ${os.platform()}-${os.arch()} node-v[0-9.]+ ua-extra-content$`),
      )
      stubs.map((s) => s.restore())
    })
  })

  describe('Handling HTTP errors', () => {
    it('displays error information to the user', async () => {
      nock('https://bump.sh')
        .post('/api/v1/previews')
        .reply(422, {
          errors: {
            documentation: {
              slug: 'is invalid',
            },
            param: ['invalid', 'too small', 'wrong'],
            references: [{location: 'not a filepath'}, {content: 'is invalid'}],
          },
        })

      try {
        await new BumpApi(config).postPreview({
          definition: '{}',
        } as PreviewRequest)
      } catch (error) {
        const {message} = error as Error
        expect(message).to.match(/documentation.slug is invalid/)
        expect(message).to.match(/references 0.location not a filepath, 1.content is invalid/)

        expect(message).to.match(/param invalid, too small, wrong/)
      }
    })
  })
})

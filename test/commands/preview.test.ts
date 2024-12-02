import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'

nock.disableNetConnect()

describe('preview subcommand', () => {
  describe('Successful preview', () => {
    it('Creates a preview from an openapi file', async () => {
      nock('https://bump.sh').post('/api/v1/previews').reply(200, {
        expires_at: new Date(),
        id: '123abc-cba321',
        public_url: 'https://bump.sh/preview/123abc-cba321',
      })
      const {stderr, stdout} = await runCommand(['preview', 'examples/valid/openapi.v3.json'].join(' '))
      expect(stderr).to.match(/Let's render a preview on Bump.sh... done/)

      expect(stdout).to.match(/preview is visible at/)
      expect(stdout).to.match(/https:\/\/bump.sh\/preview\/123abc-cba321/)
    })

    /* Since oclif v4 I couldn't find a way to end the waiting command
     * It seems with oclif/test v1 the command was signaled to stop,
     * but right now if you try to run the following test the mocha
     * process runs forever...
     */
    // it('Creates a live preview and waits for file update', async () => {
    //   nock('https://bump.sh').post('/api/v1/previews').reply(201, {
    //     expires_at: new Date(),
    //     id: '123abc-cba321',
    //     public_url: 'https://bump.sh/preview/123abc-cba321',
    //   })
    //   const {stderr, stdout} = await runCommand(['preview', '--live', 'examples/valid/openapi.v3.json'].join(' '))
    //   expect(stderr).to.match(/Let's render a preview on Bump.sh... done/)

    //   expect(stdout).to.match(/preview is visible at/)
    //   expect(stdout).to.match(/https:\/\/bump.sh\/preview\/123abc-cba321/)
    //   expect(stderr).to.match(/Waiting for changes on file/)
    // })

    it('Creates a preview from an asyncapi file with $refs', async () => {
      nock('http://example.org').get('/param-lights.json').replyWithFile(200, 'examples/valid/params/lights.json', {
        'Content-Type': 'application/json',
      })

      nock('https://bump.sh').post('/api/v1/previews').reply(200, {
        expires_at: new Date(),
        id: '123abc-cba321',
        public_url: 'https://bump.sh/preview/123abc-cba321',
      })

      const {stderr, stdout} = await runCommand(['preview', 'examples/valid/asyncapi.v2.yml'].join(' '))
      expect(stderr).to.match(/Let's render a preview on Bump.sh... done/)

      expect(stdout).to.match(/preview is visible at/)
      expect(stdout).to.match(/https:\/\/bump.sh\/preview\/123abc-cba321/)
    })
  })

  describe('Server errors', () => {
    describe('Validation error', () => {
      it('Fails with an error message from the API response', async () => {
        nock('https://bump.sh')
          .post('/api/v1/previews')
          .reply(422, {
            errors: {
              raw_definition: 'failed schema #: "openapi" wasn\'t supplied.',
            },
            message: 'Invalid definition file',
          })
        const {error, stdout} = await runCommand(['preview', 'examples/valid/openapi.v3.json'].join(' '))
        expect(error?.oclif?.exit).to.equal(122)
        expect(error?.message).to.contain('"openapi" wasn\'t supplied.')
        expect(stdout).to.not.match(/preview is visible at/)
      })
    })

    describe('Server internal error', () => {
      it('Fails rendering and displays a generic error', async () => {
        nock('https://bump.sh').post('/api/v1/previews').reply(500)

        const {error, stdout} = await runCommand(['preview', 'examples/valid/openapi.v3.json'].join(' '))
        expect(error?.oclif?.exit).to.equal(100)
        expect(error?.message).to.contain('Unhandled API error (status: 500)')
        expect(stdout).to.not.match(/preview is visible at/)
      })
    })
  })

  describe('User bad usages', () => {
    it('Fails previewing an inexistant file', async () => {
      const {error} = await runCommand(['preview', 'FILE'].join(' '))
      expect(error?.message).to.match(/no such file or directory/)
    })

    it('exits with status 2 when no file argument is provided', async () => {
      const {error} = await runCommand(['preview'].join(' '))
      // checks to ensure the command exits with status 2
      expect(error?.oclif?.exit).to.equal(2)
    })
  })
})

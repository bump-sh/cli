import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'
import {stub} from 'sinon'

nock.disableNetConnect()

process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || 'BAR'

describe('deploy subcommand', () => {
  describe('Successful runs', () => {
    it('sends new version to Bump with OpenAPI 3.2', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'moonwalk' && !body.branch_name)
        .reply(201, {doc_public_url: 'http://localhost/doc/1'})

      const {stderr, stdout} = await runCommand(
        ['deploy', 'examples/valid/openapi.v3.2.yml', '--doc', 'moonwalk'].join(' '),
      )
      expect(stderr).to.contain("Let's deploy on Bump.sh... done\n")
      expect(stdout).to.contain(
        'Your moonwalk documentation...has received a new deployment which will soon be ready at:',
      )
      expect(stdout).to.contain('http://localhost/doc/1')
    })

    it('sends new version to Bump', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && !body.branch_name)
        .reply(201, {doc_public_url: 'http://localhost/doc/1'})

      const {stderr, stdout} = await runCommand(
        ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '),
      )
      expect(stderr).to.contain("Let's deploy on Bump.sh... done\n")
      expect(stdout).to.contain(
        'Your coucou documentation...has received a new deployment which will soon be ready at:',
      )
      expect(stdout).to.contain('http://localhost/doc/1')
    })

    it('sends new version to Bump on given branch', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && body.branch_name === 'next')
        .reply(201, {doc_public_url: 'http://localhost/doc/1/next'})

      const {stdout} = await runCommand(
        ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou', '--branch', 'next'].join(' '),
      )
      expect(stdout).to.contain(
        'Your coucou documentation...has received a new deployment which will soon be ready at:\nhttp://localhost/doc/1/next',
      )
    })

    it('sends unchanged version to Bump', async () => {
      nock('https://bump.sh').post('/api/v1/versions').reply(204)

      const {stderr, stdout} = await runCommand(
        ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '),
      )
      expect(stdout).to.equal('')
      expect(stderr).to.contain("Let's deploy on Bump.sh... done\n")
      expect(stderr).to.contain('Warning: Your coucou documentation has not changed\n')
    })

    it('sends version to Bump with doc read from env variable', async () => {
      // Mock env variables BUMP_ID
      process.env.BUMP_ID = process.env.BUMP_ID || ''
      const stubs = []
      stubs.push(stub(process.env, 'BUMP_ID').value('coucou'))
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && !body.branch_name)
        .reply(201, {doc_public_url: 'http://localhost/doc/1'})

      const {stdout} = await runCommand(['deploy', 'examples/valid/openapi.v3.json'].join(' '))
      expect(stdout).to.contain('Your coucou documentation...has received a new deployment which will soon be ready')

      stubs.map((s) => s.restore())
    })

    describe('Successful dry-run deploy', () => {
      it('sends validation to Bump', async () => {
        nock('https://bump.sh').post('/api/v1/validations').reply(200)

        const {stdout} = await runCommand(
          ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou', '--dry-run'].join(' '),
        )
        expect(stdout).to.contain('Definition is valid')
      })

      it("doesn't try to auto create a documentation", async () => {
        nock('https://bump.sh')
          .post('/api/v1/validations', (body) => !body.auto_create_documentation)
          .reply(200)

        await runCommand(
          [
            'deploy',
            'examples/valid/openapi.v3.json',
            '--doc',
            'coucou',
            '--hub',
            'coucou',
            '--dry-run',
            '--auto-create',
          ].join(' '),
        )
      })
    })
  })

  describe('Successful runs on a directory', () => {
    it('sends new version to Bump', async () => {
      nock('https://bump.sh')
        .post(
          '/api/v1/versions',
          (body) =>
            // The “bump” slug is taken from the filename convention
            // in “bump-api.json”
            body.documentation === 'bump' && body.hub === 'my-hub' && !body.branch_name,
        )
        .reply(201, {doc_public_url: 'http://localhost/doc/1'})

      const {stdout} = await runCommand(['deploy', 'examples/valid/', '--hub', 'my-hub'].join(' '))
      expect(stdout).to.contain("We've found 1 valid API definitions to deploy")
      expect(stdout).to.contain('   └─ bump-api.json (OpenAPI spec version 3.0.2)')
      expect(stdout).to.contain(
        'Your bump documentation...has received a new deployment which will soon be ready at:\nhttp://localhost/doc/1',
      )
    })
  })

  describe('Successful runs with a URL', () => {
    it('sends new version to Bump', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && !body.branch_name)
        .reply(201, {doc_public_url: 'http://localhost/doc/1'})

      nock('https://developers.bump.sh')
        .get('/source.json')
        .replyWithFile(200, 'examples/valid/asyncapi.no-refs.v2.yml', {
          'Content-Type': 'application/json',
        })

      const {stdout} = await runCommand(
        ['deploy', 'https://developers.bump.sh/source.json', '--doc', 'coucou'].join(' '),
      )
      expect(stdout).to.contain(
        'Your coucou documentation...has received a new deployment which will soon be ready at:\nhttp://localhost/doc/1',
      )
    })
  })

  describe('Successful runs with overlays', () => {
    it('sends new version to Bump', async () => {
      nock('https://bump.sh')
        .post(
          '/api/v1/versions',
          (body) =>
            body.documentation === 'coucou' &&
            !body.branch_name &&
            body.definition.includes('Submit Feedback') &&
            body.definition.includes("Protect Earth's Tree Tracker"),
        )
        .reply(201, {doc_public_url: 'http://localhost/doc/123-with-overlays'})

      const {stderr, stdout} = await runCommand(
        [
          'deploy',
          'examples/valid/openapi.v3.json',
          '--doc',
          'coucou',
          '--overlay',
          'examples/valid/overlay.yaml',
          '--overlay',
          'examples/valid/overlay2.yaml',
        ].join(' '),
      )
      expect(stderr).to.contain("Let's deploy on Bump.sh... done\n")
      expect(stdout).to.contain(
        'Your coucou documentation...has received a new deployment which will soon be ready at:',
      )
      expect(stdout).to.contain('http://localhost/doc/123-with-overlays')
    })
  })

  describe('Successful runs with option preview', () => {
    it('sends new version to Bump and receive temporary version', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'tempy' && body.temporary)
        .reply(201, {doc_public_url: 'http://localhost/doc/1'})

      const {stderr, stdout} = await runCommand(
        ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'tempy', '--preview'].join(' '),
      )

      expect(stderr).to.contain("Let's preview on Bump.sh... done\n")
      expect(stdout).to.contain('Your tempy documentation...has received a new preview which will soon be ready at:')
      expect(stdout).to.contain('http://localhost/doc/1')
    })
  })

  describe('Server errors', () => {
    describe('Authentication error', () => {
      it("Doesn't create a deployed version", async () => {
        nock('https://bump.sh').post('/api/v1/versions').reply(401)

        const {error, stdout} = await runCommand(
          ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '),
        )
        expect(error?.message).to.contain('not allowed to deploy')
        expect(error?.oclif?.exit).to.equal(101)
        expect(stdout).to.not.contain(
          'Your coucou documentation...has received a new deployment which will soon be ready',
        )
      })
    })

    describe('Not found error', () => {
      it("Doesn't create a deployed version", async () => {
        nock('https://bump.sh').post('/api/v1/versions').reply(404)

        const {error, stdout} = await runCommand(
          ['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '),
        )
        expect(error?.message).to.contain("It seems the documentation provided doesn't exist")
        expect(error?.oclif?.exit).to.equal(104)
        expect(stdout).to.not.contain(
          'Your coucou documentation...has received a new deployment which will soon be ready',
        )
      })
    })

    describe('Invalid dry-run deploy', () => {
      it('warns user about the invalid version with details', async () => {
        nock('https://bump.sh').post('/api/v1/validations').reply(422)

        const {error} = await runCommand(
          ['deploy', 'examples/invalid/asyncapi.yml', '--doc', 'coucou', '--dry-run'].join(' '),
        )
        expect(error?.message).to.contain('Invalid definition file')
        expect(error?.oclif?.exit).to.equal(122)
      })
    })
  })

  describe('User bad usages', () => {
    it('Fails deploying an inexistant file', async () => {
      const {error} = await runCommand(['deploy', 'FILE', '--doc', 'coucou'].join(' '))
      expect(error?.message).to.match(/no such file or directory/)
      expect(error?.oclif?.exit).to.equal(2)
    })

    it('Fails deploying an inexistant directory', async () => {
      const {error} = await runCommand(['deploy', 'FILE', '--hub', 'coucou'].join(' '))
      expect(error?.message).to.match(/no such file or directory/)
      expect(error?.oclif?.exit).to.equal(2)
    })

    it('exits with status 2 when no file argument is provided', async () => {
      const {error} = await runCommand(['deploy'].join(' '))
      expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails when no documentation id or slug is provided', async () => {
      const {error} = await runCommand(['deploy', 'examples/valid/openapi.v3.json'].join(' '))
      expect(error?.message).to.contain('Missing required flag --doc=<slug>')
      expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails when no access token is provided', async () => {
      // Mock env variables BUMP_TOKEN
      process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || ''
      const stubs = []
      stubs.push(stub(process.env, 'BUMP_TOKEN').value(''))

      const {error} = await runCommand(['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
      expect(error?.message).to.contain('Missing required flag token')
      expect(error?.oclif?.exit).to.equal(2)

      stubs.map((s) => s.restore())
    })
  })
})

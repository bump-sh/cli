import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'
import {stub} from 'sinon'

nock.disableNetConnect()

process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || 'BAR'
process.env.BUMP_POLLING_PERIOD = '0'

describe('diff subcommand', () => {
  describe('Successful runs', () => {
    it('asks for a diff to Bump and returns the newly created version', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && !body.branch_name)
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '123'})
        .get('/api/v1/versions/123')
        .once()
        .reply(202)
        .get('/api/v1/versions/123')
        .once()
        .reply(200, {diff_summary: 'Updated: POST /versions'})

      const {stderr, stdout} = await runCommand(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
      expect(stderr).to.match(/Comparing the given definition file/)
      expect(stdout).to.contain('Updated: POST /versions')
    })

    it('asks for a diff to Bump and returns the newly created version (no content change)', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && !body.branch_name)
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '123'})
        .get('/api/v1/versions/123')
        .once()
        .reply(202)
        .get('/api/v1/versions/123')
        .once()
        .reply(200, {diff_details: []})

      const {stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou', '--format', 'json'].join(' '),
      )
      expect(stderr).to.eq('')
      expect(stdout).to.contain('[]')
    })

    it('asks for a diff to Bump on given branch and returns the newly created version', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions', (body) => body.documentation === 'coucou' && body.branch_name === 'next')
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '123'})
        .get('/api/v1/versions/123')
        .once()
        .reply(202)
        .get('/api/v1/versions/123')
        .once()
        .reply(200, {diff_summary: 'Updated: POST /versions'})

      const {stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou', '--branch', 'next'].join(' '),
      )
      expect(stderr).to.match(/Comparing the given definition file/)
      expect(stdout).to.contain('Updated: POST /versions')
    })

    it('asks for a diff between the two files to Bump', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions')
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '123'})
        .post('/api/v1/versions', (body) => body.previous_version_id === '123')
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '321'})
        .get('/api/v1/versions/321')
        .once()
        .reply(202)
        .get('/api/v1/versions/321')
        .once()
        .reply(200, {diff_summary: 'Updated: POST /versions'})

      const {stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', 'examples/valid/openapi.v2.json', '--doc', 'coucou'].join(' '),
      )
      expect(stderr).to.match(/Comparing the two given definition files/)
      expect(stdout).to.contain('Updated: POST /versions')
    })

    it('asks for a diff between the two files to Bump even when first file has no changes compared to currently deployed version', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions')
        .once()
        .reply(204)
        .post('/api/v1/versions')
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '321'})
        .get('/api/v1/versions/321')
        .once()
        .reply(202)
        .get('/api/v1/versions/321')
        .once()
        .reply(200, {diff_summary: 'Updated: POST /versions'})

      const {stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', 'examples/valid/openapi.v2.json', '--doc', 'coucou'].join(' '),
      )
      expect(stderr).to.match(/Comparing the two given definition files/)
      expect(stdout).to.contain('Updated: POST /versions')
    })

    it("doesn't display any diff when second file has no changes", async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions')
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '321'})
        .post('/api/v1/versions')
        .once()
        .reply(204)

      const {stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', 'examples/valid/openapi.v2.json', '--doc', 'coucou'].join(' '),
      )
      expect(stderr).to.match(/Comparing the two given definition files/)
      expect(stdout).to.not.contain('Updated: POST /versions')
    })

    it('asks for a public diff between the two files to Bump', async () => {
      nock('https://bump.sh')
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
        .reply(200, {diff_summary: 'Updated: POST /versions'})

      const {stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', 'examples/valid/openapi.v2.json'].join(' '),
      )
      expect(stderr).to.match(/Comparing the two given definition files/)
      expect(stdout).to.contain('Updated: POST /versions')
    })

    it('asks for a public diff between the two files to Bump and exit 1 due to breaking change', async () => {
      // Mock env variables CI
      process.env.CI = process.env.CI || ''
      const stubs = []
      stubs.push(stub(process.env, 'CI').value('1'))
      nock('https://bump.sh')
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
        .reply(200, {diff_breaking: true, diff_summary: 'Updated: POST /versions'})

      const {error, stderr, stdout} = await runCommand(
        ['diff', 'examples/valid/openapi.v3.json', 'examples/valid/openapi.v2.json'].join(' '),
      )
      expect(stderr).to.match(/Comparing the two given definition files/)
      expect(stdout).to.contain('Updated: POST /versions')
      expect(error?.oclif?.exit).to.equal(1)
    })

    it('asks for a public diff between the two files to Bump and exit 0 on breaking change due to --no-fail-on-breaking flag', async () => {
      // Mock env variables CI
      process.env.CI = process.env.CI || ''
      const stubs = []
      stubs.push(stub(process.env, 'CI').value('1'))
      nock('https://bump.sh')
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
        .reply(200, {diff_breaking: true, diff_summary: 'Updated: POST /versions'})

      const {error, stderr, stdout} = await runCommand(
        ['diff', '--no-fail-on-breaking', 'examples/valid/openapi.v3.json', 'examples/valid/openapi.v2.json'].join(' '),
      )
      expect(stderr).to.match(/Comparing the two given definition files/)
      expect(stdout).to.contain('Updated: POST /versions')
      /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
      expect(error).to.be.undefined
    })

    it('asks for a diff with content change only', async () => {
      nock('https://bump.sh')
        .post('/api/v1/versions')
        .once()
        .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '123'})
        .get('/api/v1/versions/123')
        .once()
        .reply(200, {})

      const {stderr, stdout} = await runCommand(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
      expect(stderr).to.match(/Comparing the given definition file/)
      expect(stdout).to.contain('No structural changes detected.')
    })

    it('notifies an unchanged definition', async () => {
      nock('https://bump.sh').post('/api/v1/versions').once().reply(204, {})

      const {stderr, stdout} = await runCommand(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
      expect(stderr).to.match(/Comparing the given definition file/)
      expect(stdout).to.contain('No changes detected.')
    })
  })

  describe('Server errors', () => {
    describe('Authentication error', () => {
      it("Doesn't create a diff version", async () => {
        nock('https://bump.sh').post('/api/v1/versions').reply(401)
        const {error} = await runCommand(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
        expect(error?.message).to.contain('not allowed to deploy')
        expect(error?.oclif?.exit).to.equal(101)
      })
    })

    describe('Not found error', () => {
      it("Doesn't create a diff version", async () => {
        nock('https://bump.sh').post('/api/v1/versions').reply(404)

        const {error} = await runCommand(['deploy', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
        expect(error?.message).to.contain("It seems the documentation provided doesn't exist")
        expect(error?.oclif?.exit).to.equal(104)
      })
    })

    describe('Timeout reached while polling for results', () => {
      it('asks for a diff to Bump', async () => {
        nock('https://bump.sh')
          .post('/api/v1/versions')
          .once()
          .reply(201, {doc_public_url: 'http://localhost/doc/1', id: '123'})

        nock('https://bump.sh').get('/api/v1/versions/123').times(121).reply(202)

        const {error, stderr, stdout} = await runCommand(
          ['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '),
        )
        expect(error?.message).to.contain('We were unable to compute your documentation diff')
        expect(error?.oclif?.exit).to.equal(2)
        expect(stderr).to.match(/Comparing the given definition file/)
        expect(stdout).to.eq('')
      })
    })
  })

  describe('User bad usages', () => {
    it('Fails diff of an inexistant file', async () => {
      const {error} = await runCommand(['diff', 'FILE', '--doc', 'coucou'].join(' '))
      expect(error?.message).to.match(/no such file or directory/)
    })

    it('exits with status 2 when no file argument is provided', async () => {
      const {error} = await runCommand(['diff'].join(' '))
      expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails when no documentation id or slug is provided', async () => {
      const {error} = await runCommand(['diff', 'examples/valid/openapi.v3.json'].join(' '))
      expect(error?.message).to.match(/please provide a second file argument or login/im)
    })

    it('fails when no access token is provided', async () => {
      // Mock env variables BUMP_TOKEN
      process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || ''
      const stubs = []
      stubs.push(stub(process.env, 'BUMP_TOKEN').value(''))
      const {error} = await runCommand(['diff', 'examples/valid/openapi.v3.json', '--doc', 'coucou'].join(' '))
      expect(error?.message).to.match(/please provide a second file argument or login/im)
      stubs.map((s) => s.restore())
    })
  })
})

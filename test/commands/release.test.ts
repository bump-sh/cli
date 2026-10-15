import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'
import {stub} from 'sinon'

nock.disableNetConnect()

process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || 'BAR'

const versionId = '2361df99-3467-4c80-a0cc-45c9fe565812'
const releasedVersion = {
  doc_id: '3ef8f52f-9056-4113-840e-2f7183b90e06',
  doc_name: 'My API Documentation',
  doc_public_url: 'https://bump.sh/doc/my-own-documentation',
  id: versionId,
  state: 'releasing',
}

describe('release subcommand', () => {
  describe('Successful runs', () => {
    it('releases a deployed version', async () => {
      nock('https://bump.sh').post(`/api/v1/versions/${versionId}/release`).reply(202, releasedVersion)

      const {stderr, stdout} = await runCommand(['release', versionId].join(' '))

      expect(stderr).to.contain("Let's release this version on Bump.sh... done\n")
      expect(stdout).to.contain('Your My API Documentation documentation version is being released.')
      expect(stdout).to.contain('https://bump.sh/doc/my-own-documentation')
    })

    it('does nothing when the version is already released', async () => {
      nock('https://bump.sh').post(`/api/v1/versions/${versionId}/release`).reply(204)

      const {stderr, stdout} = await runCommand(['release', versionId].join(' '))

      expect(stdout).to.equal('')
      expect(stderr).to.contain("Let's release this version on Bump.sh... done\n")
      expect(stderr).to.contain('Warning: Version is already released, nothing was done\n')
    })
  })

  describe('Server errors', () => {
    it('displays the API message when the version cannot be released', async () => {
      nock('https://bump.sh')
        .post(`/api/v1/versions/${versionId}/release`)
        .reply(422, {message: 'Only deployed versions can be released'})

      const {error} = await runCommand(['release', versionId].join(' '))

      expect(error?.message).to.contain('Only deployed versions can be released')
      expect(error?.oclif?.exit).to.equal(122)
    })

    it('displays the API message when another release is in progress', async () => {
      nock('https://bump.sh')
        .post(`/api/v1/versions/${versionId}/release`)
        .reply(409, {
          message: `Version ${versionId} is currently being released. Please wait for the release to end before trying again.`,
        })

      const {error} = await runCommand(['release', versionId].join(' '))

      expect(error?.message).to.contain(`Version ${versionId} is currently being released`)
      expect(error?.oclif?.exit).to.equal(109)
    })

    it('fails when the token is rejected', async () => {
      nock('https://bump.sh').post(`/api/v1/versions/${versionId}/release`).reply(401)

      const {error} = await runCommand(['release', versionId].join(' '))

      expect(error?.message).to.contain('not allowed to deploy')
      expect(error?.oclif?.exit).to.equal(101)
    })

    it('fails when the version does not exist', async () => {
      nock('https://bump.sh').post(`/api/v1/versions/${versionId}/release`).reply(404)

      const {error} = await runCommand(['release', versionId].join(' '))

      expect(error?.message).to.contain("It seems the documentation provided doesn't exist")
      expect(error?.oclif?.exit).to.equal(104)
    })
  })

  describe('User bad usages', () => {
    it('exits with status 2 when no version id is provided', async () => {
      const {error} = await runCommand(['release'].join(' '))
      expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails when no access token is provided', async () => {
      process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || ''
      const stubs = [stub(process.env, 'BUMP_TOKEN').value('')]

      const {error} = await runCommand(['release', versionId].join(' '))
      expect(error?.message).to.contain('Missing required flag token')
      expect(error?.oclif?.exit).to.equal(2)

      stubs.map((s) => s.restore())
    })
  })
})

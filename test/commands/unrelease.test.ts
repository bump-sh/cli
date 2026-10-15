import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'

nock.disableNetConnect()

process.env.BUMP_TOKEN = process.env.BUMP_TOKEN || 'BAR'

const versionId = '2361df99-3467-4c80-a0cc-45c9fe565812'
const unreleasedVersion = {
  doc_id: '3ef8f52f-9056-4113-840e-2f7183b90e06',
  doc_name: 'My API Documentation',
  doc_public_url: 'https://bump.sh/doc/my-own-documentation',
  id: versionId,
  state: 'releasing',
}

describe('unrelease subcommand', () => {
  describe('Successful runs', () => {
    it('unreleases a released version', async () => {
      nock('https://bump.sh').post(`/api/v1/versions/${versionId}/unrelease`).reply(202, unreleasedVersion)

      const {stderr, stdout} = await runCommand(['unrelease', versionId].join(' '))

      expect(stderr).to.contain("Let's unrelease this version on Bump.sh... done\n")
      expect(stdout).to.contain('Your My API Documentation documentation version is being unreleased.')
    })

    it('does nothing when the version is already deployed', async () => {
      nock('https://bump.sh').post(`/api/v1/versions/${versionId}/unrelease`).reply(204)

      const {stderr, stdout} = await runCommand(['unrelease', versionId].join(' '))

      expect(stdout).to.equal('')
      expect(stderr).to.contain("Let's unrelease this version on Bump.sh... done\n")
      expect(stderr).to.contain('Warning: Version is already deployed, nothing was done\n')
    })
  })

  describe('Server errors', () => {
    it('displays the API message when the version cannot be unreleased', async () => {
      nock('https://bump.sh')
        .post(`/api/v1/versions/${versionId}/unrelease`)
        .reply(422, {message: 'Only released versions can be unreleased'})

      const {error} = await runCommand(['unrelease', versionId].join(' '))

      expect(error?.message).to.contain('Only released versions can be unreleased')
      expect(error?.oclif?.exit).to.equal(122)
    })
  })
})

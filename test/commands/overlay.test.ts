import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {readFile, rm} from 'node:fs/promises'

describe('overlay subcommand', () => {
  describe('Successfully compute the merged API document with the given overlay', () => {
    it('Spits the result to stdout', async () => {
      const {stderr, stdout} = await runCommand(
        ['overlay', 'examples/valid/openapi.v3.json', 'examples/valid/overlay.yaml'].join(' '),
      )
      expect(stderr).to.contain("Let's apply the overlay to the main definition")

      const overlayedDefinition = JSON.parse(stdout)

      // Target on info description
      expect(overlayedDefinition.info.description).to.match(/Protect Earth's Tree Tracker API/)

      // Target on info contact information
      expect(overlayedDefinition.info.contact.email).to.equal('help@protect.earth')
      // Target on all servers
      expect(overlayedDefinition.servers.length).to.equal(1)
      expect(overlayedDefinition.servers[0].description).to.equal('Production')
      // Target on nodes which have "x-beta":true field
      expect(overlayedDefinition.components.schemas.Pong.properties).to.have.all.keys('pong')
      expect(overlayedDefinition.tags[0].description).to.equal('This is my test description\n')
      expect(overlayedDefinition['x-topics'].length).to.equal(3)
    })

    it('Stores the result to the target output (and format) file argument', async () => {
      await rm('tmp/openapi.overlayed.yaml', {force: true})
      const {stderr, stdout} = await runCommand(
        [
          'overlay',
          'examples/valid/openapi.v3.json',
          'examples/valid/overlay.yaml',
          '--out',
          'tmp/openapi.overlayed.yaml',
        ].join(' '),
      )
      expect(stderr).to.contain("Let's apply the overlay to the main definition")
      /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
      expect(stdout).to.be.empty
      const data = await readFile('tmp/openapi.overlayed.yaml', {encoding: 'utf8'})
      expect(data).to.contain("Protect Earth's Tree Tracker API")
      // YAML export shouldn't create yaml <anchor/aliases refs
      expect(data).to.not.contain('*ref')

      // Cleanup created file
      await rm('tmp/openapi.overlayed.yaml')
    })
  })
})

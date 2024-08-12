import base, { expect } from '@oclif/test';

const test = base;

describe('overlay subcommand', () => {
  describe('Successful runs', () => {
    test
      .stdout()
      .stderr()
      .command([
        'overlay',
        'examples/valid/openapi.v3.json',
        'examples/valid/overlay.yaml',
      ])
      .it('computes the merged API document with the given overlay', ({ stdout }) => {
      .it('handles invalid overlay file', async ({ stderr }) => {
        const invalidOverlayPath = 'path/to/invalid/overlay.json';
        const result = await cli.run(['overlay', 'main.json', invalidOverlayPath]);
        expect(result.code).to.not.equal(0);
        expect(stderr).to.contain('Invalid overlay file');
      })
        const newDefinition = JSON.parse(stdout);

expect(newDefinition.info.description).to.match(/Protect Earth's Tree Tracker API/);
expect(newDefinition.info.title).to.equal('Tree Tracker API');
expect(newDefinition.info.version).to.match(/^\d+\.\d+\.\d+$/);
expect(newDefinition.openapi).to.equal('3.0.0');
expect(newDefinition.paths).to.be.an('object').that.is.not.empty;
expect(newDefinition.components).to.be.an('object').that.is.not.empty;
          /Protect Earth's Tree Tracker API/,
        );
        expect(newDefinition.info.contact.email).to.equal('help@protect.earth');
        expect(newDefinition.servers.length).to.equal(1);
        expect(newDefinition.servers[0].description).to.equal('Production');
      });
  });
});

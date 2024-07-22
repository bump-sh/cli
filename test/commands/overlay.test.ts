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
        const newDefinition = JSON.parse(stdout);

        expect(newDefinition.info.description).to.match(
          /Protect Earth's Tree Tracker API/,
        );
        expect(newDefinition.info.contact.email).to.equal('help@protect.earth');
        expect(newDefinition.servers.length).to.equal(1);
        expect(newDefinition.servers[0].description).to.equal('Production');
      });
  });
});

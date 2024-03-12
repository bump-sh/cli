import base, { expect } from '@oclif/test';
import { rm } from 'node:fs/promises';

const test = base;

describe('overlay subcommand', () => {
  describe('Successfully compute the merged API document with the given overlay', () => {
    test
      .stdout()
      .stderr()
      .command([
        'overlay',
        'examples/valid/openapi.v3.json',
        'examples/valid/overlay.yaml',
      ])
      .it('Spits the result to stdout', ({ stdout, stderr }) => {
        expect(stderr).to.contain("Let's apply the overlay to the main definition");

        const overlayedDefinition = JSON.parse(stdout);

        // Target on info description
        expect(overlayedDefinition.info.description).to.match(
          /Protect Earth's Tree Tracker API/,
        );

        // Target on info contact information
        expect(overlayedDefinition.info.contact.email).to.equal('help@protect.earth');
        // Target on all servers
        expect(overlayedDefinition.servers.length).to.equal(1);
        expect(overlayedDefinition.servers[0].description).to.equal('Production');
        // Target on nodes which have "x-beta":true field
        expect(overlayedDefinition.components.schemas.Pong.properties).to.have.all.keys(
          'pong',
        );
      });

    test
      .do(async () => await rm('tmp/openapi.overlayed.json', { force: true }))
      .stdout()
      .stderr()
      .command([
        'overlay',
        'examples/valid/openapi.v3.json',
        'examples/valid/overlay.yaml',
        '--out',
        'tmp/openapi.overlayed.json',
      ])
      .it(
        'Stores the result to the target output file argument',
        async ({ stdout, stderr }) => {
          expect(stderr).to.contain("Let's apply the overlay to the main definition");
          expect(stdout).to.be.empty;
          // Cleanup created file
          await rm('tmp/openapi.overlayed.json');
        },
      );
  });
});

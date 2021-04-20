import { expect, test } from '@oclif/test';
import { API } from '../../src/definition';

describe('API definition class', () => {
  describe('with inexistent file', () => {
    test
      .do(async () => await API.loadAPI('FILE'))
      .catch(
        (err) => {
          expect(err.message).to.match(/Error opening file/);
        },
        { raiseIfNotThrown: false },
      )
      .it('throws an error');
  });

  describe('with no references', () => {
    test.it('parses successfully', async () => {
      const api = await API.loadAPI('examples/valid/openapi.v2.json');
      expect(api.version).to.equal('2.0');
      expect(api.references).to.be.an('array').that.is.empty;
    });
  });

  describe('with file & http references', () => {
    test
      .nock('http://example.org', (api) => api.get('/param-lights.json').reply(200, {}))
      .it('parses successfully', async () => {
        const api = await API.loadAPI('examples/valid/asyncapi.v2.yml');
        expect(api.version).to.equal('2.0.0');
        expect(api.references.length).to.equal(4);
        expect(api.references.map((ref) => ref.location)).to.include(
          'http://example.org/param-lights.json',
        );
        expect(api.references.map((ref) => ref.location)).to.include(
          'params/streetlightId.json',
        );
        expect(api.references.map((ref) => ref.location)).to.not.include(
          './params/streetlightId.json',
        );
      });
  });
});

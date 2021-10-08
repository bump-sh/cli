import { expect, test } from '@oclif/test';
import { API } from '../../src/definition';

describe('API definition class', () => {
  describe('with inexistent file', () => {
    test
      .do(async () => await API.load('FILE'))
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
      const api = await API.load('examples/valid/openapi.v2.json');
      expect(api.version).to.equal('2.0');
      expect(api.references).to.be.an('array').that.is.empty;
    });
  });

  describe('with file & http references', () => {
    test
      .nock('http://example.org', (api) => api.get('/param-lights.json').reply(200, {}))
      .it('parses successfully', async () => {
        const api = await API.load('examples/valid/asyncapi.v2.yml');
        expect(api.version).to.equal('2.2.0');
        expect(api.references.length).to.equal(5);
        expect(api.references.map((ref) => ref.location)).to.include(
          'http://example.org/param-lights.json',
        );

        expect(api.references.map((ref) => ref.location)).to.include(
          'params/streetlightId.json',
        );

        expect(api.references.map((ref) => ref.location)).to.not.include(
          './params/streetlightId.json',
        );

        expect(api.references.map((ref) => ref.location)).to.include(
          'doc/introduction.md',
        );
      });
  });

  describe('with a relative descendant file path', () => {
    test.it('parses successfully', async () => {
      const api = await API.load('./examples/valid/openapi.v2.json');
      expect(api.version).to.equal('2.0');
    });
  });

  describe('with a file path containing special characters', () => {
    test.it('parses successfully', async () => {
      const api = await API.load('./examples/valid/__gitlab-é__.yml');
      expect(api.version).to.equal('3.0.0');
    });
  });

  describe('with an http file containing relative URL refs', () => {
    test
      .nock('http://example.org', (api) =>
        api
          .get('/openapi')
          .replyWithFile(200, 'examples/valid/openapi.v3.json', {
            'Content-Type': 'application/json',
          })
          .get('/schemas/all.yml')
          .replyWithFile(200, 'examples/valid/schemas/all.yml', {
            'Content-Type': 'application/yaml',
          }),
      )
      .it('parses external file successfully', async () => {
        const api = await API.load('http://example.org/openapi');
        expect(api.version).to.equal('3.0.2');
        expect(api.references.map((ref) => ref.location)).to.contain('schemas/all.yml');
      });
  });

  describe('with an invalid definition file', () => {
    for (const [example, error] of Object.entries({
      './examples/invalid/openapi.yml': 'Unsupported API specification',
      './examples/invalid/array.yml': 'Unsupported API specification',
      './examples/invalid/string.yml': 'Unsupported API specification',
      './examples/valid/asyncapi.v3.yml': 'Unsupported API specification',
    })) {
      test
        .do(async () => await API.load(example))
        .catch(
          (err) => {
            expect(err.message).to.match(new RegExp(error));
          },
          { raiseIfNotThrown: false },
        )
        .it(`throws an error with details about ${example}`);
    }
  });
});

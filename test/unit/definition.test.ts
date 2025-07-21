import * as YAML from '@stoplight/yaml'
import {expect} from 'chai'
import nock from 'nock'
import * as fs from 'node:fs'
import path from 'node:path'
import {stub} from 'sinon'

import {API, APIDefinition} from '../../src/definition'

nock.disableNetConnect()

describe('API class', () => {
  describe('API.load(..)', () => {
    describe('with inexistent file', () => {
      it('throws an error', async () => {
        try {
          await API.load('FILE')
        } catch (error) {
          const {message} = error as Error
          expect(message).to.match(/Error opening file/)
        }
      })
    })

    describe('with no references', () => {
      it('parses successfully an OpenAPI contract', async () => {
        const api = await API.load('examples/valid/openapi.v2.json')
        expect(api.version).to.equal('2.0')
        /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
        expect(api.references).to.be.an('array').that.is.empty
      })

      it('parses successfully an AsyncAPI contract', async () => {
        const api = await API.load('examples/valid/asyncapi.v2.3.yml')
        expect(api.version).to.equal('2.3.0')
      })

      it('parses successfully an AsyncAPI 2.4 contract', async () => {
        nock.enableNetConnect('raw.githubusercontent.com')
        const api = await API.load(
          'https://raw.githubusercontent.com/asyncapi/spec/v2.4.0/examples/streetlights-kafka.yml',
        )
        nock.disableNetConnect()
        expect(api.version).to.equal('2.4.0')
      })

      it('parses successfully an AsyncAPI 2.5 contract', async () => {
        const api = await API.load('examples/valid/asyncapi.v2.5.yml')
        expect(api.version).to.equal('2.5.0')
      })
    })

    describe('with file & http references', () => {
      it('parses successfully', async () => {
        nock('http://example.org').get('/param-lights.json').reply(200, {})

        // System under test
        const api = await API.load('examples/valid/asyncapi.v2.yml')

        expect(api.version).to.equal('2.2.0')
        expect(api.references.length).to.equal(5)
        const locations = api.references.map((ref) => ref.location)
        expect(locations).to.include('http://example.org/param-lights.json')

        expect(locations).to.include(['params', 'streetlightId.json'].join(path.sep))

        expect(locations).to.not.include(['.', 'params', 'streetlightId.json'].join(path.sep))

        expect(locations).to.include(['doc', 'introduction.md'].join(path.sep))
      })
    })

    describe('with a relative descendant file path', () => {
      it('parses successfully', async () => {
        const api = await API.load('./examples/valid/openapi.v2.json')
        expect(api.version).to.equal('2.0')
      })
    })

    describe('with a file path containing special characters', () => {
      it('parses successfully', async () => {
        const api = await API.load('./examples/valid/__gitlab-é__.yml')
        expect(api.version).to.equal('3.0.0')
      })
    })

    describe('with an http file containing relative URL refs', () => {
      it('parses external file successfully', async () => {
        nock('http://example.org')
          .get('/openapi')
          .replyWithFile(200, 'examples/valid/openapi.v3.json', {
            'Content-Type': 'application/json',
          })
          .get('/schemas/all.yml')
          .replyWithFile(200, 'examples/valid/schemas/all.yml', {
            'Content-Type': 'application/yaml',
          })
        const api = await API.load('http://example.org/openapi')
        expect(api.version).to.equal('3.0.2')
        expect(api.references.map((ref) => ref.location)).to.contain(['schemas', 'all.yml'].join(path.sep))
      })
    })

    describe('with an invalid definition file', () => {
      it(`throws an error with details`, async () => {
        for (const [example, error] of Object.entries({
          './examples/invalid/array.yml': 'Unsupported API specification',
          './examples/invalid/openapi.yml': 'Unsupported API specification',
          './examples/invalid/string.yml': 'Unsupported API specification',
          './examples/valid/asyncapi.v3.yml': 'Unsupported API specification',
        })) {
          try {
            /* eslint-disable-next-line no-await-in-loop */
            await API.load(example)
          } catch (error_) {
            const {message} = error_ as Error
            expect(message).to.match(new RegExp(error))
          }
        }
      })
    })
  })

  describe('serializeDefinition()', () => {
    describe('with no overlay applied', () => {
      it('returns the rawDefinition, no matter the argument', async () => {
        const api = await API.load('examples/valid/openapi.v2.json')

        expect(api.serializeDefinition()).to.equal(api.rawDefinition)
        expect(api.serializeDefinition('destination/file.json')).to.equal(api.rawDefinition)
      })
    })

    describe('with an overlay applied', () => {
      it('returns the overlayed definition', async () => {
        const spyOnStderr = stub(process.stderr, 'write')
        const api = await API.load('examples/valid/openapi.v2.json')
        await api.applyOverlay('examples/valid/overlay.yaml')

        expect(api.serializeDefinition()).to.equal(JSON.stringify(api.overlayedDefinition))

        expect(api.serializeDefinition('destination/file.yaml')).to.equal(
          YAML.safeStringify(api.overlayedDefinition, {lineWidth: Number.POSITIVE_INFINITY}),
        )

        expect(spyOnStderr.firstCall.args[0]).to.equal(
          "WARNING: Action target '$.servers.*' has no matching elements\n",
        )

        expect(spyOnStderr.secondCall.args[0]).to.equal(
          'WARNING: Action target \'$..[?(@["x-beta"]==true)]\' has no matching elements\n',
        )

        expect(spyOnStderr.thirdCall.args[0]).to.equal("WARNING: Action target '$.servers' has no matching elements\n")
        spyOnStderr.restore()

        // Make sure overlay references are stored on the main definition
        expect(api.references.length).to.equal(1)
        expect(api.references[0].location).to.equal(['doc', 'error-codes.md'].join(path.sep))
      })

      it('preserves line width and YAML comments', async () => {
        nock('http://example.org').get('/param-lights.json').reply(200, {})

        const api = await API.load('examples/valid/asyncapi.v2.yml')
        await api.applyOverlay('examples/valid/overlay-async.yaml')

        expect(api.serializeDefinition()).to.equal(
          fs.readFileSync('examples/valid/asyncapi.v2.overlayed.yml', 'utf8').replaceAll('\r', ''),
        )
      })
    })
  })

  describe('applyOverlay()', () => {
    describe('when overlay is valid', () => {
      before(() => {
        stub(process.stderr, 'write')
      })

      it('sets the overlayedDefinition with the given overlay file path', async () => {
        const api = await API.load('examples/valid/openapi.v2.json')

        /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
        expect(api.overlayedDefinition).to.be.undefined
        await api.applyOverlay('examples/valid/overlay.yaml')
        /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
        expect(api.overlayedDefinition).to.exist
        expect((api.overlayedDefinition as APIDefinition).info.description).to.match(/Protect Earth's Tree Tracker API/)
      })

      it('sets the overlayedDefinition with the given overlay URL', async () => {
        nock('http://example.org')
          .get('/source.yaml')
          .replyWithFile(200, 'examples/valid/overlay.yaml', {
            'Content-Type': 'application/yaml',
          })
          .get('/valid/doc/error-codes.md')
          .replyWithFile(200, 'examples/valid/doc/error-codes.md', {
            'Content-Type': 'text/markdown',
          })

        const api = await API.load('examples/valid/openapi.v2.json')

        /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
        expect(api.overlayedDefinition).to.be.undefined
        await api.applyOverlay('http://example.org/source.yaml')
        /* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
        expect(api.overlayedDefinition).to.exist
        expect((api.overlayedDefinition as APIDefinition).info.description).to.match(/Protect Earth's Tree Tracker API/)
      })
    })

    describe('when overlay is invalid', () => {
      it('throws an error', async () => {
        const api = await API.load('examples/valid/openapi.v2.json')
        try {
          await api.applyOverlay('examples/valid/openapi.v2.json')
        } catch (error) {
          const {message} = error as Error
          expect(message).to.match(/examples\/valid\/openapi.v2.json does not look like an OpenAPI overlay/)
        }
      })
    })
  })
})

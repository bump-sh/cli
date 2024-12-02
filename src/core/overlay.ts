import debug from 'debug'
import {JSONSchema4Object} from 'json-schema'
/* eslint-disable-next-line import/default */
import jsonpath from 'jsonpath'
import {mergician} from 'mergician'

import {APIDefinition, OpenAPIOverlay} from '../definition.js'

export class Overlay {
  // WIP @github.com/lornajane/openapi-overlays-js
  //
  // I couldn't get the upstream lib to be imported properly due to
  // some issues with ESM module imports so this is method was copied
  // from github.com/lornajane/openapi-overlays-js and has been
  // adapted to make our Typescript build happy.
  //
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:overlay`)(formatter, ...args)
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  // If you make any changes here, PLEASE ALSO MAKE THEM UPSTREAM.
  public run(spec: APIDefinition, overlay: OpenAPIOverlay): APIDefinition {
    // Use jsonpath.apply to do the changes
    if (overlay.actions && overlay.actions.length > 0)
      for (const a of overlay.actions) {
        const action = a as JSONSchema4Object
        if (!action.target) {
          process.stderr.write('Action with a missing target\n')
          continue
        }

        const target = action.target as string
        // Is it a remove?
        if (Object.hasOwn(action, 'remove')) {
          /* eslint-disable-next-line no-constant-condition */
          while (true) {
            const path = jsonpath.paths(spec, target)
            if (path.length === 0) {
              break
            }

            const parent = jsonpath.parent(spec, target)
            const thingToRemove = path[0].at(-1)
            if (thingToRemove !== undefined) {
              if (Array.isArray(parent)) {
                parent.splice(thingToRemove as number, 1)
              } else {
                delete parent[thingToRemove]
              }
            }
          }
        } else {
          try {
            // It must be an update
            // Deep merge objects using a module (built-in spread operator is only shallow)
            const merger = mergician({appendArrays: true})
            if (target === '$') {
              // You can't actually merge an update on a root object
              // target with the jsonpath lib, this is just us merging
              // the given update with the whole spec.
              spec = merger(spec, action.update)
            } else {
              jsonpath.apply(spec, target, (chunk) => {
                if (typeof chunk === 'object' && typeof action.update === 'object') {
                  if (Array.isArray(chunk) && Array.isArray(action.update)) {
                    return [...chunk, ...action.update]
                  }

                  return merger(chunk, action.update)
                }

                return action.update
              })
            }
          } catch (error) {
            process.stderr.write(`Error applying overlay: ${(error as Error).message}\n`)
            // return chunk
          }
        }
      }

    return spec
  }
}

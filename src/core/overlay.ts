import debug from 'debug';
import jsonpath from 'jsonpath';
import mergician from 'mergician';
import { JSONSchema4Object } from 'json-schema';

import { APIDefinition, OpenAPIOverlay } from '../definition';

export class Overlay {
  // WIP @github.com/lornajane/openapi-overlays-js
  //
  // I couldn't get the upstream lib to be imported properly due to
  // some issues with ESM module imports so this is method was copied
  // from github.com/lornajane/openapi-overlays-js and has been
  // adapted to make our Typescript build happy.
  //
  // If you make any changes here, PLEASE ALSO MAKE THEM UPSTREAM.
  public run(spec: APIDefinition, overlay: OpenAPIOverlay): APIDefinition {
    // Use jsonpath.apply to do the changes
    if (overlay.actions && overlay.actions.length >= 1)
      overlay.actions.forEach((a) => {
        const action = a as JSONSchema4Object;
        if (!action.target) {
          process.stderr.write('Action with a missing target\n');
          return;
        }
        const target = action.target as string;
        // Is it a remove?
        if (action.hasOwnProperty('remove')) {
          while (true) {
            const path = jsonpath.paths(spec, target, 1);
            if (path.length == 0) {
              break;
            }
            const parent = jsonpath.parent(spec, target);
            const thingToRemove = path[0][path[0].length - 1];
            if (Array.isArray(parent)) {
              parent.splice(thingToRemove as number, 1);
            } else {
              delete parent[thingToRemove];
            }
          }
        } else {
          try {
            // It must be an update
            jsonpath.apply(spec, target, (chunk) => {
              if (typeof chunk === 'object' && typeof action.update === 'object') {
                if (Array.isArray(chunk) && Array.isArray(action.update)) {
                  return chunk.concat(action.update);
                } else {
                  // Deep merge objects using a module (built-in spread operator is only shallow)
                  const merger = mergician({ appendArrays: true });
                  return merger(chunk, action.update);
                }
              } else {
                return action.update;
              }
            });
          } catch (ex) {
            process.stderr.write(`Error applying overlay: ${(ex as Error).message}\n`);
            //return chunk
          }
        }
      });

    return spec;
  }

  // Function signature type taken from @types/debug
  // Debugger(formatter: any, ...args: any[]): void;
  /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:overlay`)(formatter, ...args);
  }
}

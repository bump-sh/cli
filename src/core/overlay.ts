// WIP @github.com/lornajane/openapi-overlays-js
//
// I couldn't get the upstream lib to be imported properly due to some
// issues with ESM module imports so this is file was copied from
// github.com/lornajane/openapi-overlays-js and has been adapted to
// make our Typescript build happy.
//
// If you make any changes here, please also make them upstream.
import jsonpath from 'jsonpath';
import mergician from 'mergician';
import { JSONSchema4Object } from 'json-schema';

import { APIDefinition, OpenAPIOverlay } from '../definition';

import { debug } from './logger';

export function applyOverlay(spec: APIDefinition, overlay: OpenAPIOverlay) {
  debug('Applying overlay:', { spec: spec.info?.title, overlay: overlay.info?.title });
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

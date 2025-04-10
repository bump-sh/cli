import debug from 'debug'
import {JSONSchema4Object, JSONSchema4Type} from 'json-schema'
import * as jsonpath from 'jsonpathly'
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
    if (overlay.actions && overlay.actions.length > 0) {
      for (const a of overlay.actions) {
        const action = a as JSONSchema4Object
        if (!action.target) {
          process.stderr.write(`WARNING: ${this.humanName(action)} has an empty target\n`)
          continue
        }

        const target = action.target as string
        // jsonpathly's paths are strings. They represent a “Path
        // expression” which represents the absolute path in the objet
        // tree reached by our `target`.
        //
        // E.g. '$["store"]["book"][0]["price"]'
        const paths = jsonpath.paths(spec, target)
        if (paths.length === 0) {
          process.stderr.write(`WARNING: Action target '${target}' has no matching elements\n`)
          continue
        }

        // When we execute a 'remove' action we need to be careful if
        // the targets are elements of an array. Because the list of
        // paths contains an index of each element.
        //
        // E.g.
        // ["servers"][0]
        // ["servers"][1]
        // ["servers"][2]
        //
        // And if we remove elements starting from the 0, the array
        // will be reindexed and thus the '2' index won't be valid
        // anymore.
        //
        // Thus, in that case we revers the list of paths
        if (action.remove) {
          paths.reverse()
        }

        for (const path of paths) {
          // The 'executeAction' will mutate the passed spec object in
          // place.
          spec = this.executeAction(spec, action, path)
        }
      }
    } else {
      process.stderr.write('WARNING: No actions found in your overlay\n')
    }

    return spec
  }

  /* Mutates the given 'spec' object with the 'action' given and
   * targeting a unique 'pat ' within the spec object. We don't check
   * if the path is valid in the object as this is the role of the
   * jsonpathly lib which we used previously to extract the target
   * paths. */
  private executeAction(spec: APIDefinition, action: JSONSchema4Object, path: string): APIDefinition {
    const explodedPath: string[] = path.split(/(?:]\[|\$\[)+/)
    // Remove root
    explodedPath.shift()

    // Take last element from path (which is the thing to act
    // upon)
    let thingToActUpon: number | string | undefined = explodedPath.pop()
    // The last element (e.g. '"price"]' or '0]') contains a final ']'
    // so we need to remove it AND we need to parse the element to
    // transform the string in either a string or a number
    thingToActUpon =
      thingToActUpon === undefined ? '$' : (thingToActUpon = JSON.parse(thingToActUpon.slice(0, -1)) as number | string)

    // Reconstruct the stringified path expression targeting the parent
    const parentPath: string = explodedPath.join('][')
    const parent: JSONSchema4Object =
      parentPath.length > 0 ? (jsonpath.query(spec, `$[${parentPath}]`) as JSONSchema4Object) : spec

    // Do the overlay action
    // Is it a remove?
    if (Object.hasOwn(action, 'remove')) {
      this.d(`Executing 'remove' on target path: ${path}`)
      this.remove(parent, thingToActUpon)
    } else if (Object.hasOwn(action, 'update')) {
      this.d(`Executing 'update' on target path: ${path}`)
      spec = this.update(spec, parent, action.update, thingToActUpon)
    } else {
      process.stderr.write(`WARNING: ${this.humanName(action)} needs either a 'remove' or an 'update' property\n`)
    }

    return spec
  }

  private humanName(action: JSONSchema4Object): string {
    return action.description ? `Action '${action.description}'` : 'Action'
  }

  private remove(parent: JSONSchema4Object, property_or_index: number | string): void {
    if (Array.isArray(parent)) {
      parent.splice(property_or_index as number, 1)
    } else {
      delete parent[property_or_index]
    }
  }

  private update(
    spec: APIDefinition,
    parent: JSONSchema4Object,
    update: JSONSchema4Type,
    property_or_index: number | string,
  ): APIDefinition {
    try {
      // Deep merge objects using a module (built-in spread operator is only shallow)
      const merger = mergician({appendArrays: true})
      if (property_or_index === '$') {
        // You can't actually merge an update on a root object
        // target with the jsonpathly lib, this is just us merging
        // the given update with the whole spec.
        spec = merger(spec, update)
      } else if (property_or_index !== undefined) {
        const targetObject = parent[property_or_index]

        if (typeof targetObject === 'object' && typeof update === 'object') {
          parent[property_or_index] =
            Array.isArray(targetObject) && Array.isArray(update)
              ? [...targetObject, ...update]
              : merger(targetObject, update)
        } else {
          parent[property_or_index] = update
        }
      }
    } catch (error) {
      process.stderr.write(`Error applying overlay: ${(error as Error).message}\n`)
    }

    return spec
  }
}

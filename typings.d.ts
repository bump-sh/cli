// oas-schemas doesn't define TS types
declare module 'oas-schemas';

type SpecSchema = Record<string, unknown>;

// AsyncAPI doesn't define TS types
declare module '@asyncapi/specs' {
  const asyncapi: Record<string, SpecSchema>;

  export default asyncapi;
}

// Load repo root level package.json file
declare module '*.json';

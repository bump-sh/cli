// oas-schemas doesn't define TS types
declare module 'oas-schemas';

// preparse doesn't define TS types
// https://github.com/paulRbr/openapi-overlays-js/
declare module 'preparse';

// Internals of json-schema-ref-parser doesn't expose types
declare module '@apidevtools/json-schema-ref-parser/lib/options';

// Load repo root level package.json file
declare module '*.json';

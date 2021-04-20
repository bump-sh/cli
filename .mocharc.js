'use strict';

module.exports = {
  exit: true,
  bail: true,
  timeout: 60000,
  recursive: true,
  reporter: 'spec',
  require: [
    'test/helpers/init.js',
    'ts-node/register',
    'source-map-support/register',
  ],
  'watch-files': ['src/**/*.ts', 'tests/**/*.ts'],
};

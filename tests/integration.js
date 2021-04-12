'use strict';

const spawn = require('cross-spawn');
const cmd = './bin/run';
const tests = [
  ['--version'],
  ['--help'],
  ['validate', 'examples/asyncapi.v2.yml'],
  ['validate', 'examples/openapi.v3.json'],
];

for (let i = 0; i < tests.length; i++) {
  const result = spawn.sync(cmd, tests[i]);

  console.log(`> ${cmd} ${tests[i]}`);
  if (result.status) {
    console.log(result.stderr.toString());
    process.exit(result.status);
  }
  console.log(result.stdout.toString());
}

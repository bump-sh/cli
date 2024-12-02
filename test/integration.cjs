'use strict';

const spawn = require('cross-spawn');
const cmd = './bin/run.js';
const tests = [['--version'], ['--help']];

for (let i = 0; i < tests.length; i++) {
  const result = spawn.sync(cmd, tests[i]);

  console.log(`> ${cmd} ${tests[i]}`);
  if (result.status) {
    console.log(result.stderr.toString());
    process.exit(result.status);
  }
  console.log(result.stdout.toString());
}

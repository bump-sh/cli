# bump-cli

Bump CLI to interact with the API of developers.bump.sh

[![Version](https://img.shields.io/npm/v/bump-cli.svg)](https://npmjs.org/package/bump-cli)
[![Tests](https://github.com/bump-sh/bump-node-cli/actions/workflows/checks.yml/badge.svg)](https://github.com/bump-sh/bump-node-cli/actions/workflows/checks.yml)
[![Downloads/week](https://img.shields.io/npm/dw/bump-cli.svg)](https://npmjs.org/package/bump-cli)
[![License](https://img.shields.io/npm/l/bump-cli.svg)](https://github.com/bump-sh/bump-node-cli/blob/master/package.json)


Built with [`oclif`](https://oclif.io) a framework to write commandline scripts in Typescript.

* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)

## Installation

TODO

- publish npm package on https://www.npmjs.com/ (`npm publish`)
- Write CI which will package the cli in a standalone tarball and publish it to Github Releases
  - See oclif documentation with [`oclif-dev pack`](https://oclif.io/docs/releasing#standalone-tarballs) to package the CLI with an embedded node binary
  - There are three other tasks `oclif-dev <pack:win|pack:macos|pack:deb>` available which seem to be able to package tarballs comptible with Windows, macOS, Debian/Ubuntu respectively

- Go even further and package binaries into package repositories:
  - [Example Homebrew formula](https://github.com/heroku/homebrew-brew/blob/master/Formula/heroku.rb#L9) to distribute package with `brew`
  - Example distribution compatible with `apt` package manager by using a plain S3-like bucket from the [oclif documentation](https://oclif.io/docs/releasing#ubuntudebian-packages)
  - Docker container
  - Nix derivation
  - Snap ?
  - …

## Usage

```sh-session
$ npm install -g bump-cli
$ bump COMMAND
running command...
$ bump (-v|--version|version)
bump-cli/0.1.0 linux-x64 node-v15.12.0
$ bump --help
Bump CLI to interact with the API of developers.bump.sh

VERSION
  bump-cli/0.1.0 linux-x64 node-v15.12.0

USAGE
  $ bump [COMMAND]

COMMANDS
  hello  describe the command here
  help   display help for bump
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## Commands

* [`bump preview [FILE]`](#bump-preview-file)

### `bump preview [FILE]`

describe the command here

```
USAGE
  $ bump preview [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ bump preview
  hello world from ./src/preview.ts!
```

_See code: [src/commands/preview.ts](https://github.com/bump-sh/bump-node-cli/blob/v0.1.0/src/commands/preview.ts)_

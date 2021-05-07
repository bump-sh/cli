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
* [Development](#development)

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
  deploy   Create a new version of your documentation for the given file or URL
  help      display help for bump
  preview   Create a documentation preview for the given file or URL
```

## Commands

* [`bump preview [FILE]`](#bump-preview-file)
* [`bump deploy [FILE]`](#bump-deploy-file)

### `bump preview [FILE]`

You can preview your documentation by calling the `preview` command. A temporary preview will be created with a unique URL. This preview will be available for 30 minutes. You don't need any credentials to use this command.

```
Create a documentation preview for the given file or URL

USAGE
  $ bump preview FILE

ARGUMENTS
  FILE  Path or URL to your API documentation file. OpenAPI (2.0 to 3.1.0) and AsyncAPI (2.0)
        specifications are currently supported.

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ bump preview FILE
  * Your preview is visible at: https://bump.sh/preview/45807371-9a32-48a7-b6e4-1cb7088b5b9b
```

### `bump deploy [FILE]`

Deploy the definition file as the current version of the documentation with the following command:

```sh-session
$ bump deploy path/to/your/file.yml --doc DOC_ID_OR_SLUG --token DOC_TOKEN
```

If you already have a hub in your [Bump.sh](https://bump.sh) account, you can automatically create a documentation inside it and deploy to it with:

```sh-session
$ bump deploy path/to/your/file.yml --auto-create --doc DOC_SLUG --hub HUB_ID_OR_SLUG --token HUB_TOKEN
```

Please check `bump deploy --help` for more usage details

## Development

Make sure to have Node.js (At least v10) installed on your machine.

- Install node dependencies with
  
  ```sh-session
  $ npm install
  ```
  
- Compile the Typescript code
  
  ```sh-session
  $ npm run build
  $ npm run clean # to remove build artifacts
  ```
  
- Format the codebase to comply with the linter rules
  
  ```sh-session
  $ npm run fmt
  ```
  
- Run the test suites
  
  ```sh-session
  $ npm run test
  $ npm run test-coverage # Run tests with coverage
  ```

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/bump-sh/bump-node-cli. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

## License

The node package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the Bump::CLI project’s codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/bump-sh/bump-cli/blob/master/CODE_OF_CONDUCT.md).

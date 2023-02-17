# Bump cli

<p align="center">
  <img width="20%" src="https://bump.sh/icon-default-large.png" />
</p>

<p align="center">
  <a href="https://help.bump.sh/">Help</a> |
  <a href="https://bump.sh/users/sign_up">Sign up</a>
</p>

The Bump CLI is used to interact with your API documentation hosted on Bump by using the API of [developers.bump.sh](https://developers.bump.sh). It is built with [`oclif`](https://oclif.io) in Typescript.

[![Version](https://img.shields.io/npm/v/bump-cli.svg)](https://npmjs.org/package/bump-cli)
[![Tests](https://github.com/bump-sh/cli/actions/workflows/checks.yml/badge.svg)](https://github.com/bump-sh/cli/actions/workflows/checks.yml)
[![License](https://img.shields.io/npm/l/bump-cli.svg)](https://github.com/bump-sh/cli/blob/master/package.json)

## Table of contents

* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)
* [Development](#development)
* [Contributing](#contributing)
* [Versioning](#versioning)

## Installation

Bump is installed via npm. Run this command to install it for local use:

```sh-session
npm install -g bump-cli
```

_If you are looking to use Bump in a continuous integration environment you might be interested by [our Github Action](https://github.com/marketplace/actions/api-documentation-on-bump)._

### How should I do if I'm not using npm ?

Unfortunately, at the moment we only publish a npm package. However we plan to distribute universal binaries in the most common package managers soon.

## Usage

```sh-session
$ npm install -g bump-cli

$ bump --help
The Bump CLI is used to interact with your API documentation hosted on Bump by using the API of developers.bump.sh

VERSION
  bump-cli/2.5.0 linux-x64 node-v16.14.0

USAGE
  $ bump [COMMAND]

COMMANDS
  deploy   Create a new version of your documentation from the given file or URL.
  diff     Get a comparison diff with your documentation from the given file or URL.
  help     Display help for bump.
  preview  Create a documentation preview from the given file or URL.
```

Please check the [Bump CLI help page](https://help.bump.sh/bump-cli) for more CLI usage details.

## Commands

* [`bump preview [FILE]`](#bump-preview-file)
* [`bump deploy [FILE]`](#bump-deploy-file)
* [`bump diff [FILE]`](#bump-diff-file)

### `bump preview [FILE]`

You can preview your documentation by calling the `preview` command. A temporary preview will be created with a unique URL. This preview will be available for 30 minutes. You don't need any credentials to use this command. Here is an example usage:


```sh-session
$ bump preview https://bit.ly/asyncapi
* Let's render a preview on Bump... done
* Your preview is visible at: https://bump.sh/preview/c192dad0-79d7-44b3-b5e1-244b69f618e4 (Expires at 2021-06-28T18:06:56+02:00)
```

_Note: you can use the `--open` flag to open the preview URL in your browser directly._

_Note2: you can use the `--live` flag to watch changes of the input `FILE`. This is very helpful when writing your api definition as you will see a live preview being refreshed at each file save._

Please check `bump preview --help` for more usage details

### `bump deploy [FILE]`

Deploy the definition file as the current version of the documentation with the following command:

```sh-session
$ bump deploy path/to/your/file.yml --doc DOC_ID_OR_SLUG --token DOC_TOKEN
```

If you already have a hub in your [Bump.sh](https://bump.sh) account, you can automatically create a documentation inside it and deploy to it with:

```sh-session
$ bump deploy path/to/your/file.yml --auto-create --doc DOC_SLUG --hub HUB_ID_OR_SLUG --token HUB_TOKEN
```

Simulate a deployment of your definition file to make sure it is valid with the `--dry-run` flag, it is particularly useful in a Continuous Integration environment running a test deployment outside your main branch:

```sh-session
$ bump deploy path/to/your/file.yml --dry-run --doc DOC_ID_OR_SLUG --token DOC_TOKEN
```

Please check `bump deploy --help` for more usage details

### `bump diff [FILE]`

_If you want to receive automatic `bump diff` results on your Github Pull Requests you might be interested by [our Github Action](https://github.com/marketplace/actions/api-documentation-on-bump#api-diff-on-pull-requests) diff command._

#### Public API diffs

From any two definition files or URLs, you can retrieve a comprehensive changelog of what has changed between them.

```sh-session
$ bump diff path/to/your/file.yml path/to/your/second_file.yml
* Comparing the two given definition files... done
Modified: GET /consommations
  Response modified: 200
    [Breaking] Body attribute modified: energie
```

Or from two URLs:

```sh-session
$ bump diff https://demo.bump.sh/doc/trips-books/changes/bfec0a43-b870-44da-9e07-60c8955e15d5.json https://demo.bump.sh/doc/trips-books.json
* Comparing the two given definition files... done
Modified: POST /books
  Response modified: 200
    [Breaking] Body attribute removed: cent
```

_Note: You can also test this feature in our dedicated web application at <https://api-diff.io/>._

#### Authenticated diffs attached to your Bump documentation

From a Bump documentation, the `diff` command will retrieve a comparaison changelog between your existing documentation and the given file or URL:

```sh-session
$ bump diff path/to/your/file.yml --doc DOC_ID_OR_SLUG --token DOC_TOKEN
* Comparing the given definition file with the currently deployed one... done

Updated: POST /validations
  Body attribute modified: documentation
```

If you want to compare two unpublished versions of your definition file, the `diff` command can retrieve a comparaison changelog between two given file or URL, “as simple as `git diff`”:

```sh-session
$ bump diff path/to/your/file.yml path/to/your/next-file.yml --doc <doc_slug> --token <your_doc_token>
* Comparing the two given definition files... done

Updated: POST /versions
  Body attribute added: previous_version_id
```

_Note: you can use the `--open` flag to open the visual diff URL in your browser directly._

Please check `bump diff --help` for full usage details.

## Development

Make sure to have Node.js (At least v14) installed on your machine.

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

Bug reports and pull requests are welcome on GitHub at https://github.com/bump-sh/cli. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

### License

The node package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).

### Code of Conduct

Everyone interacting in the Bump-CLI project codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/bump-sh/.github/blob/main/CODE_OF_CONDUCT.md).

## Versioning

This npm package starts at v2.0.0 for two main reasons:

- Our [first version](https://github.com/bump-sh/bump-cli) of the Bump CLI was written in Ruby, starting at v2.0.0 makes it clear we are working on our second version of the Bump CLI

- The `bump-cli` package used to be [owned by Rico](https://github.com/rstacruz) which already published v1.x packages. If you are looking for the old npm package please head to [`@rstacruz/bump-cli` package](https://www.npmjs.com/package/@rstacruz/bump-cli). _A big thanks to Rico for transfering the ownership of the `bump-cli` package name!_

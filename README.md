# Bump CLI

<p align="center">
  <img width="20%" src="https://bump.sh/icon-default-maskable-large.png" />
</p>

<p align="center">
  <a href="https://help.bump.sh/">Help</a> |
  <a href="https://bump.sh/users/sign_up">Sign up</a>
</p>

The Bump.sh CLI is used to interact with your API documentation or hubs hosted on Bump.sh. With any API definition of your choice (from Swagger, OpenAPI or AsyncAPI), it can help you to:

- Validate an API document before publishing it to your documentation
- Publish an API document to your Bump.sh documentation or hubs
- Compare two API documents to generate a human-readable diff from your API definitions

Under the hood, it uses the API of [developers.bump.sh](https://developers.bump.sh). And is built with the [`oclif`](https://oclif.io) framework in Typescript.

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

The Bump.sh CLI is a node package currently distributed via NPM. This means you must have the Node v20+ interpreter installed on your computer or CI servers.

_If you are looking to use Bump.sh in a continuous integration environment you might be interested by [our Github Action](https://github.com/marketplace/actions/api-documentation-on-bump)._

> You can download a standalone package directly from the latest
> GitHub release assets if you don’t use Node.
{: .info}

### Global installation

To install it globally, run the following command with NPM

```sh-session
npm install -g bump-cli
```

Or, with Yarn via

```sh-session
yarn global add bump-cli
```

### Add Bump.sh to your Node project

As our CLI is a node package, you can easily embed it into your project by adding the package to your `package.json` file, either with NPM

```sh-session
npm install --save-dev bump-cli
```

Or with Yarn via

```sh-session
yarn add --dev bump-cli
```

You can then use any Bump.sh commands with `npx` (same as `npm exec`)

```sh-session
npx bump --help
```

### Can I install Bump.sh CLI without using NodeJS?

Unfortunately, at the moment we only support the Node environment. However, you can download a standalone package directly from the [latest Github release](https://github.com/bump-sh/cli/releases) assets which you can run as a standalone binary. Or you can push your documentation using [our API](https://developers.bump.sh/) (advanced usage only).

## Usage

To list all the available commands, just type `bump` in your command line environment.

```sh-session
$ bump --help
The Bump.sh CLI is used to interact with your API documentation hosted on Bump.sh by using the API of developers.bump.sh

VERSION
  bump-cli/2.9.1 linux-x64 node-v20.18.1

USAGE
  $ bump [COMMAND]

COMMANDS
  deploy   Create a new version of your documentation from the given file or URL.
  diff     Get a comparison diff with your documentation from the given file or URL.
  help     Display help for bump.
  overlay  Apply an OpenAPI specified overlay to your API definition.
  preview  Create a documentation preview from the given file or URL.
```

 You can also get some help anytime by adding `--help` to any command. Example: `bump deploy --help`.

### Prepare your Bump.sh account

While some commands don't need any API token (`preview` or `diff`) you will need an access key if you want to interact with your Bump.sh documentation.

Head over to your Documentation settings in the “CI deployment” section or your Account or Organization settings in the “API keys” section to fetch a personal token for later usage.

## Commands

* [`bump deploy [FILE]`](#bump-deploy-file)
* [`bump diff [FILE]`](#bump-diff-file)
* [`bump preview [FILE]`](#bump-preview-file)
* [`bump overlay [DEFINITION_FILE] [OVERLAY_FILE]`](#bump-overlay-definition_file-overlay_file)

### `bump deploy [FILE]`

When you update your API, you also want its documentation to be up to date for your API users. This is what the deploy command is for.

```sh-session
bump deploy path/to/api-document.yml --doc my-documentation --token $DOC_TOKEN
```

> You can find your own `my-documentation` slug and `$DOC_TOKEN` api key from your [documentation settings](https://bump.sh/docs).
{: .info}

You can also deploy a given API document to a different branch of your documentation with the `--branch <branch-name>` parameter. Please note the branch will be created if it doesn’t exist. More details about the branching feature are available on [this dedicated help page](https://docs.bump.sh/help/branching). E.g. deploy the API document to the `staging` branch of the documentation:

```sh-session
bump deploy path/to/api-document.yml --doc my-documentation --token $DOC_TOKEN --branch staging
```

#### Deploy a folder all at once

If you already have a hub in your [Bump.sh](https://bump.sh) account, you can automatically create documentation and deploy it into that hub by publishing a whole directory containing multiple API documents in a single command:

```sh-session
bump deploy dir/path/to/apis/ --auto-create --hub my-hub --token $HUB_TOKEN
```

> You can find your own `my-hub` slug and `$HUB_TOKEN` api key from your [hub settings](https://bump.sh/hubs).
{: .info}

Please note, by default, only files named `{slug}-api.[format]` are published. Where `{slug}` is a name for your API and `[format]` is either `yaml` or `json`. Adjust to your file naming convention using the `--filename-pattern <pattern>` option.

Note that it _can_ include `*` wildcard special character, but **must** include the `{slug}` filter to extract your documentation’s slug from the filename. The pattern can also have any other optional fixed characters.

Here’s a practical example. Let's assume that you have the following files in your `path/to/apis/` directory:

```
path/to/apis
└─ private-api-users-service.json
└─ partner-api-payments-service.yml
└─ public-api-contracts-service.yml
└─ data.json
└─ README.md
```

In order to deploy the 3 services API definition files from this folder (`private-api-users-service.json`, `partner-api-payments-service.yml` and `public-api-contracts-service.yml`), you can execute the following command:

```
bump deploy path/to/apis/ --hub my-hub --filename-pattern '*-api-{slug}-service'
```

#### Validate an API document

Simulate your API document's deployment to ensure it is valid by adding the `--dry-run` flag to the `deploy` command. It is handy in a Continuous Integration environment running a test deployment outside your main branch:

```sh-session
bump deploy path/to/api-document.yml --dry-run --doc my-documentation --token $DOC_TOKEN
```

Please check `bump deploy --help` for more usage details.

### `bump diff [FILE]`

_If you want to receive automatic `bump diff` results on your Github Pull Requests you might be interested by [our Github Action](https://github.com/marketplace/actions/bump-sh-api-documentation-changelog) which also has a diff command._

Please note that by default the command will always exit with a
successful return code. If you want to use this command in a CI
environment and want the command to fail **in case of a breaking
change**, you will need to add the `--fail-on-breaking` flag to your
diff command. By default if the environment variable `CI=1` is present
(in most continuous integration environment), the flag will be
enabled. In that case you can disable to failures with
`--no-fail-on-breaking` flag.

#### Public API diffs

From any two API documents or URLs, you can retrieve a comprehensive changelog of what has changed between them.

```sh-session
$ bump diff path/to/your/file.yml path/to/your/second_file.yml
* Comparing the two given definition files... done
Modified: GET /consommations
  Response modified: 200
    [Breaking] Body attribute modified: energie
```
> You can create as many diffs as you like without being authenticated. This is a **free and unlimited service** provided as long as you use the service fairly.
{: .info}

_**Note:** You can also test this feature in our dedicated web application at <https://api-diff.io/>._

#### Authenticated diffs related to your Bump.sh documentation

From an existing Bump.sh documentation, the `diff` command will retrieve a comparison changelog between your latest published documentation and the given file or URL:

```sh-session
bump diff path/to/your/file.yml --doc my-documentation --token $DOC_TOKEN
```

If you want to compare two unpublished versions of your API document, the `diff` command can retrieve a comparison changelog between two given file or URL, “as simple as `git diff`”:

```sh-session
bump diff path/to/your/file.yml path/to/your/next-file.yml --doc my-documentation --token $DOC_TOKEN
```

Please check `bump diff --help` for full usage details.

### `bump preview [FILE]`


When writing documentation, you might want to preview how it renders on Bump.sh. This is precisely the goal of the `preview` command: it will create temporary documentation with a unique URL, which will be available for a short period (30 minutes).

Usage from a local OpenAPI or AsyncAPI file

```shell
bump preview path/to/file.json
```

You can also preview a file available from a URL

```shell
bump preview https://developers.bump.sh/source.yaml
```

#### Live preview

By using the `--live` flag you can stay focused on API design (OpenAPI or AsyncAPI file) while seeing a continuously updated preview each time you save your API document.

- Launch the live preview command in your terminal

```shell
bump preview --live --open openapi-definition.json
```

- Edit your `openapi-definition.json` file in your favorite text editor
- Watch the live preview being updated each time you save your file.

> You can create as many previews as you like without being authenticated. This is a **free and unlimited service**.
{: .info}

_**Note:** the additional `--open` flag helps to automatically open the preview URL in your browser._

Please check `bump preview --help` for more usage details

### `bump overlay [DEFINITION_FILE] [OVERLAY_FILE]`

> This feature implements the [OpenAPI Overlay specification](https://github.com/OAI/Overlay-Specification). It is possible to apply an Overlay to any kind of document, be it an OpenAPI or AsyncAPI definition file.

The Overlay specification of OpenAPI makes it possible to modify the content of an API definition file by adding a layer on top of it. That layer helps add, remove, or change some or all of the content of the original definition.

Technically, the `bump overlay` command will output a modified version of the `[DEFINITION_FILE]` (an OpenAPI or AsyncAPI document) by applying the operations described in the `[OVERLAY_FILE]` Overlay file to the original API document.

To redirect the output of the command to a new file you can run the following:

```shell
bump overlay api-document.yaml overlay-file.yaml > api-overlayed-document.yaml
```

_Note: you can also apply overlays during the [`bump deploy` command]((#bump-deploy-file)) with the `--overlay` flag (which can be used multiples times):_

```shell
bump deploy api-document.yaml --doc my-doc --token my-token --overlay overlay-file.yaml
```

## Development

Make sure to have Node.js (At least v20) installed on your machine.

- Install node dependencies with

  ```sh-session
  npm install
  ```

- Compile the Typescript code

  ```sh-session
  npm run build
  npm run clean # to remove build artifacts
  ```

- Format the codebase to comply with the linter rules

  ```sh-session
  npm run fmt
  ```

- Run the test suites

  ```sh-session
  npm run test
  npm run test-coverage # Run tests with coverage
  ```

## Compatible specification types

We currently support [OpenAPI](https://github.com/OAI/OpenAPI-Specification) from 2.0 (called Swagger) to 3.1 and [AsyncAPI 2.x](https://www.asyncapi.com/docs/reference/specification/latest) specification file types. Both YAML and JSON file formats are accepted file inputs to the CLI.

## Contributing

Bug reports and pull requests are welcome on GitHub at <https://github.com/bump-sh/cli>. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

## Thanks

- [Lorna Mitchel](https://github.com/lornajane/) for [openapi-overlay-js](https://github.com/lornajane/openapi-overlays-js)

## License

The Bump CLI project is released under the [MIT License](http://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the Bump-CLI project codebases, issue trackers, chat rooms, and mailing lists is expected to follow the [code of conduct](https://github.com/bump-sh/.github/blob/main/CODE_OF_CONDUCT.md).

## Versioning

This npm package starts at v2.0.0 for two main reasons:

- Our [first version](https://github.com/bump-sh/bump-cli) of the Bump CLI was written in Ruby, starting at v2.0.0, which makes it clear we are working on our second version of the Bump CLI

- The `bump-cli` package used to be [owned by Rico](https://github.com/rstacruz) which already published v1.x packages. If you are looking for the old npm package please head to [`@rstacruz/bump-cli` package](https://www.npmjs.com/package/@rstacruz/bump-cli). _A big thanks to Rico for transferring the ownership of the `bump-cli` package name!_
w

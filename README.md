# Bump CLI

<p align="center">
  <img width="20%" src="https://bump.sh/icon-default-maskable-large.png" />
</p>

<p align="center">
  <a href="https://docs.bump.sh/help">Help</a> |
  <a href="https://bump.sh/users/sign_up">Sign up</a>
</p>

The Bump.sh CLI is used to interact with API documentation and hubs hosted on Bump.sh from your choice of popular API description formats: OpenAPI, Swagger, or AsyncAPI.

Using [OpenAPI](https://github.com/OAI/OpenAPI-Specification) (v3.x and v2.0) or [AsyncAPI](https://www.asyncapi.com/docs/reference/specification/latest) (2.x), you can do any of the following:

- Validate an API document before publishing to your documentation.
- Publish an API document to your Bump.sh documentation or hubs.
- Compare two API documents to generate a human-readable diff from your API definition.
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

_If you are looking to use Bump.sh in a continuous integration environment you might be interested by [our Github Action](https://github.com/marketplace/actions/bump-sh-api-documentation-changelog)._

> You can download a standalone package directly from the latest
> Github release assets if you don’t use Node.
{: .info}

### Global installation

To install it globally, run the following command with NPM:

```shell
npm install -g bump-cli
```

Or, with Yarn via:

```shell
yarn global add bump-cli
```

### Add Bump.sh to your Node project

As our CLI is a node package, you can easily embed it to your project by adding the package to your `package.json` file, either with NPM:

```shell
npm install --save-dev bump-cli
```

Or with Yarn via:

```shell
yarn add --dev bump-cli
```

You can then use any Bump.sh commands with `npx` (same as `npm exec`):

```shell
npx bump --help
```

### Can I install Bump.sh CLI without using NodeJS?

Unfortunately, at the moment we only support the Node environment. However, you can download a standalone package directly from the [latest Github release](https://github.com/bump-sh/cli/releases) assets which you can run as a standalone binary. Or you can push your documentation using [our API](https://developers.bump.sh/) (advanced usage only).

## Usage

To list all the available commands, just type `bump` in your command line environment.

```shell
$ bump --help
The Bump.sh CLI is used to interact with your API documentation hosted on Bump.sh by using the API of developers.bump.sh

VERSION
  bump-cli/x.y.z linux-x64 node-v20+

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

* [`bump deploy [FILE]`](#the-deploy-command)
* [`bump diff [FILE]`](#the-diff-command)
* [`bump preview [FILE]`](#the-preview-command)
* [`bump overlay [DEFINITION_FILE] [OVERLAY_FILE]`](#the-overlay-command)

### The `deploy` command

When an API is updated, the documentation should be updated at the same time. This is what the deploy command is for.

```shell
bump deploy path/to/api-document.yml --doc my-documentation --token $DOC_TOKEN
```

> You can find your own `my-documentation` slug and `$DOC_TOKEN` api key from your [documentation settings](https://bump.sh/docs).
{: .info}

You can also deploy a given API document to a different branch of your documentation with the `--branch <branch-name>` parameter. Please note the branch will be created if it doesn’t exist. More details about the branching feature are available on [this dedicated help page](https://docs.bump.sh/help/branching). E.g. deploy the API document to the `staging` branch of the documentation:

```shell
bump deploy path/to/api-document.yml --doc my-documentation --token $DOC_TOKEN --branch staging
```

#### Deploy a folder all at once

If you already have a hub in your [Bump.sh](https://bump.sh) account, you can automatically create documentation and deploy it into that hub by publishing a whole directory containing multiple API documents in a single command:

```shell
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

```shell
bump deploy path/to/api-document.yml --dry-run --doc my-documentation --token $DOC_TOKEN
```

Please check `bump deploy --help` for more usage details.

#### Deploy a workflow document on your MCP server

Use the `bump deploy` command with the `--mcp-server` flag to push a workflow definition to your MCP server.

```shell
bump deploy path/to/flower-document.yml --mcp-server my-mcp-server-id-or-slug --token $BUMP_TOKEN
```

> [!NOTE]
> You can find your own `mcp-server-id-or-slug` and `$BUMP_TOKEN` api key from your [MCP server settings](https://bump.sh/dashboard) at 'https://bump.sh/{your-organization}/workflow/set/{mcp-server-id}/tokens'.

This feature is currently in closed beta.
Request an early access at hello@bump.sh

### The `diff` command

Using the `diff` command can help to spot differences between the local API
document and the latest deployed version.

#### Public API diffs

From any two API documents or URLs, you can retrieve a comprehensive changelog
of what has changed between them.

```shell
$ bump diff path/to/your/file.yml path/to/your/second_file.yml
* Comparing the two given definition files... done
Modified: GET /consommations
  Response modified: 200
    [Breaking] Body attribute modified: energie
```

By default the command will always exit with a successful return code. If you
want to use this command in a CI environment and want the command to fail **in
case of a breaking change**, you will need to add the `--fail-on-breaking` flag
to your diff command.

By default if the environment variable `CI=1` is present (in most continuous
integration environment), the flag will be enabled. In that case you can disable
the failures with `--no-fail-on-breaking` flag.

You can also test this feature in our dedicated web application at
<https://api-diff.io/>.

#### GitHub Integration

If you want to receive automatic `bump diff` results on Github Pull Requests you
might be interested by [our Github
Action](https://github.com/marketplace/actions/bump-sh-api-documentation-changelog#deploy-documentation--diff-on-pull-requests)
which has support for the diff command.

#### Authenticated diffs related to your Bump.sh documentation

From an existing Bump.sh documentation, the `diff` command will retrieve a
comparison changelog between your latest published documentation and the given
file or URL:

```shell
bump diff path/to/your/file.yml --doc my-documentation --token $DOC_TOKEN
```

If you want to compare two unpublished versions of your API document, the `diff` command can retrieve a comparison changelog between two given file or URL, “as simple as `git diff`”:

```shell
bump diff path/to/your/file.yml path/to/your/next-file.yml --doc my-documentation --token $DOC_TOKEN
```

Please check `bump diff --help` for full usage details.

#### Diffs with overlayed source files

The `bump diff` command also supports [overlays](#the-overlay-command). This means you can pass the `--overlay my-overlay-file.yml` flag to the command and it will apply the overlay on both files **before** running the diff. E.g.:

```shell
bump diff --overlay my-overlay.yml path/to/your/file.yml path/to/your/next-file.yml
```

### The `preview` command

When writing documentation, you might want to preview how it renders on Bump.sh.
This is precisely the goal of the `preview` command: it will create temporary
documentation with a unique URL, which will be available for a short period (30
minutes).

Usage from a local OpenAPI or AsyncAPI document:

```shell
bump preview path/to/file.json
```

You can also preview a document available via a URL:

```shell
bump preview https://developers.bump.sh/source.yaml
```

#### Live preview

By using the `--live` flag you can stay focused on API design (OpenAPI or AsyncAPI file) while seeing a continuously updated preview each time you save your API document.

- Launch the live preview command in your terminal

```shell
bump preview --live --open api-document.yaml
```

- Edit your `api-document.yaml` file in your favorite text editor.
- Watch the live preview being updated each time you save your file.
- The additional `--open` flag helps to automatically open the preview URL in your browser.

> You can create as many previews as you like without being authenticated. This is a **free and unlimited service**.
{: .info}

Please check `bump preview --help` for more usage details

### The `overlay` command

The [Overlay Specification](https://spec.openapis.org/overlay/v1.0.0.html) from the OpenAPI Initiative makes it possible to modify the content of an API definition by adding a layer on top of it. That layer helps adding, removing or changing some or all of the content of the original definition. 

The `bump overlay` command takes an original API document, applies the changes from the overlay document, and outputs a modified version. No changes are made directly to the original document.

```shell
bump overlay api-document.yaml overlay.yaml
```

To redirect the output of the command to a new file you can run:

```shell
bump overlay api-document.yaml overlay.yaml > modified-api-document.yaml
```

You can also apply the overlay using the [`deploy` command](#the-deploy-command) with the `--overlay` flag:

```shell
bump deploy api-document.yaml --doc my-doc --token my-token --overlay overlay.yaml
```

If there are multiple overlays which need to be applied, the `--overlay` can be passed multiple times.

```shell
bump deploy api-document.yaml \
  --doc my-doc \
  --token my-token \
  --overlay overlay1.yaml \
  --overlay overlay2.yaml
```

## Development

Make sure to have Node.js (At least v20) installed on your machine.

- Install node dependencies with

  ```shell
  npm install
  ```

- Compile the Typescript code


  ```shell
  npm run build
  npm run clean # Remove build artifacts
  ```

- Format the codebase to comply with the linter rules

  ```shell
  npm run fmt
  ```

- Run the test suites

  ```shell
  npm run test
  npm run test-coverage # Run tests with coverage
  ```

### Use package in local environment

You can run the package by executing the file `bin/run.js` locally:

  ```shell
  bin/run.js
  ```

For example to generate a preview:

  ```shell
  ./bin/run.js preview path/to/file.json
  > Your preview is visible at: https://bump.sh/preview/42
  ```

Please note that even if CLI is running locally, by default requests are sent to [Bump.sh API](https://developers.bump.sh/).

If you have a local version of the Bump.sh API, you can run CLI 100% in local environment
by setting the environment variable `BUMP_HOST`:

  ```shell
  BUMP_HOST="http://localhost:3000" ./bin/run.js preview path/to/file.json
  > Your preview is visible at: http://localhost:3000/preview/42
  ```

## License

The Bump CLI project is released under the [MIT License](http://opensource.org/licenses/MIT).

## Contributing

Bug reports and pull requests are welcome on GitHub at <https://github.com/bump-sh/cli>. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

## Code of Conduct

Everyone interacting in the Bump-CLI project codebases, issue trackers, chat rooms, and mailing lists is expected to follow the [code of conduct](https://github.com/bump-sh/.github/blob/main/CODE_OF_CONDUCT.md).

## Thanks

- [Lorna Mitchel](https://github.com/lornajane/) for [openapi-overlay-js](https://github.com/lornajane/openapi-overlays-js).
- [Rico](https://github.com/rstacruz) for transferring the ownership of the `bump-cli` package name.

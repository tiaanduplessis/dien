
# dien
[![package version](https://img.shields.io/npm/v/dien.svg?style=flat-square)](https://npmjs.org/package/dien)
[![package downloads](https://img.shields.io/npm/dm/dien.svg?style=flat-square)](https://npmjs.org/package/dien)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/dien.svg?style=flat-square)](https://npmjs.org/package/dien)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Simple static file server

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Security](#security)
- [Development](#development)
- [Contribute](#contribute)
- [License](#License)

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). 

```sh
$ npm install dien
$ # OR
$ yarn add dien
```

## Usage

```js
const dien = require('dien')

const dir = '.'
const port = 7777

dien(dir, port)

```

Using the CLI:

```sh
$ dien --port=9000 --dir=dist
```

## Security

Only serve a directory whose contents you intend to make accessible. The server
has no authentication and listens on Node's default interfaces, which can include
external network interfaces. Use a firewall or an authenticated reverse proxy
when appropriate. Symlinks are followed; do not place links to private files in
the served directory.

Dotfiles and files inside dot-directories are not served. Directory indexes use
`index.html`, then `index.htm`; directories without an index are not listed.
Non-GET/HEAD requests and missing files return 404. Error responses do not expose
server stack traces, regardless of `NODE_ENV`. Range requests and cache
validators are supported, with `Cache-Control: public, max-age=0` by default.

## Development

Use Node.js 22 or 24 for the development checks:

```sh
npm ci --ignore-scripts
npm run check
npm pack --dry-run --ignore-scripts
```

`npm run lint` checks without changing files; `npm run lint:fix` applies fixes.
The test suite exercises the API and CLI using temporary fixtures and ephemeral
loopback listeners. It checks indexes, encoded paths, dotfiles, traversal,
methods, error escaping, redirect safety, ranges, and cache validators.

`package-lock.json` is the maintained development lockfile. The old Yarn lockfile
has been removed to avoid maintaining two different dependency resolutions;
consumers can still install the published package with npm or Yarn. Updating the
dependencies does not introduce a new runtime Node.js engine requirement.

## Contribute

1. Fork it and create your feature branch: git checkout -b my-new-feature
2. Commit your changes: git commit -am 'Add some feature'
3. Push to the branch: git push origin my-new-feature 
4. Submit a pull request

## License

MIT
    
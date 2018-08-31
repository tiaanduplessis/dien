
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

## Contribute

1. Fork it and create your feature branch: git checkout -b my-new-feature
2. Commit your changes: git commit -am 'Add some feature'
3. Push to the branch: git push origin my-new-feature 
4. Submit a pull request

## License

MIT
    
#!/usr/bin/env node

const parse = require('get-them-args')
const dien = require('./')
const args = parse(process.argv)

dien(args.dir, args.port)

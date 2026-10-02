const http = require('node:http')
const path = require('node:path')

// Exercise the real API/CLI while keeping every test listener on an ephemeral
// loopback port. The production defaults and arguments are recorded separately.
const listen = http.Server.prototype.listen
let server
http.Server.prototype.listen = function (port, callback) {
  server = this
  return listen.call(this, 0, '127.0.0.1', () => {
    callback()
    process.send({ port: this.address().port, requestedPort: port })
  })
}

process.on('message', message => {
  if (message === 'close') server.close(() => process.exit(0))
})

const root = process.env.DIEN_TEST_ROOT || path.resolve(__dirname, '../..')
if (process.env.DIEN_TEST_MODE === 'cli') {
  process.argv = [process.execPath, path.join(root, 'cli.js')].concat(JSON.parse(process.env.DIEN_TEST_ARGS))
  require(path.join(root, 'cli.js'))
} else {
  const result = require(root).apply(null, JSON.parse(process.env.DIEN_TEST_ARGS))
  if (result !== undefined) throw new Error('The API return value changed')
}

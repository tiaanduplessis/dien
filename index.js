const http = require('http')
const path = require('path')

const finalhandler = require('finalhandler')
const serveStatic = require('serve-static')

function dien (dir = '.', port = 8888) {
  const serve = serveStatic(path.join(process.cwd(), dir), { 'index': ['index.html', 'index.htm'] })

  const server = http.createServer(function onRequest (req, res) {
    serve(req, res, finalhandler(req, res))
  })

  server.listen(port, () => {
    console.log(`${dir} on http://localhost:${port}`)
  })

  process.on('exit', () => {
    server.close()
  })
}

module.exports = dien

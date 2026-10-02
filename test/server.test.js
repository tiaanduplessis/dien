const assert = require('node:assert/strict')
const { fork } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const { once } = require('node:events')
const { before, after, test } = require('node:test')

let directory
let active
const contents = 'Hello static files!\n'

async function start (args, mode = 'api') {
  const child = fork(path.join(__dirname, 'helpers/server.js'), [], {
    cwd: directory,
    silent: true,
    env: { ...process.env, NODE_ENV: 'development', DIEN_TEST_MODE: mode, DIEN_TEST_ARGS: JSON.stringify(args) }
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const ready = new Promise((resolve, reject) => {
    child.once('message', resolve)
    child.once('error', reject)
    child.once('exit', code => reject(new Error(`Server exited (${code}): ${output}`)))
  })
  const timer = setTimeout(() => child.kill(), 10000)
  try {
    const address = await ready
    return { child, ...address, output: () => output }
  } finally {
    clearTimeout(timer)
  }
}

async function stop (server) {
  if (!server || server.child.exitCode !== null) return
  const exited = once(server.child, 'exit')
  const timer = setTimeout(() => server.child.kill(), 5000)
  server.child.send('close')
  try {
    const [code] = await exited
    assert.equal(code, 0)
  } finally {
    clearTimeout(timer)
  }
}

function request (url, options = {}, server = active) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.port, path: url, agent: false, ...options }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('Request timed out')))
    req.end()
  })
}

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dien-test-'))
  fs.mkdirSync(path.join(directory, 'public'))
  for (const dir of ['nested', 'htm', 'empty', 'space dir', '.hidden']) {
    fs.mkdirSync(path.join(directory, 'public', dir), { recursive: true })
  }
  const files = {
    'index.html': '<h1>Home</h1>',
    'index.htm': 'Not the preferred index',
    'hello.txt': contents,
    'space name.txt': 'Spaces work',
    'café.txt': 'Unicode works',
    'nested/index.html': '<h1>Nested</h1>',
    'htm/index.htm': '<h1>Fallback</h1>',
    '.secret': 'Hidden file',
    '.hidden/secret.txt': 'Hidden directory',
    'bytes.bin': Buffer.from([0, 1, 2, 255])
  }
  for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(directory, 'public', name), value)
  fs.writeFileSync(path.join(directory, 'outside.txt'), 'Never serve outside root')
  active = await start(['public', 7777])
})

after(async () => {
  try { await stop(active) } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})

test('API retains its explicit port argument and startup output', () => {
  assert.equal(active.requestedPort, 7777)
  assert.match(active.output(), /public on http:\/\/localhost:7777/)
})

for (const [url, expected] of [
  ['/', '<h1>Home</h1>'],
  ['/index.html', '<h1>Home</h1>'],
  ['/hello.txt', contents],
  ['/hello.txt?ignored=yes', contents],
  ['/space%20name.txt', 'Spaces work'],
  ['/caf%C3%A9.txt', 'Unicode works'],
  ['/nested/', '<h1>Nested</h1>'],
  ['/htm/', '<h1>Fallback</h1>']
]) {
  test(`serves ${url}`, async () => {
    const res = await request(url)
    assert.equal(res.status, 200)
    assert.equal(res.body.toString(), expected)
    assert.equal(Number(res.headers['content-length']), Buffer.byteLength(expected))
  })
}

test('preserves binary file bytes and MIME type', async () => {
  const res = await request('/bytes.bin')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, Buffer.from([0, 1, 2, 255]))
  assert.equal(res.headers['content-type'], 'application/octet-stream')
})

test('HEAD returns file metadata without a response body', async () => {
  const res = await request('/hello.txt', { method: 'HEAD' })
  assert.equal(res.status, 200)
  assert.equal(res.body.length, 0)
  assert.equal(Number(res.headers['content-length']), Buffer.byteLength(contents))
  assert.equal(res.headers['content-type'], 'text/plain; charset=UTF-8')
})

for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
  test(`${method} falls through to a 404 without modifying files`, async () => {
    const res = await request('/hello.txt', { method })
    assert.equal(res.status, 404)
    assert.equal(fs.readFileSync(path.join(directory, 'public/hello.txt'), 'utf8'), contents)
  })
}

for (const url of ['/missing', '/empty/', '/.secret', '/.hidden/secret.txt', '/%2ehidden/secret.txt', '/.hidden%2fsecret.txt', '/%2esecret', '/../outside.txt', '/%2e%2e/outside.txt', '/%2e%2e%2foutside.txt', '/nested/../../outside.txt', '/%252e%252e%252foutside.txt']) {
  test(`does not disclose files for ${url}`, async () => {
    const res = await request(url)
    assert.equal(res.status, 404)
    assert.doesNotMatch(res.body.toString(), /Never serve outside root|Hidden file|Hidden directory/)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.match(res.headers['content-security-policy'], /^default-src /)
  })
}

for (const url of ['/%', '/%GG', '/%C0%AE', '/hello.txt%00']) {
  test(`malformed or null-byte path ${url} fails safely`, async () => {
    const res = await request(url)
    assert.equal(res.status, 404)
    assert.doesNotMatch(res.body.toString(), /Hello static files|Never serve outside root/)
  })
}

test('directory redirect preserves query and encodes unsafe characters', async () => {
  const res = await request('/space%20dir?x=%3Cscript%3E')
  assert.equal(res.status, 301)
  assert.equal(res.headers.location, '/space%20dir/?x=%3Cscript%3E')
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.match(res.headers['content-security-policy'], /^default-src /)
})

test('security: directory redirect does not put untrusted URLs in links', async () => {
  const res = await request('/nested?x=%22%3E%3Cscript%3Ealert(1)%3C/script%3E')
  assert.equal(res.status, 301)
  assert.doesNotMatch(res.body.toString(), /<a\s|<script/i)
  assert.match(res.body.toString(), /Redirecting to/)
  assert.equal(res.headers['content-security-policy'], "default-src 'none'")
})

test('security: error pages escape literal markup and exclude local root paths', async () => {
  const res = await request('/<script>alert(1)</script>')
  assert.equal(res.status, 404)
  assert.doesNotMatch(res.body.toString(), /<script>/i)
  assert.ok(!res.body.toString().includes(directory))
  assert.equal(res.headers['content-security-policy'], "default-src 'none'")
})

test('supports ranges and unsatisfiable range errors', async () => {
  const partial = await request('/hello.txt', { headers: { Range: 'bytes=0-4' } })
  assert.equal(partial.status, 206)
  assert.equal(partial.body.toString(), 'Hello')
  assert.equal(partial.headers['content-range'], `bytes 0-4/${Buffer.byteLength(contents)}`)
  const suffix = await request('/hello.txt', { headers: { Range: 'bytes=-2' } })
  assert.equal(suffix.status, 206)
  assert.equal(suffix.body.toString(), '!\n')
  const unsatisfiable = await request('/hello.txt', { headers: { Range: 'bytes=999-1000' } })
  assert.equal(unsatisfiable.status, 416)
  assert.equal(unsatisfiable.headers['content-range'], `bytes */${Buffer.byteLength(contents)}`)
})

test('retains validators and default no-age cache policy', async () => {
  const initial = await request('/hello.txt')
  assert.equal(initial.headers['cache-control'], 'public, max-age=0')
  assert.equal(initial.headers['accept-ranges'], 'bytes')
  assert.ok(initial.headers.etag)
  assert.ok(initial.headers['last-modified'])
  for (const headers of [{ 'If-None-Match': initial.headers.etag }, { 'If-Modified-Since': initial.headers['last-modified'] }]) {
    const cached = await request('/hello.txt', { headers })
    assert.equal(cached.status, 304)
    assert.equal(cached.body.length, 0)
  }
})

test('API defaults to the working directory and port 8888', async () => {
  const server = await start([])
  try {
    assert.equal(server.requestedPort, 8888)
    assert.equal((await request('/outside.txt', {}, server)).body.toString(), 'Never serve outside root')
  } finally { await stop(server) }
})

for (const args of [['--port=9000', '--dir=public'], ['--port', '9000', '--dir', 'public']]) {
  test(`CLI parses ${args.join(' ')}`, async () => {
    const server = await start(args, 'cli')
    try {
      assert.equal(server.requestedPort, 9000)
      assert.equal((await request('/hello.txt', {}, server)).body.toString(), contents)
    } finally { await stop(server) }
  })
}

test('CLI defaults to the working directory and port 8888', async () => {
  const server = await start([], 'cli')
  try {
    assert.equal(server.requestedPort, 8888)
    assert.equal((await request('/outside.txt', {}, server)).body.toString(), 'Never serve outside root')
  } finally { await stop(server) }
})

for (const [headers, status] of [[{ Range: 'bytes=999-1000' }, 416], [{ 'If-Match': '"not-matching"' }, 412]]) {
  test(`security: ${status} errors do not expose server stack traces`, async () => {
    const res = await request('/hello.txt', { headers })
    assert.equal(res.status, status)
    assert.doesNotMatch(res.body.toString(), /node_modules|SendStream|Error:|\bat \w/)
    assert.ok(!res.body.toString().includes(directory))
    assert.equal(res.headers['content-security-policy'], "default-src 'none'")
  })
}

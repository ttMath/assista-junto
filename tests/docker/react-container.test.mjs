import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const image = process.env.REACT_TEST_IMAGE || 'assistajunto-react:docker-review';
const fixtureImage = 'node:26-alpine';
const fixture = `
  const http = require('node:http');
  const { createHash } = require('node:crypto');
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ version: process.env.VERSION, url: req.url, headers: req.headers }));
  });
  server.on('upgrade', (req, socket) => {
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: ' + accept + '\\r\\n\\r\\n');
    socket.on('data', data => { if ((data[0] & 15) === 8) socket.end(Buffer.from([136, 0])); });
  });
  server.listen(5000, '0.0.0.0');
`;

function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
async function eventually(check, timeout = 25000) {
  const end = Date.now() + timeout;
  let failure;
  do {
    try { return await check(); } catch (error) { failure = error; }
    await delay(250);
  } while (Date.now() < end);
  throw failure;
}
async function json(origin, path, options) {
  const response = await fetch(origin + path, { ...options, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  return response.json();
}

test('React Docker runtime', { timeout: 180000 }, async t => {
  const name = `assistajunto-react-test-${process.pid}-${Date.now()}`;
  const network = docker('network', 'create', '--label', 'assistajunto.qa=react-container', name);
  const containers = new Set();
  function run(...args) {
    const id = docker('run', '--detach', '--network', name, '--label', 'assistajunto.qa=react-container', ...args);
    containers.add(id); return id;
  }
  function remove(id) { docker('rm', '--force', id); containers.delete(id); }
  function origin(id) { return 'http://' + docker('port', id, '3000/tcp'); }
  try {
    const client = run('--publish', '127.0.0.1::3000', '--health-interval=1s', '--health-start-period=1s', image);
    const base = origin(client);
    let html;
    await t.test('starts and reports healthy before the API exists, using image defaults', async () => {
      await eventually(async () => assert.equal((await fetch(base + '/healthz')).status, 200));
      await eventually(() => assert.equal(docker('inspect', '--format', '{{.State.Health.Status}}', client), 'healthy'));
      assert.equal((await fetch(base + '/')).status, 200);
      html = await (await fetch(base + '/')).text();
      assert.match(html, /\/assets\/index-/);
      docker('exec', client, 'sh', '-c', 'test ! -d /src && ! command -v node && test ! -f /usr/share/nginx/html/.env');
    });

    const first = run('--network-alias', 'api', '--env', 'VERSION=first', fixtureImage, 'node', '-e', fixture);
    await t.test('preserves API paths, encoded queries and HTTPS forwarded by Traefik', async () => {
      const result = await eventually(() => json(base, '/api/items.json?q=a%2Fb&second=2', { headers: { 'X-Forwarded-Proto': 'https' } }));
      assert.equal(result.url, '/api/items.json?q=a%2Fb&second=2');
      assert.equal(result.headers['x-forwarded-proto'], 'https');
      assert.equal(result.headers['x-forwarded-host'], new URL(base).host);
      assert.equal((await json(base, '/api')).url, '/api');
    });

    await t.test('supports WebSocket upgrade for the hub', async () => {
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(base.replace('http:', 'ws:') + '/hubs/room?username=Docker');
        const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket upgrade timed out')); }, 5000);
        socket.addEventListener('open', () => { clearTimeout(timer); socket.close(); resolve(); }, { once: true });
        socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket upgrade failed')); }, { once: true });
      });
    });

    await t.test('uses SPA fallback only for routes and compresses immutable build assets', async () => {
      assert.equal(await (await fetch(base + '/sala/direct-link')).text(), html);
      assert.equal((await fetch(base + '/missing.js')).status, 404);
      assert.equal((await fetch(base + '/assets/missing.js')).status, 404);
      assert.equal((await fetch(base + '/missing.png')).status, 404);
      assert.equal((await fetch(base + '/appsettings.json')).headers.get('cache-control'), 'no-store');
      assert.equal((await fetch(base + '/index.html')).headers.get('cache-control'), 'no-cache');
      const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
      const response = await fetch(base + asset, { headers: { 'Accept-Encoding': 'gzip' } });
      assert.equal(response.headers.get('content-encoding'), 'gzip');
      assert.match(response.headers.get('cache-control'), /immutable/);
      assert.match(response.headers.get('vary'), /Accept-Encoding/i);
      await response.arrayBuffer();
    });

    await t.test('normalizes a trailing slash in an explicitly configured upstream', async () => {
      const custom = run('--publish', '127.0.0.1::3000', '--env', 'REACT_API_UPSTREAM=http://api:5000/', image);
      const result = await eventually(() => json(origin(custom), '/api/path?original=yes'));
      assert.equal(result.url, '/api/path?original=yes');
      remove(custom);
    });

    await t.test('resolves the new API IP after replacement without restarting nginx', async () => {
      const second = run('--network-alias', 'api', '--env', 'VERSION=second', fixtureImage, 'node', '-e', fixture);
      const ip = id => JSON.parse(docker('inspect', id))[0].NetworkSettings.Networks[name].IPAddress;
      assert.notEqual(ip(first), ip(second));
      remove(first);
      await eventually(async () => assert.equal((await json(base, '/api/recreated')).version, 'second'));
      assert.equal(docker('inspect', '--format', '{{.RestartCount}}', client), '0');
    });

    await t.test('rejects invalid upstream configuration before nginx starts', () => {
      assert.throws(() => docker('run', '--rm', '--env', 'REACT_API_UPSTREAM=api:5000', image, 'nginx', '-t'), /REACT_API_UPSTREAM/);
    });
  } finally {
    const failures = [];
    for (const id of containers) { try { docker('rm', '--force', id); } catch (error) { failures.push(error); } }
    try { docker('network', 'rm', network); } catch (error) { failures.push(error); }
    if (failures.length) throw new AggregateError(failures, 'Could not clean up owned Docker test resources');
  }
});

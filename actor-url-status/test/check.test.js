import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkUrl } from '../src/check.js';
const srv = http.createServer((q, r) => {
  if (q.url === '/a') { r.writeHead(301, { location: '/b' }); return r.end(); }
  if (q.url === '/b') { r.writeHead(302, { location: '/ok' }); return r.end(); }
  if (q.url === '/ok') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<title> Hi  there </title><link rel="canonical" href="https://x.test/ok"><meta name="robots" content="noindex">'); }
  if (q.url === '/loop') { r.writeHead(302, { location: '/loop' }); return r.end(); }
  if (q.url === '/slow') return setTimeout(() => r.end('x'), 3000);
  r.writeHead(404); r.end();
});
const B = 'http://127.0.0.1:8794';
before(() => new Promise((ok) => srv.listen(8794, '127.0.0.1', ok)));
after(() => srv.close());
test('redirect chain', async () => {
  const r = await checkUrl(B + '/a');
  assert.equal(r.status, 200); assert.equal(r.redirects, 2); assert.equal(r.finalUrl, B + '/ok');
  assert.deepEqual(r.redirectChain.map((c) => c.status), [301, 302, 200]);
  assert.equal(r.title, 'Hi there'); assert.equal(r.canonical, 'https://x.test/ok'); assert.equal(r.robots, 'noindex');
});
test('404', async () => { const r = await checkUrl(B + '/nope'); assert.equal(r.status, 404); assert.equal(r.ok, false); });
test('loop', async () => { const r = await checkUrl(B + '/loop', { maxRedirects: 5 }); assert.equal(r.error, 'too many redirects'); });
test('timeout', async () => { const r = await checkUrl(B + '/slow', { timeoutMs: 500 }); assert.equal(r.ok, false); assert.equal(r.error, 'timeout'); });
test('unreachable', async () => { const r = await checkUrl('http://127.0.0.1:9/'); assert.equal(r.ok, false); assert.ok(r.error); });

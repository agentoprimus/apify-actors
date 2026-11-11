import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from './fixture.js';
import { discoverSitemaps, extract, checkStatuses } from '../src/sitemap.js';
let res;
before(async () => {
  await new Promise((ok) => server.listen(8798, '127.0.0.1', ok));
  res = await extract(await discoverSitemaps('http://localhost:8798/'));
  await checkStatuses(res.urls, { delayMs: 0 });
});
after(() => server.close());
const row = (p) => res.urls.find((u) => u.url === 'http://localhost:8798' + p);
test('follows index, gz, records failing sitemap', () => {
  assert.equal(res.sitemaps.find((s) => s.sitemap.endsWith('posts.xml.gz')).gzipped, true);
  assert.equal(res.sitemaps.find((s) => s.sitemap.endsWith('missing.xml')).error, 'HTTP 404');
  assert.equal(res.urls.length, 5);
});
test('fields parsed', () => {
  const r = row('/');
  assert.equal(r.lastmod, '2026-11-01'); assert.equal(r.changefreq, 'daily'); assert.equal(r.priority, 1);
  assert.equal(r.images, 1); assert.deepEqual(r.alternates, [{ hreflang: 'de', href: 'http://localhost:8798/de/' }]);
});
test('CDATA + entities decoded', () => assert.ok(row('/a?x=1&y=2')));
test('statuses', () => {
  assert.equal(row('/').status, 200); assert.equal(row('/gone').status, 404);
  assert.equal(row('/redir').status, 301); assert.equal(row('/redir').redirectTo, '/');
});

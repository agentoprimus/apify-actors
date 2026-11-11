import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
process.argv[2] = '8799';
const { server } = await import('./fixture-server.js');
const { crawl } = await import('../src/crawl.js');
const { summarize } = await import('../src/report.js');

let r;
before(async () => {
  await new Promise((ok) => server.listen(8799, '127.0.0.1', ok));
  r = await crawl('http://localhost:8799/', { maxPages: 20, delayMs: 0, checkExternal: false });
});
after(() => server.close());

const page = (path) => r.pages.find((p) => p.url === 'http://localhost:8799' + path);
const codes = (path) => (page(path).issues || []).map((i) => i.code);

test('respects robots.txt', () => assert.equal(page('/private/x').skipped, 'robots.txt'));
test('home page: expected issues only', () => assert.deepEqual(codes('/').sort(), ['canonical-relative', 'not-https', 'og-missing', 'thin-content', 'twitter-card-missing']));
test('og missing detected', () => assert.ok(codes('/about').includes('og-missing')));
test('page scores', () => { assert.equal(page('/').score, 83); assert.ok(page('/bad').score < 60); });
test('redirect chain detected, target not re-analyzed', () => {
  assert.equal(page('/old').initialStatus, 301);
  assert.ok(codes('/old').includes('redirect-chain'));
  assert.equal(page('/old').redirectsToAnalyzedPage, true);
});
test('404 reported and listed as broken link', () => {
  assert.ok(codes('/missing').includes('http-error'));
  assert.ok(r.brokenLinks.some((b) => b.url.endsWith('/missing')));
});
test('bad page issues', () => {
  for (const c of ['schema-invalid-json', 'title-long', 'h1-missing', 'lang-missing', 'viewport-missing']) assert.ok(codes('/bad').includes(c), c);
});
test('about page issues', () => {
  for (const c of ['h1-multiple', 'img-alt-missing', 'title-short']) assert.ok(codes('/about').includes(c), c);
});
test('noindex detected', () => assert.ok(codes('/dup2').includes('noindex')));
test('site issues: duplicate title once, orphan page', () => {
  const s = r.site.issues.map((i) => i.code);
  assert.equal(s.filter((c) => c === 'title-duplicate').length, 1);
  assert.deepEqual(r.site.issues.find((i) => i.code === 'orphan-pages').urls, ['http://localhost:8799/orphan']);
});
test('every issue has a fix hint', () => {
  for (const p of r.pages) for (const i of p.issues || []) assert.ok(i.fix, i.code);
});
test('404 not double-counted in summary', () => {
  const s = summarize({ ...r, lighthouse: [] });
  assert.equal(s.counts.error, 2);
});

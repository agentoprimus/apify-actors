import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { crawl } from '../src/crawl.js';
const spa = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>SPA app title here ok</title></head><body><div id="root"></div><script>document.getElementById("root").innerHTML="<h1>Rendered heading</h1>"</script></body></html>';
const srv = http.createServer((q, r) => { if (q.url === '/robots.txt' || q.url === '/sitemap.xml') { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(spa); });
before(() => new Promise((ok) => srv.listen(8790, '127.0.0.1', ok)));
after(() => srv.close());
const codes = (r) => r.pages[0].issues.map((i) => i.code);
test('without rendering, JS-inserted h1 is missing', async () => {
  const r = await crawl('http://127.0.0.1:8790/', { maxPages: 1, delayMs: 0, checkExternal: false });
  assert.ok(codes(r).includes('h1-missing'));
});
test('with renderJs, h1 is found', { timeout: 60000 }, async () => {
  const r = await crawl('http://127.0.0.1:8790/', { maxPages: 1, delayMs: 0, checkExternal: false, renderJs: true });
  assert.equal(r.pages[0].rendered, true);
  assert.ok(!codes(r).includes('h1-missing'), codes(r).join());
  assert.deepEqual(r.pages[0].h1, ['Rendered heading']);
});

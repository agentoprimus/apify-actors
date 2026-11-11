import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from './fixture.js';
import { shootAll } from '../src/shoot.js';
const B = 'http://localhost:8797';
let res;
const png = (b) => b.subarray(0, 4).toString('hex') === '89504e47';
const pngSize = (b) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });
before(async () => {
  await new Promise((ok) => server.listen(8797, '127.0.0.1', ok));
  res = await shootAll([
    { url: B + '/', device: 'desktop', format: 'png', fullPage: false },
    { url: B + '/', device: 'desktop', format: 'png', fullPage: true },
    { url: B + '/', device: 'mobile', format: 'jpeg', fullPage: false },
    { url: B + '/', device: 'desktop', format: 'png', selector: '#hero' },
    { url: B + '/', device: 'desktop', format: 'pdf' },
    { url: B + '/late', device: 'desktop', format: 'png', waitForSelector: '#ready' },
    { url: B + '/missing', device: 'desktop', format: 'png' },
    { url: 'http://127.0.0.1:1/', device: 'desktop', format: 'png' },
  ], { concurrency: 2, timeoutMs: 10000 });
});
after(() => server.close());
const find = (pred) => res.find(pred);
test('viewport png is 1440x900', () => { const r = find((r) => r.device === 'desktop' && r.format === 'png' && !r.fullPage && !r.selector && r.url.endsWith('/')); assert.ok(png(r.buffer)); assert.deepEqual(pngSize(r.buffer), { w: 1440, h: 900 }); });
test('full page is taller than viewport', () => { const r = find((r) => r.fullPage); assert.ok(pngSize(r.buffer).h > 2500); });
test('mobile jpeg at 3x', () => { const r = find((r) => r.device === 'mobile'); assert.equal(r.buffer[0], 0xff); assert.equal(r.contentType, 'image/jpeg'); });
test('element screenshot is small', () => { const r = find((r) => r.selector); assert.ok(pngSize(r.buffer).h < 200); });
test('pdf', () => { const r = find((r) => r.format === 'pdf'); assert.equal(r.buffer.subarray(0, 4).toString(), '%PDF'); });
test('waitForSelector works', () => assert.ok(find((r) => r.url.endsWith('/late')).ok));
test('404 still screenshots but reports status', () => { const r = find((r) => r.url.endsWith('/missing')); assert.equal(r.ok, true); assert.equal(r.status, 404); });
test('unreachable host reported as error, run continues', () => { const r = find((r) => r.url.includes(':1/')); assert.equal(r.ok, false); assert.ok(r.error); });
test('cookie banner hidden', async () => {
  // bottom strip of viewport shot should not be the black banner
  const r = find((r) => r.device === 'desktop' && r.format === 'png' && !r.fullPage && !r.selector && r.url.endsWith('/'));
  const { chromium } = await import('playwright');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(`<img id=i src="data:image/png;base64,${r.buffer.toString('base64')}">`);
  const px = await p.evaluate(() => { const i = document.getElementById('i'); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return Array.from(x.getImageData(700, 850, 1, 1).data); });
  await b.close();
  assert.ok(!(px[0] < 20 && px[1] < 20 && px[2] < 20), 'pixel at banner position is black: ' + px);
});

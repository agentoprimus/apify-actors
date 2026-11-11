import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractPdf, closeOcr } from '../src/pdf.js';
const fx = (n) => readFileSync(new URL('./fixtures/' + n, import.meta.url));
after(closeOcr);
test('text pdf: pages, text, no OCR', async () => {
  const r = await extractPdf(fx('text.pdf'), { ocr: 'auto' });
  assert.equal(r.pageCount, 2);
  assert.match(r.pages[0].text, /Quarterly Report/);
  assert.match(r.pages[0].text, /Revenue grew by 42 percent\./);
  assert.match(r.pages[1].text, /Hello from page two/);
  assert.equal(r.ocrPages, 0);
  assert.equal(r.pages[0].method, 'text');
});
test('scanned pdf: OCR recovers text', { timeout: 120000 }, async () => {
  const r = await extractPdf(fx('scanned.pdf'), { ocr: 'auto' });
  assert.equal(r.ocrPages, 1);
  assert.equal(r.pages[0].method, 'ocr');
  assert.match(r.text, /INVOICE\s*12345/i);
});
test('ocr off: scanned pdf yields empty text', async () => {
  const r = await extractPdf(fx('scanned.pdf'), { ocr: 'never' });
  assert.equal(r.ocrPages, 0);
  assert.ok(r.text.length < 5);
});

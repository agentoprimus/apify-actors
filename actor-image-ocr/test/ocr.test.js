import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ocrImage, close } from '../src/ocr.js';
after(close);
for (const f of ['text.png', 'text.jpg', 'text.webp']) {
  test(`ocr ${f}`, { timeout: 120000 }, async () => {
    const r = await ocrImage(readFileSync(new URL('./fixtures/' + f, import.meta.url)), { words: true });
    assert.match(r.text, /ORDER\s*4711\s*PAID/i);
    assert.equal(r.width, 700);
    assert.ok(r.confidence > 60);
    assert.ok(r.wordBoxes.length >= 3);
  });
}
test('bad image rejected', async () => { await assert.rejects(() => ocrImage(Buffer.from('not an image'))); });

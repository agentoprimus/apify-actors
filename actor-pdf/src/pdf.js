// PDF -> text per page (pdf.js), with optional OCR (tesseract.js) for pages without a text layer.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Join text items into lines using their y position; add blank line on big vertical gaps.
function itemsToText(items) {
  const rows = [];
  for (const it of items) {
    if (!('str' in it)) continue;
    const y = Math.round(it.transform[5]);
    const x = it.transform[4];
    let row = rows.find((r) => Math.abs(r.y - y) <= 2);
    if (!row) rows.push((row = { y, parts: [] }));
    row.parts.push({ x, s: it.str, w: it.width || 0 });
  }
  rows.sort((a, b) => b.y - a.y);
  const lines = [];
  let prevY = null;
  for (const r of rows) {
    r.parts.sort((a, b) => a.x - b.x);
    let line = '', end = null;
    for (const p of r.parts) {
      if (end != null && p.x - end > 1.5 && !line.endsWith(' ') && !p.s.startsWith(' ')) line += ' ';
      line += p.s; end = p.x + p.w;
    }
    if (prevY != null && prevY - r.y > 24) lines.push('');
    lines.push(line.replace(/\s+$/, ''));
    prevY = r.y;
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

let ocrWorker = null;
async function ocrPage(page, lang) {
  const { createCanvas } = await import('@napi-rs/canvas');
  const { createWorker } = await import('tesseract.js');
  if (!ocrWorker || ocrWorker.lang !== lang) {
    if (ocrWorker) await ocrWorker.w.terminate();
    ocrWorker = { lang, w: await createWorker(lang) };
  }
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const { data } = await ocrWorker.w.recognize(canvas.toBuffer('image/png'));
  return (data.text || '').trim();
}
export async function closeOcr() { if (ocrWorker) { await ocrWorker.w.terminate(); ocrWorker = null; } }

export async function extractPdf(bytes, { ocr = 'auto', ocrLanguage = 'eng', maxPages = 2000, minChars = 20 } = {}) {
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const numPages = doc.numPages;
  const meta = await doc.getMetadata().catch(() => ({}));
  const info = meta?.info || {};
  const pages = [];
  let ocrPages = 0;
  const n = Math.min(numPages, maxPages);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let text = itemsToText(tc.items);
    let method = 'text';
    if (ocr === 'always' || (ocr === 'auto' && text.replace(/\s/g, '').length < minChars)) {
      const t = await ocrPage(page, ocrLanguage);
      if (t.length > text.length) { text = t; method = 'ocr'; }
      ocrPages++;
    }
    pages.push({ page: i, method, chars: text.length, text });
    page.cleanup();
  }
  await task.destroy();
  const text = pages.map((p) => p.text).join('\n\n');
  return {
    pageCount: numPages, pagesExtracted: pages.length, ocrPages,
    title: info.Title || null, author: info.Author || null, subject: info.Subject || null, keywords: info.Keywords || null,
    creator: info.Creator || null, producer: info.Producer || null,
    creationDate: info.CreationDate || null, modDate: info.ModDate || null,
    chars: text.length, words: (text.match(/\S+/g) || []).length, text, pages,
  };
}

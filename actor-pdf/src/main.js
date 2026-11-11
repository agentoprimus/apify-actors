import { Actor, log } from 'apify';
import { extractPdf, closeOcr } from './pdf.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const urls = [...new Set((input.pdfUrls || []).map((u) => (typeof u === 'string' ? u : u.url)).filter((u) => /^https?:\/\//.test(u || '')))].slice(0, 5000);
if (!urls.length) throw new Error('Provide at least one PDF URL in "pdfUrls".');
const ocr = ['auto', 'never', 'always'].includes(input.ocr) ? input.ocr : 'auto';
const maxBytes = 100 * 1024 * 1024;
log.info(`Extracting ${urls.length} PDF(s), OCR: ${ocr}`);
let ok = 0;
for (const url of urls) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; PDFTextExtractor/0.1)' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const len = Number(r.headers.get('content-length') || 0);
    if (len > maxBytes) throw new Error(`PDF too large (${Math.round(len / 1e6)} MB, max 100 MB)`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Not a PDF (content-type ${r.headers.get('content-type')})`);
    const res = await extractPdf(buf, { ocr, ocrLanguage: input.ocrLanguage || 'eng', maxPages: input.maxPages || 2000 });
    const row = { url, ok: true, fileSizeBytes: buf.length, ...res };
    if (input.includePages === false) delete row.pages;
    await Actor.pushData(row);
    await Actor.charge({ eventName: 'pdf-processed', count: 1 });
    if (res.ocrPages) await Actor.charge({ eventName: 'ocr-page', count: res.ocrPages });
    ok++;
    log.info(`ok  ${url}: ${res.pagesExtracted} pages, ${res.words} words${res.ocrPages ? `, ${res.ocrPages} OCR` : ''}`);
  } catch (e) {
    await Actor.pushData({ url, ok: false, error: String(e.message || e).split('\n')[0] }); // not charged
    log.info(`ERR ${url}: ${e.message}`);
  }
}
await closeOcr();
log.info(`Done: ${ok}/${urls.length} PDFs extracted.`);
await Actor.exit();

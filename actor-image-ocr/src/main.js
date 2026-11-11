import { Actor, log } from 'apify';
import { ocrImage, close } from './ocr.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const urls = [...new Set((input.imageUrls || []).map((u) => (typeof u === 'string' ? u : u.url)).filter((u) => /^https?:\/\//.test(u || '')))].slice(0, 10000);
if (!urls.length) throw new Error('Provide at least one image URL in "imageUrls".');
const lang = (input.languages?.length ? input.languages : ['eng']).join('+');
log.info(`OCR on ${urls.length} image(s), language(s): ${lang}`);
let ok = 0;
for (const url of urls) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ImageOCR/0.1)' }, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 40 * 1024 * 1024) throw new Error('Image too large (max 40 MB)');
    const res = await ocrImage(buf, { lang, words: !!input.includeWordBoxes });
    await Actor.pushData({ url, ok: true, ...res });
    await Actor.charge({ eventName: 'image-ocr', count: 1 });
    ok++;
    log.info(`ok  ${url}: ${res.words} words, confidence ${res.confidence}`);
  } catch (e) {
    await Actor.pushData({ url, ok: false, error: String(e.message || e).split('\n')[0] }); // not charged
    log.info(`ERR ${url}: ${e.message}`);
  }
}
await close();
log.info(`Done: ${ok}/${urls.length} images read.`);
await Actor.exit();

// Image -> text with tesseract.js. Images are decoded with @napi-rs/canvas (PNG/JPEG/WebP/GIF/AVIF/BMP),
// small images are upscaled for better accuracy.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

let W = null;
export async function getWorker(lang) {
  if (W && W.lang === lang) return W.w;
  if (W) await W.w.terminate();
  W = { lang, w: await createWorker(lang) };
  return W.w;
}
export async function close() { if (W) { await W.w.terminate(); W = null; } }

export async function prepare(buf) {
  const img = await loadImage(buf);
  const scale = Math.max(img.width, img.height) < 1000 ? 2 : 1;
  const c = createCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // flatten transparency
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { png: c.toBuffer('image/png'), width: img.width, height: img.height };
}

export async function ocrImage(buf, { lang = 'eng', words = false } = {}) {
  const { png, width, height } = await prepare(buf);
  const w = await getWorker(lang);
  const { data } = await w.recognize(png, {}, { text: true, blocks: words });
  const text = (data.text || '').trim();
  const out = { width, height, text, chars: text.length, words: (text.match(/\S+/g) || []).length, confidence: Math.round(data.confidence ?? 0) };
  if (words && data.blocks) {
    const list = [];
    for (const b of data.blocks) for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const wd of l.words || []) list.push({ text: wd.text, confidence: Math.round(wd.confidence), bbox: wd.bbox });
    out.wordBoxes = list;
  }
  return out;
}

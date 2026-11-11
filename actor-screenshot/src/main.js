import { Actor, log } from 'apify';
import { shootAll, DEVICES } from './shoot.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const urls = (input.urls || []).map((u) => (typeof u === 'string' ? u : u.url)).filter((u) => /^https?:\/\//.test(u || ''));
if (!urls.length) throw new Error('Provide at least one http(s) URL in "urls".');
const devices = (input.devices?.length ? input.devices : ['desktop']).filter((d) => DEVICES[d]);
const format = ['png', 'jpeg', 'pdf'].includes(input.format) ? input.format : 'png';
const jobs = [];
for (const url of urls.slice(0, 5000)) for (const device of devices) jobs.push({
  url, device, format, fullPage: !!input.fullPage, selector: input.selector || null, quality: input.quality || 80,
  delayMs: input.delayMs || 0, waitForSelector: input.waitForSelector || null, waitUntil: input.waitUntil || 'load',
  hideCookieBanners: input.hideCookieBanners !== false, darkMode: !!input.darkMode, scrollToLoad: input.scrollToLoad !== false,
  hideSelectors: (input.hideSelectors || []).filter(Boolean),
});
log.info(`Taking ${jobs.length} screenshot(s): ${urls.length} URL(s) x ${devices.join(', ')}`);

const store = await Actor.openKeyValueStore();
const storeId = store.id || Actor.getEnv().defaultKeyValueStoreId;
const ext = format === 'jpeg' ? 'jpg' : format;
let n = 0, ok = 0;
await shootAll(jobs, {
  concurrency: Math.min(Math.max(1, input.maxConcurrency || 3), 8),
  log: (m) => log.info(m),
  onResult: async (r) => {
    n++;
    const row = { url: r.url, device: r.device, format: r.format, fullPage: r.fullPage, selector: r.selector, ok: r.ok, status: r.status ?? null, finalUrl: r.finalUrl ?? null, title: r.title ?? null, error: r.error ?? null };
    if (r.ok) {
      const key = `screenshot-${String(n).padStart(5, '0')}-${r.device}.${ext}`;
      await store.setValue(key, r.buffer, { contentType: r.contentType });
      row.key = key; row.bytes = r.bytes;
      row.screenshotUrl = storeId ? `https://api.apify.com/v2/key-value-stores/${storeId}/records/${key}` : key;
      row.httpError = r.status != null && r.status >= 400; // e.g. 403 bot protection, 404
      await Actor.pushData(row);
      if (!row.httpError) { await Actor.charge({ eventName: 'screenshot', count: 1 }); ok++; } // HTTP errors not charged
    } else {
      await Actor.pushData(row); // failed shots are listed but not charged
    }
  },
});
log.info(`Done: ${ok}/${jobs.length} screenshots OK.`);
await Actor.exit();

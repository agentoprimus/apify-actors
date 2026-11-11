import { Actor, log } from 'apify';
import { checkUrl } from './check.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const urls = [...new Set((input.urls || []).map((u) => (typeof u === 'string' ? u : u.url)).filter(Boolean).map((u) => u.trim()).map((u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u)))].slice(0, 50000);
if (!urls.length) throw new Error('Provide at least one URL in "urls".');
const conc = Math.min(Math.max(1, input.maxConcurrency || 10), 30);
const perHostDelay = 500; // be polite: max ~2 requests/second per host
const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
log.info(`Checking ${urls.length} URL(s), ${conc} in parallel`);
const q = [...urls]; let n = 0;
await Promise.all(Array.from({ length: conc }, async () => {
  while (q.length) {
    const url = q.shift();
    const host = (() => { try { return new URL(url).host; } catch { return url; } })();
    const wait = (lastHit.get(host) || 0) + perHostDelay - Date.now();
    lastHit.set(host, Date.now() + Math.max(0, wait));
    if (wait > 0) await sleep(wait);
    const r = await checkUrl(url, { ssl: input.checkSsl !== false, timeoutMs: (input.timeoutSecs || 20) * 1000, maxRedirects: input.maxRedirects ?? 10 });
    await Actor.pushData(r);
    await Actor.charge({ eventName: 'url-checked', count: 1 });
    if (++n % 200 === 0) log.info(`${n}/${urls.length}`);
  }
}));
log.info(`Done: ${n} URLs checked.`);
await Actor.exit();

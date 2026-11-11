import { Actor, log } from 'apify';
import { discoverSitemaps, extract, checkStatuses } from './sitemap.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const { startUrls = [], maxUrls = 10000, checkStatus = false, sameOriginOnly = false } = input;
const list = startUrls.map((u) => (typeof u === 'string' ? u : u.url)).filter((u) => /^https?:\/\//.test(u || ''));
if (!list.length) throw new Error('Provide at least one website or sitemap URL in "startUrls".');

// A plain site URL -> discover via robots.txt; a URL that looks like a sitemap -> use directly.
const seeds = [];
for (const u of list) {
  if (/\.xml(\.gz)?($|\?)|sitemap/i.test(new URL(u).pathname)) seeds.push(u);
  else seeds.push(...(await discoverSitemaps(u)));
}
const cap = Math.min(Math.max(1, maxUrls), 100000);
const { sitemaps, urls } = await extract(seeds, { maxUrls: cap, sameOriginOnly, log: (m) => log.info(m) });
if (checkStatus) await checkStatuses(urls, { log: (m) => log.info(m) });

await Actor.pushData(urls);
await Actor.setValue('SITEMAPS', sitemaps);
await Actor.charge({ eventName: 'url-extracted', count: urls.length });
if (checkStatus) await Actor.charge({ eventName: 'url-status-checked', count: urls.length });
const bad = sitemaps.filter((s) => s.error).length;
log.info(`Done: ${urls.length} URLs from ${sitemaps.length} sitemaps${bad ? ` (${bad} failed, see SITEMAPS)` : ''}.`);
await Actor.exit();

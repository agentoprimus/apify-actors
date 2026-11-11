// Apify actor entry point.
import { Actor, log } from 'apify';
import { audit } from './audit.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const { startUrl, maxPages = 10, lighthousePages = 1, formFactor = 'mobile', checkExternalLinks = true, renderJs = false } = input;
if (!startUrl || !/^https?:\/\//.test(startUrl)) throw new Error('Input "startUrl" must be an http(s) URL.');

const r = await audit(startUrl, {
  maxPages: Math.min(Math.max(1, maxPages), 500),
  lighthousePages: Math.min(Math.max(0, lighthousePages), 20),
  formFactor,
  checkExternal: checkExternalLinks,
  renderJs,
  log: (m) => log.info(m),
});

// Dataset: one row per page (with its Lighthouse result if any)
const lhByUrl = new Map(r.lighthouse.map((l) => [l.url, l]));
await Actor.pushData(r.pages.map((p) => ({ ...p, lighthouse: lhByUrl.get(p.finalUrl || p.url) || null })));
await Actor.setValue('SUMMARY', r.summary);
await Actor.setValue('BROKEN_LINKS', r.brokenLinks);
await Actor.setValue('REPORT', r.html, { contentType: 'text/html' });

// Pay-per-event charges (no-ops when the actor isn't monetized / running locally)
const crawled = r.pages.filter((p) => !p.skipped).length;
await Actor.charge({ eventName: 'page-audited', count: crawled });
const lhDone = r.lighthouse.filter((l) => l.scores).length;
if (lhDone) await Actor.charge({ eventName: 'lighthouse-page', count: lhDone });

const storeId = Actor.getEnv().defaultKeyValueStoreId;
log.info(`Done. Health ${r.summary.healthScore}/100, ${r.summary.counts.error} errors, ${r.summary.counts.warn} warnings.`);
if (storeId) log.info(`Report: https://api.apify.com/v2/key-value-stores/${storeId}/records/REPORT`);
await Actor.exit();

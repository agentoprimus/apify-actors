import { Actor, log } from 'apify';
import { withBrowser, collect } from './collect.js';
import { analyze } from './detect.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const raw = (input.urls || []).map((u) => (typeof u === 'string' ? u : u.url)).filter(Boolean).map((u) => u.trim());
const bare = new Set(raw.filter((u) => !/^https?:\/\//i.test(u)).map((u) => 'https://' + u));
let urls = raw.map((u) => (/^https?:\/\//i.test(u) ? u : 'https://' + u)); // accept bare domains
urls = [...new Set(urls)].slice(0, 10000);
if (!urls.length) throw new Error('Provide at least one website or domain in "urls".');
const concurrency = Math.min(Math.max(1, input.maxConcurrency || 4), 10);
log.info(`Detecting technologies on ${urls.length} site(s), ${concurrency} in parallel`);

let ok = 0;
await withBrowser(async (browser) => {
  const queue = [...urls];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const url = queue.shift();
      let row;
      try {
        const opts = { timeoutMs: 30000, waitMs: input.waitMs ?? 2500 };
        let page;
        try { page = await collect(browser, url, opts); }
        catch (e) { if (!bare.has(url)) throw e; page = await collect(browser, url.replace(/^https:/, 'http:'), opts); } // bare domain without TLS
        const technologies = analyze(page);
        const byCategory = {};
        for (const t of technologies) for (const c of t.categories) (byCategory[c] ||= []).push(t.name);
        row = { url, finalUrl: page.finalUrl, domain: new URL(page.finalUrl).hostname, status: page.status, title: page.title, ok: true,
          technologyCount: technologies.length, technologyNames: technologies.map((t) => t.name), byCategory,
          technologies: input.includeEvidence ? technologies : technologies.map(({ evidence, ...t }) => t) };
        row.httpError = page.status != null && page.status >= 400; // e.g. 403 bot protection: result likely incomplete
        await Actor.pushData(row);
        if (!row.httpError) { await Actor.charge({ eventName: 'site-analyzed', count: 1 }); ok++; } // HTTP errors not charged
        log.info(`ok  ${url}: ${technologies.length} technologies`);
      } catch (e) {
        row = { url, ok: false, error: String(e.message || e).split('\n')[0] };
        await Actor.pushData(row); // failures are listed but not charged
        log.info(`ERR ${url}: ${row.error}`);
      }
    }
  }));
});
log.info(`Done: ${ok}/${urls.length} sites analyzed.`);
await Actor.exit();

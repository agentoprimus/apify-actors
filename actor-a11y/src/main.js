import { Actor, log } from 'apify';
import { withBrowser, auditPage } from './audit.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const start = [...new Set((input.startUrls || []).map((u) => (typeof u === 'string' ? u : u.url)).filter((u) => /^https?:\/\//.test(u || '')))];
if (!start.length) throw new Error('Provide at least one URL in "startUrls".');
const maxPages = Math.min(Math.max(1, input.maxPages ?? start.length), 1000);
const crawl = !!input.crawlSameDomain;
const opts = { standard: input.standard || 'wcag21aa', bestPractices: !!input.bestPractices, mobile: input.device === 'mobile' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const queue = [...start], seen = new Set(start), results = [];
const origins = new Set(start.map((u) => new URL(u).origin));
await withBrowser(async (browser) => {
  while (queue.length && results.length < maxPages) {
    const url = queue.shift();
    let r;
    try {
      r = await auditPage(browser, url, opts);
      if (crawl) for (const l of r.links) { try { const u = new URL(l); u.hash = ''; const h = u.href; if (origins.has(u.origin) && !seen.has(h) && !/\.(pdf|jpe?g|png|gif|svg|zip|mp4|webp)$/i.test(u.pathname)) { seen.add(h); queue.push(h); } } catch {} }
      delete r.links;
      r.httpError = r.status != null && r.status >= 400;
      await Actor.pushData(r);
      if (!r.httpError) await Actor.charge({ eventName: 'page-audited', count: 1 });
      log.info(`ok  ${url}: score ${r.score}, ${r.violationRules} rules violated (${r.byImpact.critical} critical)`);
    } catch (e) {
      r = { url, ok: false, error: String(e.message || e).split('\n')[0] };
      await Actor.pushData(r);
      log.info(`ERR ${url}: ${r.error}`);
    }
    results.push(r);
    if (crawl) await new Promise((ok) => setTimeout(ok, 1000)); // polite: 1 page/s when crawling
  }
});
// Site summary + HTML report
const okR = results.filter((r) => r.ok);
const rules = {};
for (const r of okR) for (const v of r.violations) { const x = (rules[v.id] ||= { id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, wcag: v.wcag, pages: 0, nodes: 0 }); x.pages++; x.nodes += v.nodeCount; }
const top = Object.values(rules).sort((a, b) => b.nodes - a.nodes);
const summary = { pagesAudited: okR.length, standard: opts.standard, averageScore: okR.length ? Math.round(okR.reduce((s, r) => s + r.score, 0) / okR.length) : null,
  critical: okR.reduce((s, r) => s + r.byImpact.critical, 0), serious: okR.reduce((s, r) => s + r.byImpact.serious, 0), topIssues: top };
await Actor.setValue('SUMMARY', summary);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accessibility audit</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1000px;margin:auto;padding:16px;color:#1d1d1f}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top;word-break:break-word}.critical{color:#b00020;font-weight:600}.serious{color:#c25400;font-weight:600}.tiles{display:flex;gap:8px;flex-wrap:wrap}.t{border:1px solid #ddd;border-radius:8px;padding:10px 14px;text-align:center}.t b{display:block;font-size:24px}</style></head><body>
<h1>Accessibility audit (${esc(opts.standard.toUpperCase())})</h1><div class="tiles"><div class="t"><b>${summary.averageScore ?? '-'}</b>Avg score</div><div class="t"><b>${summary.pagesAudited}</b>Pages</div><div class="t"><b>${summary.critical}</b>Critical</div><div class="t"><b>${summary.serious}</b>Serious</div></div>
<h2>Issues across the site</h2><table><tr><th>Issue</th><th>Impact</th><th>WCAG</th><th>Pages</th><th>Elements</th></tr>${top.map((v) => `<tr><td><a href="${esc(v.helpUrl)}">${esc(v.help)}</a><br><small>${esc(v.id)}</small></td><td class="${esc(v.impact)}">${esc(v.impact)}</td><td>${esc(v.wcag.join(', '))}</td><td>${v.pages}</td><td>${v.nodes}</td></tr>`).join('')}</table>
<h2>Pages</h2><table><tr><th>URL</th><th>Score</th><th>Critical</th><th>Serious</th><th>Rules violated</th></tr>${results.map((r) => r.ok ? `<tr><td>${esc(r.url)}</td><td>${r.score}</td><td>${r.byImpact.critical}</td><td>${r.byImpact.serious}</td><td>${r.violations.map((v) => esc(v.id)).join(', ')}</td></tr>` : `<tr><td>${esc(r.url)}</td><td colspan="4">error: ${esc(r.error)}</td></tr>`).join('')}</table>
<p><small>Automated testing with axe-core finds a large share of WCAG issues but not all of them; manual review is still needed for full conformance.</small></p></body></html>`;
await Actor.setValue('REPORT', html, { contentType: 'text/html' });
log.info(`Done: ${okR.length} page(s), average score ${summary.averageScore}.`);
await Actor.exit();

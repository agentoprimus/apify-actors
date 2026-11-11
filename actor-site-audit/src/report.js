// Builds a self-contained HTML report from audit results.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEIGHT = { error: 3, warn: 1, info: 0 };

export function summarize({ site, pages, brokenLinks, lighthouse = [] }) {
  const all = [...site.issues, ...pages.flatMap((p) => (p.issues || []).map((i) => ({ ...i, url: p.url })))];
  const byCode = {};
  for (const i of all) (byCode[i.code] ||= { code: i.code, level: i.level, msg: i.msg, fix: i.fix, count: 0, urls: [] }).count++, byCode[i.code].urls.push(i.url || site.origin);
  const counts = { error: 0, warn: 0, info: 0 };
  for (const i of all) counts[i.level]++;
  // broken internal links already counted as page http-errors
  counts.error += brokenLinks.filter((b) => !pages.some((p) => p.url === b.url)).length;
  const analyzed = pages.filter((p) => p.title !== undefined).length || 1;
  const penalty = (counts.error * WEIGHT.error + counts.warn * WEIGHT.warn) / analyzed;
  const healthScore = Math.max(0, Math.round(100 - penalty * 8));
  const lhOk = lighthouse.filter((l) => l.scores);
  const avg = (k) => (lhOk.length ? Math.round(lhOk.reduce((s, l) => s + (l.scores[k] ?? 0), 0) / lhOk.length) : null);
  return {
    origin: site.origin,
    pagesCrawled: pages.length,
    healthScore,
    counts,
    brokenLinks: brokenLinks.length,
    lighthouseAvg: lhOk.length ? { performance: avg('performance'), accessibility: avg('accessibility'), bestPractices: avg('best-practices'), seo: avg('seo') } : null,
    topIssues: Object.values(byCode).sort((a, b) => WEIGHT[b.level] - WEIGHT[a.level] || b.count - a.count),
  };
}

export function renderHtml(summary, { pages, brokenLinks, lighthouse = [] }) {
  const badge = (lvl) => `<span class="b ${lvl}">${lvl}</span>`;
  const scoreCls = (n) => (n == null ? '' : n >= 90 ? 'good' : n >= 50 ? 'mid' : 'bad');
  const tile = (label, n) => `<div class="tile ${scoreCls(n)}"><div class="n">${n ?? '–'}</div><div>${label}</div></div>`;
  const lh = summary.lighthouseAvg;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site audit – ${esc(summary.origin)}</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;max-width:1000px;margin:auto;padding:16px;color:#1d1d1f;background:#fff}
h1{font-size:22px}h2{font-size:18px;margin-top:32px}table{border-collapse:collapse;width:100%;font-size:13px}
td,th{border-bottom:1px solid #e5e5e5;padding:6px;text-align:left;vertical-align:top;word-break:break-all}
.tiles{display:flex;flex-wrap:wrap;gap:8px}.tile{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:100px;text-align:center}
.tile .n{font-size:26px;font-weight:600}.good .n{color:#0a7f3f}.mid .n{color:#b26a00}.bad .n{color:#c62828}
.b{font-size:11px;padding:1px 6px;border-radius:4px;color:#fff}.error{background:#c62828}.warn{background:#b26a00}.info{background:#607d8b}
details{margin:4px 0}small{color:#666}
</style></head><body>
<h1>Site audit: ${esc(summary.origin)}</h1>
<small>${summary.pagesCrawled} pages crawled · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</small>
<div class="tiles">${tile('Health', summary.healthScore)}${lh ? tile('Performance', lh.performance) + tile('Accessibility', lh.accessibility) + tile('Best practices', lh.bestPractices) + tile('SEO', lh.seo) : ''}
<div class="tile"><div class="n">${summary.counts.error}</div><div>Errors</div></div><div class="tile"><div class="n">${summary.counts.warn}</div><div>Warnings</div></div></div>
<h2>Issues by type</h2><table><tr><th>Level</th><th>Issue</th><th>Pages</th></tr>
${summary.topIssues.map((i) => `<tr><td>${badge(i.level)}</td><td>${esc(i.code)}<br><small>${esc(i.msg)}</small>${i.fix ? `<br><small><b>Fix:</b> ${esc(i.fix)}</small>` : ''}</td><td><details><summary>${i.count}</summary>${i.urls.map(esc).join('<br>')}</details></td></tr>`).join('')}
</table>
<h2>Broken links (${brokenLinks.length})</h2>${brokenLinks.length ? `<table><tr><th>Link</th><th>Status</th><th>Found on</th></tr>${brokenLinks.map((b) => `<tr><td>${esc(b.url)}</td><td>${esc(b.status)}</td><td>${b.foundOn.map(esc).join('<br>')}</td></tr>`).join('')}</table>` : '<p>None found.</p>'}
${lighthouse.length ? `<h2>Lighthouse (${esc(lighthouse[0].formFactor)})</h2><table><tr><th>Page</th><th>Perf</th><th>A11y</th><th>BP</th><th>SEO</th><th>LCP</th><th>CLS</th><th>Top problems</th></tr>
${lighthouse.map((l) => l.error ? `<tr><td>${esc(l.url)}</td><td colspan="7">error: ${esc(l.error)}</td></tr>` : `<tr><td>${esc(l.url)}</td><td>${l.scores.performance}</td><td>${l.scores.accessibility}</td><td>${l.scores['best-practices']}</td><td>${l.scores.seo}</td><td>${l.metrics.lcpMs == null ? '–' : (l.metrics.lcpMs / 1000).toFixed(1) + 's'}</td><td>${l.metrics.cls == null ? '–' : l.metrics.cls.toFixed(3)}</td><td>${l.failing.slice(0, 5).map((f) => esc(f.title)).join('<br>')}</td></tr>`).join('')}</table>` : ''}
<h2>Pages</h2><table><tr><th>URL</th><th>Score</th><th>Status</th><th>Title</th><th>Issues</th></tr>
${pages.map((p) => `<tr><td>${esc(p.url)}</td><td>${p.score ?? '–'}</td><td>${p.skipped ? 'skipped (' + esc(p.skipped) + ')' : esc(p.initialStatus ? p.initialStatus + '→' + p.status : p.status)}</td><td>${esc(p.title)}</td><td>${(p.issues || []).map((i) => badge(i.level) + ' ' + esc(i.code)).join('<br>')}</td></tr>`).join('')}
</table></body></html>`;
}

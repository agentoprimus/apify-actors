// Full audit: crawl -> Lighthouse on top pages -> summary + HTML report. Platform-independent.
import { crawl } from './crawl.js';
import { runLighthouse } from './lighthouse.js';
import { summarize, renderHtml } from './report.js';

export async function audit(startUrl, { maxPages = 20, lighthousePages = 3, formFactor = 'mobile', checkExternal = true, log = () => {} } = {}) {
  const res = await crawl(startUrl, { maxPages, checkExternal, log });
  const lhTargets = res.pages.filter((p) => p.status === 200 && p.title !== undefined && !p.redirectsToAnalyzedPage)
    .slice(0, lighthousePages).map((p) => p.finalUrl || p.url);
  const lighthouse = lighthousePages > 0 && lhTargets.length ? await runLighthouse(lhTargets, { formFactor, log }) : [];
  const full = { ...res, lighthouse };
  const summary = summarize(full);
  return { summary, ...full, html: renderHtml(summary, full) };
}

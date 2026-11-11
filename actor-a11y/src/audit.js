// WCAG accessibility audit with axe-core in Chromium.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

export const STANDARDS = {
  'wcag2a': ['wcag2a'], 'wcag2aa': ['wcag2a', 'wcag2aa'], 'wcag21aa': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  'wcag22aa': ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
};
const W = { critical: 10, serious: 5, moderate: 2, minor: 1 };

export async function withBrowser(fn) { const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] }); try { return await fn(b); } finally { await b.close(); } }

export async function auditPage(browser, url, { standard = 'wcag21aa', bestPractices = false, timeoutMs = 45000, mobile = false, maxNodes = 5 } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    await page.waitForTimeout(1000);
    await page.addScriptTag({ content: AXE });
    const tags = [...(STANDARDS[standard] || STANDARDS.wcag21aa), ...(bestPractices ? ['best-practice'] : [])];
    const r = await page.evaluate(async (tags) => {
      // eslint-disable-next-line no-undef
      const res = await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] });
      return { violations: res.violations, incomplete: res.incomplete.length, passes: res.passes.length, axeVersion: res.testEngine?.version };
    }, tags);
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href)).catch(() => []);
    const violations = r.violations.map((v) => ({
      id: v.id, impact: v.impact, description: v.description, help: v.help, helpUrl: v.helpUrl,
      wcag: v.tags.filter((t) => /^wcag\d|^best-practice$/.test(t)), nodeCount: v.nodes.length,
      examples: v.nodes.slice(0, maxNodes).map((n) => ({ target: n.target.join(' '), html: (n.html || '').slice(0, 300), fix: (n.failureSummary || '').slice(0, 400) })),
    })).sort((a, b) => (W[b.impact] || 0) - (W[a.impact] || 0) || b.nodeCount - a.nodeCount);
    const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const v of violations) byImpact[v.impact] = (byImpact[v.impact] || 0) + v.nodeCount;
    const penalty = violations.reduce((s, v) => s + (W[v.impact] || 1) * Math.min(v.nodeCount, 10), 0);
    return {
      url, ok: true, status: resp?.status() ?? null, finalUrl: page.url(), title: await page.title().catch(() => ''), standard,
      score: Math.max(0, 100 - penalty), violationRules: violations.length, violationNodes: Object.values(byImpact).reduce((a, b) => a + b, 0),
      byImpact, rulesPassed: r.passes, needsReview: r.incomplete, axeVersion: r.axeVersion, violations, links,
    };
  } finally { await ctx.close(); }
}

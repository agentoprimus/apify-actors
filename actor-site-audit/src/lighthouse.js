// Runs Lighthouse on a list of URLs with one shared headless Chromium.
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';

export async function runLighthouse(urls, { formFactor = 'mobile', log = () => {} } = {}) {
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const results = [];
  try {
    for (const url of urls) {
      log(`lighthouse: ${url}`);
      try {
        const flags = { port: chrome.port, output: 'json', logLevel: 'error' };
        const config = formFactor === 'desktop'
          ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttlingMethod: 'simulate' } }
          : undefined;
        const { lhr } = await lighthouse(url, flags, config);
        const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, v.score == null ? null : Math.round(v.score * 100)]));
        const a = lhr.audits;
        const metrics = {
          lcpMs: a['largest-contentful-paint']?.numericValue ?? null,
          cls: a['cumulative-layout-shift']?.numericValue ?? null,
          tbtMs: a['total-blocking-time']?.numericValue ?? null,
          fcpMs: a['first-contentful-paint']?.numericValue ?? null,
        };
        // Top failing audits (score < 0.9), most impactful first
        const failing = Object.values(a)
          .filter((x) => x.score !== null && x.score < 0.9 && ['binary', 'numeric', 'metricSavings'].includes(x.scoreDisplayMode))
          .sort((x, y) => x.score - y.score)
          .slice(0, 10)
          .map((x) => ({ id: x.id, title: x.title, score: Math.round(x.score * 100), displayValue: x.displayValue || '' }));
        results.push({ url, formFactor, scores, metrics, failing });
      } catch (e) {
        results.push({ url, formFactor, error: String(e.message || e) });
      }
    }
  } finally {
    await chrome.kill();
  }
  return results;
}

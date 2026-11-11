// Screenshot engine: one browser, many URLs x devices. Platform-independent (used by main.js and tests).
import { chromium } from 'playwright';

export const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  laptop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
};

// Common consent/cookie banner containers (hidden, not clicked: we never accept/decline on the user's behalf).
const BANNER_CSS = `
#onetrust-banner-sdk,#onetrust-consent-sdk,.onetrust-pc-dark-filter,#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,
#usercentrics-root,#didomi-host,.didomi-popup-backdrop,#qc-cmp2-container,.qc-cmp2-container,#truste-consent-track,
.cc-window,.cc-banner,#cookie-law-info-bar,.cky-consent-container,.cky-overlay,#cmplz-cookiebanner-container,
.fc-consent-root,#sp_message_container,[id^="sp_message_container"],.osano-cm-window,#hs-eu-cookie-confirmation,
#cookiescript_injected,.cookie-banner,.cookie-consent,.cookie-notice,#cookie-banner,#cookie-consent,#cookie-notice,
[aria-label*="cookie" i][role="dialog"],[class*="CookieBanner"],[class*="cookieBanner"],[id*="cookie-banner"]
{display:none!important;visibility:hidden!important}
html,body{overflow:auto!important}`;

export async function shootAll(jobs, { log = () => {}, onResult = async () => {}, concurrency = 2, timeoutMs = 45000 } = {}) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const queue = [...jobs];
  const results = [];
  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      const r = await shootOne(browser, job, { timeoutMs }).catch((e) => ({ ...meta(job), ok: false, error: String(e.message || e).split('\n')[0] }));
      log(`${r.ok ? 'ok ' : 'ERR'} ${job.device} ${job.url}${r.ok ? '' : ' - ' + r.error}`);
      results.push(r);
      await onResult(r);
    }
  }
  try { await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker)); }
  finally { await browser.close(); }
  return results;
}

const meta = (j) => ({ url: j.url, device: j.device, format: j.format, fullPage: j.fullPage, selector: j.selector || null });

async function shootOne(browser, job, { timeoutMs }) {
  const dev = DEVICES[job.device] || DEVICES.desktop;
  const ctx = await browser.newContext({ ...dev, colorScheme: job.darkMode ? 'dark' : 'light', locale: 'en-US' });
  const page = await ctx.newPage();
  try {
    const t0 = Date.now();
    const resp = await page.goto(job.url, { waitUntil: job.waitUntil || 'load', timeout: timeoutMs });
    if (job.hideCookieBanners !== false) await page.addStyleTag({ content: BANNER_CSS }).catch(() => {});
    if (job.waitForSelector) await page.waitForSelector(job.waitForSelector, { timeout: Math.min(timeoutMs, 30000) });
    if (job.scrollToLoad && job.fullPage) await autoScroll(page);
    if (job.delayMs) await page.waitForTimeout(Math.min(job.delayMs, 20000));
    if (job.hideSelectors?.length) await page.addStyleTag({ content: job.hideSelectors.join(',') + '{visibility:hidden!important}' }).catch(() => {});
    const title = await page.title().catch(() => '');
    let buf, contentType;
    if (job.format === 'pdf') {
      buf = await page.pdf({ printBackground: true, format: 'A4' });
      contentType = 'application/pdf';
    } else {
      const type = job.format === 'jpeg' ? 'jpeg' : 'png';
      const opts = { type, ...(type === 'jpeg' ? { quality: job.quality || 80 } : {}), animations: 'disabled', timeout: timeoutMs };
      if (job.selector) {
        const el = page.locator(job.selector).first();
        await el.waitFor({ timeout: 10000 });
        buf = await el.screenshot(opts);
      } else {
        buf = await page.screenshot({ ...opts, fullPage: !!job.fullPage });
      }
      contentType = 'image/' + type;
    }
    return { ...meta(job), ok: true, status: resp?.status() ?? null, finalUrl: page.url(), title, bytes: buf.length, ms: Date.now() - t0, contentType, buffer: buf };
  } finally {
    await ctx.close();
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0, i = 0; y < document.body.scrollHeight && i < 40; y += step, i++) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
}

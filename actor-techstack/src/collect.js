// Loads a page in Chromium and collects the signals the fingerprints need.
import { chromium } from 'playwright';
import { loadDb } from './detect.js';

function domSpecs() {
  const specs = {};
  for (const t of loadDb().list) for (const [sel, spec] of Object.entries(t.dom)) {
    const s = (specs[sel] ||= { attributes: new Set(), properties: new Set(), text: false });
    if (spec && typeof spec === 'object') {
      for (const a of Object.keys(spec.attributes || {})) s.attributes.add(a);
      for (const a of Object.keys(spec.properties || {})) s.properties.add(a);
      if (spec.text != null) s.text = true;
    }
  }
  return Object.entries(specs).map(([sel, s]) => [sel, [...s.attributes], [...s.properties], s.text]);
}

let PROBES;
function probeLists() {
  if (PROBES) return PROBES;
  const js = new Set();
  for (const t of loadDb().list) for (const k of Object.keys(t.js)) js.add(k);
  return (PROBES = { js: [...js], dom: domSpecs() });
}

export async function withBrowser(fn) {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try { return await fn(browser); } finally { await browser.close(); }
}

export async function collect(browser, url, { timeoutMs = 30000, waitMs = 2500 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, userAgent: undefined, locale: 'en-US' });
  const page = await ctx.newPage();
  const scriptSrc = new Set();
  page.on('request', (r) => { if (r.resourceType() === 'script') scriptSrc.add(r.url()); });
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForLoadState('load', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});
    await page.waitForTimeout(waitMs);
    const headers = resp ? await resp.allHeaders() : {};
    const cookies = Object.fromEntries((await ctx.cookies()).map((c) => [c.name, c.value]));
    const html = await page.content();
    const { js, dom } = probeLists();
    const inPage = await page.evaluate(({ js, dom }) => {
      const out = { js: {}, dom: {}, meta: {}, scripts: [], scriptSrc: [], text: '' };
      for (const path of js) {
        try {
          let v = window;
          for (const part of path.split('.')) { if (v == null) break; v = v[part]; }
          if (v !== undefined && v !== null) out.js[path] = typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
        } catch {}
      }
      for (const [sel, attrs, props, wantText] of dom) {
        let el = null;
        try { el = document.querySelector(sel); } catch {}
        if (!el) continue;
        const d = { exists: true, attributes: {}, properties: {} };
        for (const a of attrs) { const v = el.getAttribute(a); if (v != null) d.attributes[a] = v; }
        for (const p of props) { try { const v = el[p]; if (v !== undefined) d.properties[p] = typeof v === 'object' ? '' : String(v); } catch {} }
        if (wantText) d.text = (el.textContent || '').slice(0, 500);
        out.dom[sel] = d;
      }
      for (const m of document.querySelectorAll('meta')) {
        const k = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv');
        if (k) out.meta[k.toLowerCase()] = m.getAttribute('content') || '';
      }
      for (const s of document.querySelectorAll('script')) {
        if (s.src) out.scriptSrc.push(s.src);
        else if (s.textContent && out.scripts.length < 50) out.scripts.push(s.textContent.slice(0, 20000));
      }
      out.text = (document.body?.innerText || '').slice(0, 50000);
      return out;
    }, { js, dom });
    for (const s of inPage.scriptSrc) scriptSrc.add(s);
    return {
      ok: true, url, finalUrl: page.url(), status: resp?.status() ?? null, title: await page.title().catch(() => ''),
      headers, cookies, html, meta: inPage.meta, scripts: inPage.scripts, scriptSrc: [...scriptSrc], text: inPage.text, js: inPage.js, dom: inPage.dom,
    };
  } finally {
    await ctx.close();
  }
}

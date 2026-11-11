// Same-origin crawler + per-page technical/SEO checks.
// Polite by default: respects robots.txt, 1 request/second, identifies itself.
import * as cheerio from 'cheerio';
import { HINTS } from './hints.js';
import { extract as extractSitemaps } from './sitemap.js';

const UA = 'SiteAuditBot/0.1 (+site owner audit tool)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRobots(origin) {
  try {
    const r = await fetch(origin + '/robots.txt', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { disallow: [], sitemaps: [] };
    const txt = await r.text();
    const disallow = [], sitemaps = [];
    let applies = false;
    for (const raw of txt.split('\n')) {
      const line = raw.split('#')[0].trim();
      const [k, ...rest] = line.split(':');
      const v = rest.join(':').trim();
      if (!k) continue;
      const key = k.toLowerCase();
      if (key === 'user-agent') applies = v === '*' || UA.toLowerCase().includes(v.toLowerCase());
      else if (key === 'disallow' && applies && v) disallow.push(v);
      else if (key === 'sitemap') sitemaps.push(v);
    }
    return { disallow, sitemaps, raw: txt };
  } catch { return { disallow: [], sitemaps: [] }; }
}

const allowed = (robots, url) => !robots.disallow.some((p) => new URL(url).pathname.startsWith(p));

async function fetchFollow(url, method = 'GET') {
  const chain = [];
  let cur = url;
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now();
    const r = await fetch(cur, { method, redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
    chain.push({ url: cur, status: r.status, ms: Date.now() - t0 });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, cur).href; continue; }
    return { res: r, chain, finalUrl: cur };
  }
  return { res: null, chain, finalUrl: cur, error: 'too many redirects' };
}

function analyze(html, url) {
  const $ = cheerio.load(html);
  const issues = [];
  const title = $('head > title').first().text().trim();
  const desc = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1 = $('h1').map((_, e) => $(e).text().trim()).get();
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  const lang = $('html').attr('lang') || '';
  const viewport = $('meta[name="viewport"]').length > 0;
  const hreflang = $('link[rel="alternate"][hreflang]').map((_, e) => $(e).attr('hreflang')).get();
  const schemaTypes = [];
  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const j = JSON.parse($(e).text());
      for (const o of [].concat(j['@graph'] || j)) if (o && o['@type']) schemaTypes.push(...[].concat(o['@type']));
    } catch { issues.push({ level: 'error', code: 'schema-invalid-json', msg: 'JSON-LD block is not valid JSON' }); }
  });
  const imgsNoAlt = $('img').filter((_, e) => $(e).attr('alt') === undefined).length;
  const links = $('a[href]').map((_, e) => $(e).attr('href')).get()
    .map((h) => { try { return new URL(h, url).href.split('#')[0]; } catch { return null; } })
    .filter((h) => h && h.startsWith('http'));

  if (!title) issues.push({ level: 'error', code: 'title-missing', msg: 'No <title>' });
  else if (title.length > 60) issues.push({ level: 'warn', code: 'title-long', msg: `Title is ${title.length} chars (>60)` });
  else if (title.length < 15) issues.push({ level: 'warn', code: 'title-short', msg: `Title is ${title.length} chars (<15)` });
  if (!desc) issues.push({ level: 'warn', code: 'description-missing', msg: 'No meta description' });
  else if (desc.length > 160) issues.push({ level: 'info', code: 'description-long', msg: `Meta description ${desc.length} chars (>160)` });
  if (h1.length === 0) issues.push({ level: 'warn', code: 'h1-missing', msg: 'No <h1>' });
  if (h1.length > 1) issues.push({ level: 'info', code: 'h1-multiple', msg: `${h1.length} <h1> elements` });
  if (!canonical) issues.push({ level: 'info', code: 'canonical-missing', msg: 'No canonical link' });
  else if (!/^https?:\/\//i.test(canonical)) issues.push({ level: 'warn', code: 'canonical-relative', msg: `Canonical "${canonical}" is not an absolute URL` });
  if (!lang) issues.push({ level: 'warn', code: 'lang-missing', msg: '<html> has no lang attribute' });
  if (!viewport) issues.push({ level: 'warn', code: 'viewport-missing', msg: 'No viewport meta (mobile)' });
  if (/noindex/i.test(robotsMeta)) issues.push({ level: 'warn', code: 'noindex', msg: 'Page has robots noindex' });
  if (url.startsWith('https://')) {
    const insecure = $('img[src],script[src],iframe[src],link[rel="stylesheet"][href],source[src],video[src],audio[src]')
      .map((_, e) => $(e).attr('src') || $(e).attr('href')).get().filter((u) => /^http:\/\//i.test(u));
    if (insecure.length) issues.push({ level: 'error', code: 'mixed-content', msg: `${insecure.length} resource(s) loaded over http:// on an https page`, urls: insecure.slice(0, 20) });
  } else {
    issues.push({ level: 'warn', code: 'not-https', msg: 'Page is served over plain HTTP' });
  }
  if (imgsNoAlt) issues.push({ level: 'warn', code: 'img-alt-missing', msg: `${imgsNoAlt} <img> without alt` });

  return { title, description: desc, h1, canonical, robotsMeta, lang, hreflang, schemaTypes, links: [...new Set(links)], issues };
}

export async function crawl(startUrl, { maxPages = 20, delayMs = 1000, checkExternal = true, log = () => {} } = {}) {
  const origin = new URL(startUrl).origin;
  const robots = await fetchRobots(origin);
  const queue = [startUrl], seen = new Set([startUrl]), pages = [], analyzed = new Set();
  const smCandidates = robots.sitemaps.length ? robots.sitemaps : [origin + '/sitemap.xml'];
  const sitemapUrls = (await extractSitemaps(smCandidates, { maxUrls: 1000, maxSitemaps: 20, sameOriginOnly: true })).urls
    .map((u) => u.url.split('#')[0]).filter((u) => { try { return new URL(u).origin === origin; } catch { return false; } });
  for (const u of sitemapUrls) if (!seen.has(u)) { seen.add(u); queue.push(u); }
  const linkStatus = new Map(); // url -> status
  const linkSources = new Map(); // url -> Set(pages)

  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    if (!allowed(robots, url)) { pages.push({ url, skipped: 'robots.txt' }); continue; }
    log(`page ${pages.length + 1}: ${url}`);
    let page = { url };
    try {
      const { res, chain, finalUrl, error } = await fetchFollow(url);
      page.redirectChain = chain.length > 1 ? chain : [];
      page.status = res ? res.status : null;
      page.finalUrl = finalUrl;
      page.responseMs = chain.at(-1).ms;
      linkStatus.set(url, page.status);
      if (error) page.issues = [{ level: 'error', code: 'redirect-loop', msg: error }];
      else if (chain.length > 2) page.issues = [{ level: 'warn', code: 'redirect-chain', msg: `${chain.length - 1} redirects` }];
      if (chain.length > 1) page.initialStatus = chain[0].status;
      const ct = res?.headers.get('content-type') || '';
      if (analyzed.has(finalUrl)) {
        page.redirectsToAnalyzedPage = true;
      } else if (res && res.ok && ct.includes('text/html')) {
        analyzed.add(finalUrl);
        const html = await res.text();
        page.bytes = html.length;
        const a = analyze(html, finalUrl);
        page = { ...page, ...a, issues: [...(page.issues || []), ...a.issues] };
        for (const l of a.links) {
          if (!linkSources.has(l)) linkSources.set(l, new Set());
          linkSources.get(l).add(url);
          if (new URL(l).origin === origin && !seen.has(l)) { seen.add(l); queue.push(l); }
        }
      } else if (res && res.status >= 400) {
        page.issues = [...(page.issues || []), { level: 'error', code: 'http-error', msg: `HTTP ${res.status}` }];
      }
    } catch (e) {
      page.issues = [{ level: 'error', code: 'fetch-failed', msg: String(e.message || e) }];
    }
    delete page.links;
    pages.push(page);
    await sleep(delayMs);
  }

  // Check links not yet fetched (internal beyond maxPages are skipped to stay polite; external via HEAD, 1/s per host).
  const broken = [];
  {
    const lastHit = new Map();
    for (const [l, srcs] of linkSources) {
      if (linkStatus.has(l)) { const s = linkStatus.get(l); if (s >= 400) broken.push({ url: l, status: s, foundOn: [...srcs] }); continue; }
      const u = new URL(l);
      if (u.origin === origin || !checkExternal) continue;
      const wait = 1000 - (Date.now() - (lastHit.get(u.host) || 0));
      if (wait > 0) await sleep(wait);
      lastHit.set(u.host, Date.now());
      let s;
      try {
        let r = await fetch(l, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
        if (r.status === 405 || r.status === 403) r = await fetch(l, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10000) });
        s = r.status;
      } catch { s = 'unreachable'; }
      linkStatus.set(l, s);
      if (s === 'unreachable' || s >= 400) broken.push({ url: l, status: s, foundOn: [...srcs] });
    }
  }

  // Site-level checks
  const site = { origin, robotsTxt: !!robots.raw, sitemaps: robots.sitemaps, sitemapUrlCount: sitemapUrls.length, issues: [] };
  if (!sitemapUrls.length) site.issues.push({ level: 'info', code: 'sitemap-empty', msg: 'No sitemap URLs found (robots.txt Sitemap: or /sitemap.xml)' });
  const linkedTargets = new Set(linkSources.keys());
  const orphans = sitemapUrls.filter((u) => pages.some((p) => p.url === u && p.status === 200) && !linkedTargets.has(u) && u !== startUrl);
  if (orphans.length) site.issues.push({ level: 'info', code: 'orphan-pages', msg: `${orphans.length} sitemap page(s) not linked from any crawled page`, urls: orphans });
  if (!robots.raw) site.issues.push({ level: 'info', code: 'robots-missing', msg: 'No robots.txt' });
  if (!robots.sitemaps.length) site.issues.push({ level: 'info', code: 'sitemap-not-declared', msg: 'No Sitemap: line in robots.txt' });
  const titles = new Map();
  for (const p of pages) if (p.title) titles.set(p.title, [...(titles.get(p.title) || []), p.url]);
  for (const [t, urls] of titles) if (urls.length > 1) site.issues.push({ level: 'warn', code: 'title-duplicate', msg: `Title "${t}" used on ${urls.length} pages`, urls });
  const addHints = (L) => (L || []).forEach((i) => { i.fix = HINTS[i.code] || ''; });
  addHints(site.issues); pages.forEach((p) => addHints(p.issues));
  const PEN = { error: 15, warn: 5, info: 1 };
  for (const p of pages) if (!p.skipped) p.score = Math.max(0, 100 - (p.issues || []).reduce((s, i) => s + PEN[i.level], 0));
  return { site, pages, brokenLinks: broken };
}

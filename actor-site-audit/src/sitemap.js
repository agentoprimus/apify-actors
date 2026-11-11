// COPY of actor-sitemap-extractor/src/sitemap.js (each actor is built from its own folder). Keep in sync.
// Sitemap discovery + parsing (sitemap indexes, .xml.gz, lastmod/changefreq/priority) and optional status checks.
import { gunzipSync } from 'node:zlib';

const UA = 'SitemapExtractorBot/0.1 (+sitemap extraction tool)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unxml = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i')); return m ? unxml(m[1]) : null; };

async function get(url, timeoutMs = 20000) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-encoding': 'gzip' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  const buf = Buffer.from(await r.arrayBuffer());
  return { r, buf };
}

export async function discoverSitemaps(siteUrl) {
  const origin = new URL(siteUrl).origin;
  const found = [];
  try {
    const { r, buf } = await get(origin + '/robots.txt', 10000);
    if (r.ok) for (const line of buf.toString('utf8').split('\n')) {
      const m = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
      if (m) found.push(m[1]);
    }
  } catch {}
  if (!found.length) found.push(origin + '/sitemap.xml');
  return found;
}

export function parseSitemap(xml) {
  if (/<(?:\w+:)?sitemapindex[\s>]/i.test(xml)) {
    const children = [...xml.matchAll(/<(?:\w+:)?sitemap>([\s\S]*?)<\/(?:\w+:)?sitemap>/gi)].map((m) => ({ loc: tag(m[1], 'loc'), lastmod: tag(m[1], 'lastmod') })).filter((x) => x.loc);
    return { type: 'index', children };
  }
  const urls = [...xml.matchAll(/<(?:\w+:)?url>([\s\S]*?)<\/(?:\w+:)?url>/gi)].map((m) => {
    const b = m[1];
    const p = tag(b, 'priority');
    return {
      url: tag(b, 'loc'),
      lastmod: tag(b, 'lastmod'),
      changefreq: tag(b, 'changefreq'),
      priority: p == null ? null : Number(p),
      images: (b.match(/<image:image>/gi) || []).length,
      alternates: [...b.matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/gi)].map((a) => ({ hreflang: a[1], href: unxml(a[2]) })),
    };
  }).filter((u) => u.url);
  return { type: 'urlset', urls };
}

export async function extract(startUrls, { maxUrls = 10000, maxSitemaps = 200, sameOriginOnly = false, log = () => {} } = {}) {
  const queue = [...startUrls], seen = new Set(), sitemaps = [], urls = new Map();
  while (queue.length && sitemaps.length < maxSitemaps && urls.size < maxUrls) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    log(`sitemap: ${sm}`);
    const rec = { sitemap: sm };
    try {
      const { r, buf } = await get(sm);
      rec.status = r.status;
      if (!r.ok) { rec.error = `HTTP ${r.status}`; sitemaps.push(rec); continue; }
      const raw = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
      rec.gzipped = raw !== buf;
      const parsed = parseSitemap(raw.toString('utf8'));
      rec.type = parsed.type;
      if (parsed.type === 'index') {
        rec.children = parsed.children.length;
        for (const c of parsed.children) queue.push(new URL(c.loc, sm).href);
      } else {
        rec.urls = parsed.urls.length;
        const origin = new URL(sm).origin;
        for (const u of parsed.urls) {
          if (urls.size >= maxUrls) break;
          if (sameOriginOnly && new URL(u.url, sm).origin !== origin) continue;
          if (!urls.has(u.url)) urls.set(u.url, { ...u, sitemap: sm });
        }
      }
    } catch (e) { rec.error = String(e.message || e); }
    sitemaps.push(rec);
  }
  return { sitemaps, urls: [...urls.values()] };
}

export async function checkStatuses(rows, { delayMs = 500, log = () => {} } = {}) {
  for (const [i, row] of rows.entries()) {
    if (i % 50 === 0) log(`status check ${i}/${rows.length}`);
    try {
      let r = await fetch(row.url, { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
      if (r.status === 405 || r.status === 403) r = await fetch(row.url, { redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) });
      row.status = r.status;
      if (r.status >= 300 && r.status < 400) row.redirectTo = r.headers.get('location');
    } catch (e) { row.status = 'unreachable'; row.error = String(e.message || e); }
    await sleep(delayMs);
  }
  return rows;
}

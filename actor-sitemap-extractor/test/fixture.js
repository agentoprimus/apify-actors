import http from 'node:http';
import { gzipSync } from 'node:zlib';
const B = 'http://localhost:8798';
const routes = {
  '/robots.txt': ['text/plain', `User-agent: *\nSitemap: ${B}/sitemap_index.xml\n`],
  '/sitemap_index.xml': ['application/xml', `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${B}/pages.xml</loc></sitemap><sitemap><loc>${B}/posts.xml.gz</loc><lastmod>2026-01-01</lastmod></sitemap><sitemap><loc>${B}/missing.xml</loc></sitemap></sitemapindex>`],
  '/pages.xml': ['application/xml', `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${B}/</loc><lastmod>2026-11-01</lastmod><changefreq>daily</changefreq><priority>1.0</priority><image:image><image:loc>${B}/a.png</image:loc></image:image><xhtml:link rel="alternate" hreflang="de" href="${B}/de/"/></url><url><loc><![CDATA[${B}/a?x=1&amp;y=2]]></loc></url><url><loc>${B}/gone</loc></url></urlset>`],
  '/posts.xml.gz': ['application/gzip', gzipSync(`<urlset><url><loc>${B}/post-1</loc></url><url><loc>${B}/redir</loc></url></urlset>`)],
};
export const server = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (routes[u]) { r.writeHead(200, { 'content-type': routes[u][0] }); return r.end(routes[u][1]); }
  if (u === '/' || u === '/a' || u === '/post-1') { r.writeHead(200); return r.end('ok'); }
  if (u === '/redir') { r.writeHead(301, { location: '/' }); return r.end(); }
  r.writeHead(404); r.end();
});

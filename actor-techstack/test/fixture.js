import http from 'node:http';
const page = `<!doctype html><html><head><meta name="generator" content="WordPress 6.4.2">
<link rel="stylesheet" href="/wp-content/themes/twentytwentyfour/style.css">
<script src="/wp-includes/js/jquery/jquery.min.js?ver=3.7.1"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST123"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};</script>
</head><body><div id="app">hi</div></body></html>`;
const jq = 'window.jQuery=window.$=function(){};window.jQuery.fn={jquery:"3.7.1"};';
export const server = http.createServer((q, r) => {
  if (q.url.startsWith('/wp-includes/js/jquery/')) { r.writeHead(200, { 'content-type': 'application/javascript' }); return r.end(jq); }
  if (q.url.startsWith('/wp-content/')) { r.writeHead(200, { 'content-type': 'text/css' }); return r.end('body{}'); }
  r.writeHead(200, { 'content-type': 'text/html', server: 'nginx/1.24.0', 'x-powered-by': 'PHP/8.2.10' }); r.end(page);
});

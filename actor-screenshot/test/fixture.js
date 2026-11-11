import http from 'node:http';
const long = '<div style="height:3000px;background:linear-gradient(red,blue)">tall</div>';
const routes = {
  '/': `<html><head><title>Home</title></head><body><h1 id="hero">Hello</h1><div id="onetrust-banner-sdk" style="position:fixed;bottom:0;width:100%;height:200px;background:#000;color:#fff">COOKIES</div>${long}</body></html>`,
  '/late': `<html><head><title>Late</title></head><body><script>setTimeout(()=>{const d=document.createElement('div');d.id='ready';d.textContent='ready';document.body.appendChild(d)},800)</script></body></html>`,
};
export const server = http.createServer((q, r) => {
  const b = routes[q.url];
  if (!b) { r.writeHead(404, { 'content-type': 'text/html' }); return r.end('<title>404</title>nope'); }
  r.writeHead(200, { 'content-type': 'text/html' }); r.end(b);
});

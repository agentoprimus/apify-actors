// Local fixture site with planted issues, for testing the audit. Usage: node test/fixture-server.js [port]
import http from 'node:http';
const port = +(process.argv[2] || 8765);
const page = (title, body, head = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>${head}</head><body>${body}</body></html>`;
const routes = {
  '/': () => [200, page('Fixture Home — a well formed page title', '<h1>Home</h1><a href="/about">About</a> <a href="/old">Old</a> <a href="/missing">Missing</a> <a href="/dup1">D1</a> <a href="/dup2">D2</a> <a href="/bad">Bad</a> <a href="/private/x">Private</a>', '<meta name="description" content="Home page of the fixture site."><link rel="canonical" href="/"><script type="application/ld+json">{"@type":"Organization","name":"X"}</script>')],
  '/about': () => [200, page('About', '<h1>About</h1><h1>Second</h1><img src="a.png"><a href="/">Home</a>')],
  '/old': () => [301, '', { location: '/old2' }],
  '/old2': () => [302, '', { location: '/about' }],
  '/dup1': () => [200, page('Same Title Here Twice', '<h1>A</h1>')],
  '/dup2': () => [200, page('Same Title Here Twice', '<h1>B</h1>', '<meta name="robots" content="noindex">')],
  '/bad': () => [200, `<html><head><title>${'Very long title '.repeat(6)}</title><script type="application/ld+json">{bad json</script></head><body>no h1</body></html>`],
  '/private/x': () => [200, page('Private', '<h1>should be skipped</h1>')],
  '/sitemap.xml': () => [200, `<?xml version="1.0"?><urlset><url><loc>http://localhost:${port}/</loc></url><url><loc>http://localhost:${port}/orphan</loc></url></urlset>`, { 'content-type': 'application/xml' }],
  '/orphan': () => [200, page('Orphan page with a decent title', '<h1>Orphan</h1>')],
  '/robots.txt': () => [200, 'User-agent: *\nDisallow: /private/\nSitemap: http://localhost:' + port + '/sitemap.xml\n', { 'content-type': 'text/plain' }],
};
export const server = http.createServer((req, res) => {
  const r = routes[req.url];
  if (!r) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('not found'); }
  const [status, body, headers = {}] = r();
  res.writeHead(status, { 'content-type': 'text/html', ...headers });
  res.end(body);
});
if (import.meta.url === `file://${process.argv[1]}`) server.listen(port, '127.0.0.1', () => console.error('fixture on ' + port));

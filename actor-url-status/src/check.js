// URL status, redirect chain, timing, title/canonical, TLS certificate expiry.
import tls from 'node:tls';
const UA = 'Mozilla/5.0 (compatible; URLStatusChecker/0.1)';

export async function certInfo(host, port = 443) {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 10000 }, () => {
      const c = s.getPeerCertificate();
      const out = c && c.valid_to ? { certValidTo: new Date(c.valid_to).toISOString(), certDaysLeft: Math.floor((new Date(c.valid_to) - Date.now()) / 864e5), certIssuer: c.issuer?.O || c.issuer?.CN || null, certValid: s.authorized, certError: s.authorized ? null : String(s.authorizationError || '') } : {};
      s.end(); resolve(out);
    });
    s.on('error', (e) => resolve({ certError: e.code || String(e) }));
    s.on('timeout', () => { s.destroy(); resolve({ certError: 'timeout' }); });
  });
}

export async function checkUrl(url, { maxRedirects = 10, timeoutMs = 20000, method = 'GET', ssl = true } = {}) {
  const chain = [];
  let cur = url, res = null, t0 = Date.now();
  try {
    for (let i = 0; i <= maxRedirects; i++) {
      const t = Date.now();
      const r = await fetch(cur, { method, redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(timeoutMs) });
      chain.push({ url: cur, status: r.status, ms: Date.now() - t });
      const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, cur).href; await r.body?.cancel?.(); continue; }
      res = r; break;
    }
  } catch (e) {
    return { url, ok: false, status: null, error: (e.cause?.code || e.name === 'TimeoutError' ? 'timeout' : null) || String(e.message || e), redirects: chain.length ? chain.length - 1 : 0, redirectChain: chain };
  }
  if (!res) return { url, ok: false, status: chain.at(-1)?.status ?? null, error: 'too many redirects', redirects: chain.length - 1, redirectChain: chain };
  const ct = res.headers.get('content-type') || '';
  let title = null, canonical = null, robots = res.headers.get('x-robots-tag');
  if (method === 'GET' && ct.includes('html')) {
    const html = (await res.text().catch(() => '')).slice(0, 500000);
    title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null;
    canonical = html.match(/<link[^>]+rel=["']?canonical["']?[^>]*>/i)?.[0]?.match(/href=["']([^"']+)/i)?.[1] || null;
    const mr = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0]?.match(/content=["']([^"']+)/i)?.[1];
    if (mr) robots = robots ? robots + ', ' + mr : mr;
  } else await res.body?.cancel?.();
  const finalUrl = cur;
  const out = {
    url, ok: res.status < 400, status: res.status, finalUrl, redirected: chain.length > 1, redirects: chain.length - 1,
    redirectChain: chain.length > 1 ? chain : [], totalMs: Date.now() - t0, contentType: ct || null,
    contentLength: Number(res.headers.get('content-length')) || null, server: res.headers.get('server'), title, canonical, robots: robots || null,
  };
  if (ssl && finalUrl.startsWith('https:')) Object.assign(out, await certInfo(new URL(finalUrl).hostname));
  return out;
}

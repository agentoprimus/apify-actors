// Domain availability + registration data via RDAP (IANA bootstrap), DNS fallback for TLDs without RDAP.
import { promises as dns } from 'node:dns';

const UA = 'DomainChecker/0.1 (RDAP client)';
let BOOT = null;
export async function bootstrap(fetchImpl = fetch) {
  if (BOOT) return BOOT;
  const j = await (await fetchImpl('https://data.iana.org/rdap/dns.json', { headers: { 'user-agent': UA } })).json();
  const map = new Map();
  for (const [tlds, urls] of j.services) for (const t of tlds) map.set(t.toLowerCase(), urls.find((u) => u.startsWith('https')) || urls[0]);
  return (BOOT = map);
}
export function _setBootstrap(m) { BOOT = m; }

export function normalize(d) {
  let s = String(d || '').trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, '').split(/[/?#:]/)[0].replace(/^www\./, '').replace(/\.$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) && !/^xn--/.test(s)) {
    try { s = new URL('http://' + s).hostname; } catch { return null; } // punycode for IDN
  }
  return /\./.test(s) ? s : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (o, action) => (o.events || []).find((e) => e.eventAction === action)?.eventDate || null;

function parseRdap(o) {
  const registrar = (o.entities || []).find((e) => (e.roles || []).includes('registrar'));
  let registrarName = null;
  const v = registrar?.vcardArray?.[1];
  if (Array.isArray(v)) registrarName = v.find((x) => x[0] === 'fn')?.[3] || null;
  return {
    registrar: registrarName || registrar?.handle || null,
    registrarIanaId: registrar?.publicIds?.find((p) => /iana/i.test(p.type))?.identifier || null,
    createdAt: ev(o, 'registration'), updatedAt: ev(o, 'last changed'), expiresAt: ev(o, 'expiration'),
    statuses: o.status || [], nameservers: (o.nameservers || []).map((n) => (n.ldhName || '').toLowerCase()).filter(Boolean),
    dnssec: o.secureDNS ? !!o.secureDNS.delegationSigned : null,
  };
}

async function dnsFallback(domain) {
  try { const ns = await dns.resolveNs(domain); return { status: 'registered', method: 'dns', nameservers: ns.map((x) => x.toLowerCase()) }; }
  catch (e) {
    if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
      try { await dns.resolveSoa(domain); return { status: 'registered', method: 'dns' }; } catch {}
      return { status: 'likely-available', method: 'dns', note: 'No RDAP for this TLD; no DNS records found. Confirm with a registrar.' };
    }
    return { status: 'unknown', method: 'dns', error: e.code || String(e) };
  }
}

export async function checkDomain(domain, { fetchImpl = fetch, retries = 3 } = {}) {
  const tld = domain.split('.').pop();
  const boot = await bootstrap(fetchImpl);
  const base = boot.get(tld);
  if (!base) return { domain, tld, ...(await dnsFallback(domain)) };
  const url = base.replace(/\/?$/, '/') + 'domain/' + domain;
  for (let a = 0; a <= retries; a++) {
    let r;
    try { r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/rdap+json, application/json' }, redirect: 'follow', signal: AbortSignal.timeout(15000) }); }
    catch (e) { if (a === retries) return { domain, tld, status: 'unknown', method: 'rdap', rdapServer: base, error: String(e.message || e) }; await sleep(1000 * (a + 1)); continue; }
    if (r.status === 404) return { domain, tld, status: 'available', method: 'rdap', rdapServer: base };
    if (r.status === 429 || r.status >= 500) { if (a === retries) return { domain, tld, status: 'unknown', method: 'rdap', rdapServer: base, error: `HTTP ${r.status}` }; await sleep(2000 * (a + 1)); continue; }
    if (!r.ok) return { domain, tld, ...(await dnsFallback(domain)), rdapServer: base, rdapError: `HTTP ${r.status}` };
    const o = await r.json().catch(() => null);
    if (!o) return { domain, tld, status: 'unknown', method: 'rdap', rdapServer: base, error: 'invalid RDAP JSON' };
    return { domain, tld, status: 'registered', method: 'rdap', rdapServer: base, ...parseRdap(o) };
  }
}

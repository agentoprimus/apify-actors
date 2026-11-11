// Technology detection using the webappanalyzer fingerprint database (GPL-3.0, see data/LICENSE).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function parsePattern(p) {
  if (typeof p !== 'string') p = String(p ?? '');
  const [re, ...tags] = p.split('\\;');
  const out = { version: null, confidence: 100 };
  for (const t of tags) {
    const i = t.indexOf(':');
    if (i < 0) continue;
    const k = t.slice(0, i), v = t.slice(i + 1);
    if (k === 'version') out.version = v;
    if (k === 'confidence') out.confidence = Number(v) || 100;
  }
  let regex;
  try { regex = new RegExp(re.replace('/', '\\/'), 'i'); } catch { regex = null; }
  return { ...out, regex, raw: re };
}

function resolveVersion(tpl, m) {
  if (!tpl || !m) return null;
  // supports \1 and ternary \1?a:b
  let v = tpl.replace(/\\(\d)\?([^:]*):(.*)$/, (_, n, a, b) => (m[n] ? a : b));
  v = v.replace(/\\(\d)/g, (_, n) => m[n] || '');
  v = v.trim();
  return v && v.length < 30 ? v : null;
}

let DB;
export function loadDb() {
  if (DB) return DB;
  const cats = JSON.parse(readFileSync(path.join(DATA, 'categories.json'), 'utf8'));
  const techs = {};
  for (const f of readdirSync(path.join(DATA, 'technologies'))) Object.assign(techs, JSON.parse(readFileSync(path.join(DATA, 'technologies', f), 'utf8')));
  const list = [];
  for (const [name, t] of Object.entries(techs)) {
    const kv = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.toLowerCase(), arr(v).map(parsePattern)]));
    let dom = t.dom;
    if (typeof dom === 'string' || Array.isArray(dom)) dom = Object.fromEntries(arr(dom).map((s) => [s, { exists: '' }]));
    list.push({
      name, website: t.website || null, cats: arr(t.cats).map((c) => cats[c]?.name).filter(Boolean),
      implies: arr(t.implies).map((s) => String(s).split('\\;')[0]), excludes: arr(t.excludes).map(String), requires: arr(t.requires).map(String),
      headers: kv(t.headers), cookies: kv(t.cookies), meta: kv(t.meta),
      html: arr(t.html).map(parsePattern), scriptSrc: arr(t.scriptSrc).map(parsePattern), scripts: arr(t.scripts).map(parsePattern),
      url: arr(t.url).map(parsePattern), text: arr(t.text).map(parsePattern),
      js: Object.fromEntries(Object.entries(t.js || {}).map(([k, v]) => [k, parsePattern(v)])),
      dom: dom || {},
    });
  }
  DB = { list, byName: Object.fromEntries(list.map((t) => [t.name, t])) };
  return DB;
}

// Names of all JS globals/DOM selectors we need to probe in the page.
export function probes() {
  const { list } = loadDb();
  const js = new Set(), dom = new Set();
  for (const t of list) { for (const k of Object.keys(t.js)) js.add(k); for (const k of Object.keys(t.dom)) dom.add(k); }
  return { js: [...js], dom: [...dom] };
}

// page = { url, headers:{}, cookies:{}, html, scriptSrc:[], scripts:[], meta:{}, text, js:{path:value}, dom:{selector:{exists,attributes:{},properties:{},text}} }
export function analyze(page) {
  const { list, byName } = loadDb();
  const found = new Map(); // name -> {confidence, version}
  const hit = (t, p, value, field) => {
    if (!p.regex || value == null) return;
    const s = String(value);
    const m = s.match(p.regex);
    if (!m) return;
    const f = found.get(t.name) || { confidence: 0, version: null, evidence: [] };
    f.confidence = Math.min(100, f.confidence + p.confidence);
    const v = resolveVersion(p.version, m);
    if (v && (!f.version || v.length > f.version.length)) f.version = v;
    if (f.evidence.length < 3) f.evidence.push(field);
    found.set(t.name, f);
  };
  const lc = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const H = lc(page.headers), C = lc(page.cookies), M = lc(page.meta);
  const html = (page.html || '').slice(0, 2_000_000);
  for (const t of list) {
    for (const [k, ps] of Object.entries(t.headers)) if (H[k] != null) for (const p of ps) hit(t, p, H[k], 'header:' + k);
    for (const [k, ps] of Object.entries(t.cookies)) if (C[k] != null) for (const p of ps) hit(t, p, C[k], 'cookie:' + k);
    for (const [k, ps] of Object.entries(t.meta)) if (M[k] != null) for (const p of ps) hit(t, p, M[k], 'meta:' + k);
    for (const p of t.html) hit(t, p, html, 'html');
    for (const p of t.url) hit(t, p, page.url, 'url');
    for (const p of t.text) hit(t, p, page.text, 'text');
    for (const p of t.scriptSrc) for (const s of page.scriptSrc || []) hit(t, p, s, 'scriptSrc');
    for (const p of t.scripts) for (const s of page.scripts || []) hit(t, p, s, 'script');
    for (const [k, p] of Object.entries(t.js)) if (page.js && k in page.js) hit(t, p, page.js[k], 'js:' + k);
    for (const [sel, spec] of Object.entries(t.dom)) {
      const d = page.dom?.[sel];
      if (!d?.exists) continue;
      if (spec && typeof spec === 'object' && Object.keys(spec).length) {
        if ('exists' in spec) hit(t, parsePattern(spec.exists || ''), '', 'dom:' + sel);
        for (const [a, pat] of Object.entries(spec.attributes || {})) if (d.attributes?.[a] != null) hit(t, parsePattern(pat), d.attributes[a], 'dom:' + sel);
        for (const [a, pat] of Object.entries(spec.properties || {})) if (d.properties?.[a] != null) hit(t, parsePattern(pat), d.properties[a], 'dom:' + sel);
        if (spec.text != null && d.text != null) hit(t, parsePattern(spec.text), d.text, 'dom:' + sel);
      } else hit(t, parsePattern(''), '', 'dom:' + sel);
    }
  }
  // implies (transitive), requires, excludes
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, f] of [...found]) for (const imp of byName[name]?.implies || []) if (byName[imp] && !found.has(imp)) { found.set(imp, { confidence: f.confidence, version: null, evidence: ['implied by ' + name] }); changed = true; }
  }
  for (const [name] of [...found]) { const t = byName[name]; if (t?.requires?.length && !t.requires.some((r) => found.has(r))) found.delete(name); }
  for (const [name] of [...found]) for (const ex of byName[name]?.excludes || []) found.delete(ex);
  return [...found].filter(([, f]) => f.confidence >= 50).map(([name, f]) => ({
    name, version: f.version, confidence: f.confidence, categories: byName[name].cats, website: byName[name].website, evidence: f.evidence,
  })).sort((a, b) => a.categories.join().localeCompare(b.categories.join()) || a.name.localeCompare(b.name));
}

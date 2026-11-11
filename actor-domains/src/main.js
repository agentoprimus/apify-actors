import { Actor, log } from 'apify';
import { checkDomain, normalize, bootstrap } from './rdap.js';

await Actor.init();
const input = (await Actor.getInput()) || {};
const set = new Set();
for (const d of input.domains || []) { const n = normalize(d); if (n) set.add(n); }
const tlds = (input.tlds || []).map((t) => String(t).trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
for (const k of input.keywords || []) {
  const kw = String(k).trim().toLowerCase().replace(/\s+/g, '').replace(/^www\./, '');
  if (!kw) continue;
  for (const t of tlds.length ? tlds : ['com']) { const n = normalize(`${kw}.${t}`); if (n) set.add(n); }
}
const domains = [...set].slice(0, 20000);
if (!domains.length) throw new Error('Provide "domains" and/or "keywords" (+ "tlds").');
const boot = await bootstrap();
// Group by RDAP server so each registry gets at most 2 parallel requests (polite, avoids 429s).
const groups = new Map();
for (const d of domains) { const k = boot.get(d.split('.').pop()) || 'dns'; (groups.get(k) || groups.set(k, []).get(k)).push(d); }
log.info(`Checking ${domains.length} domain(s) across ${groups.size} registry endpoint(s)`);
let done = 0, charged = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await Promise.all([...groups.values()].map(async (list) => {
  const q = [...list];
  await Promise.all([0, 1].map(async () => {
    while (q.length) {
      const d = q.shift();
      const r = await checkDomain(d);
      r.available = r.status === 'available' ? true : r.status === 'registered' ? false : null;
      await Actor.pushData(r);
      if (r.status !== 'unknown') { await Actor.charge({ eventName: 'domain-checked', count: 1 }); charged++; }
      if (++done % 100 === 0) log.info(`${done}/${domains.length} checked`);
      await sleep(250);
    }
  }));
}));
log.info(`Done: ${done} checked (${charged} with a definite answer).`);
await Actor.exit();

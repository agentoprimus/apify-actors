import { Actor, log } from 'apify';
import { checkSite } from './robots.js';
await Actor.init();
const input = (await Actor.getInput()) || {};
const sites = [...new Set((input.sites || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 20000);
if (!sites.length) throw new Error('Provide at least one website in "sites".');
const paths = ['/', ...(input.extraPaths || []).map((p) => (String(p).startsWith('/') ? String(p) : '/' + p))];
const conc = Math.min(Math.max(1, input.maxConcurrency || 10), 30);
log.info(`Checking AI crawler access for ${sites.length} site(s)`);
const q = [...sites]; let ok = 0;
await Promise.all(Array.from({ length: conc }, async () => {
  while (q.length) {
    const s = q.shift();
    const r = await checkSite(s, { paths });
    await Actor.pushData(r);
    if (r.ok) { await Actor.charge({ eventName: 'site-checked', count: 1 }); ok++; }
  }
}));
log.info(`Done: ${ok}/${sites.length} sites checked.`);
await Actor.exit();

import { writeFileSync } from 'node:fs';
import { audit } from './audit.js';
const [url, max = '20', lh = '2', out = 'report.html'] = process.argv.slice(2);
const r = await audit(url, { maxPages: +max, lighthousePages: +lh, log: (m) => console.error(m) });
writeFileSync(out, r.html);
console.log(JSON.stringify(r.summary, null, 2));

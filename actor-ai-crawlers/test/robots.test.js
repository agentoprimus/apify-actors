import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobots, isAllowed, checkSite } from '../src/robots.js';
const txt = `User-agent: *\nDisallow: /private/\nAllow: /private/ok$\n\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /blog/*.pdf$\nSitemap: https://x.test/sitemap.xml\n`;
const P = parseRobots(txt);
test('star group', () => { assert.equal(isAllowed(P, 'Googlebot', '/').allowed, true); assert.equal(isAllowed(P, 'Googlebot', '/private/a').allowed, false); assert.equal(isAllowed(P, 'Googlebot', '/private/ok').allowed, true); });
test('grouped agents blocked', () => { assert.equal(isAllowed(P, 'GPTBot', '/').allowed, false); assert.equal(isAllowed(P, 'CCBot', '/x').allowed, false); });
test('specific group replaces star', () => { assert.equal(isAllowed(P, 'ClaudeBot', '/private/a').allowed, true); assert.equal(isAllowed(P, 'ClaudeBot', '/blog/a.pdf').allowed, false); });
test('sitemaps', () => assert.deepEqual(P.sitemaps, ['https://x.test/sitemap.xml']));
test('empty robots allows all', () => assert.equal(isAllowed(parseRobots(''), 'GPTBot', '/').allowed, true));
test('checkSite', async () => {
  const f = async (u) => u.endsWith('/robots.txt') ? new Response(txt, { headers: { 'content-type': 'text/plain' } }) : u.endsWith('/llms.txt') ? new Response('# X\n> about', { headers: { 'content-type': 'text/plain' } }) : new Response('', { status: 404 });
  const r = await checkSite('x.test', { fetchImpl: f });
  assert.equal(r.hasLlmsTxt, true); assert.ok(r.blockedBots.includes('GPTBot')); assert.ok(!r.blockedBots.includes('ClaudeBot'));
  assert.equal(r.blocksAITraining, 'some'); assert.equal(r.blocksAISearch, 'none');
});
test('html robots page treated as missing', async () => {
  const f = async () => new Response('<html>', { headers: { 'content-type': 'text/html' } });
  const r = await checkSite('y.test', { fetchImpl: f }); assert.equal(r.hasRobotsTxt, false); assert.equal(r.blockedBots.length, 0);
});

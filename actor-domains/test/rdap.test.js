import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDomain, normalize, _setBootstrap } from '../src/rdap.js';
_setBootstrap(new Map([['com', 'https://rdap.test/'], ['dev', 'https://rdap2.test/']]));
const reg = { status: ['client transfer prohibited'], events: [{ eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' }, { eventAction: 'expiration', eventDate: '2027-08-13T04:00:00Z' }],
  nameservers: [{ ldhName: 'A.IANA-SERVERS.NET' }], secureDNS: { delegationSigned: true },
  entities: [{ roles: ['registrar'], publicIds: [{ type: 'IANA Registrar ID', identifier: '376' }], vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'RESERVED-Internet Assigned Numbers Authority']]] }] };
let calls = 0;
const fake = async (url) => {
  calls++;
  if (url.endsWith('/example.com')) return new Response(JSON.stringify(reg), { status: 200 });
  if (url.endsWith('/flaky.com') && calls < 3) return new Response('', { status: 429 });
  if (url.endsWith('/flaky.com')) return new Response('', { status: 404 });
  return new Response('', { status: 404 });
};
test('normalize', () => {
  assert.equal(normalize('https://www.Example.com/path?q=1'), 'example.com');
  assert.equal(normalize('münchen.de'), 'xn--mnchen-3ya.de');
  assert.equal(normalize('nodot'), null);
});
test('registered domain parsed', async () => {
  const r = await checkDomain('example.com', { fetchImpl: fake });
  assert.equal(r.status, 'registered');
  assert.equal(r.registrar, 'RESERVED-Internet Assigned Numbers Authority');
  assert.equal(r.registrarIanaId, '376');
  assert.equal(r.createdAt, '1995-08-14T04:00:00Z');
  assert.equal(r.expiresAt, '2027-08-13T04:00:00Z');
  assert.deepEqual(r.nameservers, ['a.iana-servers.net']);
  assert.equal(r.dnssec, true);
});
test('404 means available', async () => assert.equal((await checkDomain('free-name-zz.com', { fetchImpl: fake })).status, 'available'));
test('429 retried', { timeout: 20000 }, async () => { calls = 0; assert.equal((await checkDomain('flaky.com', { fetchImpl: fake })).status, 'available'); });

// robots.txt parser (Google-style matching: longest match wins, Allow wins ties, * and $ wildcards)
// + AI crawler access report + llms.txt / sitemap detection.
export const AI_BOTS = [
  { ua: 'GPTBot', owner: 'OpenAI', purpose: 'Training data for OpenAI models' },
  { ua: 'OAI-SearchBot', owner: 'OpenAI', purpose: 'ChatGPT search results' },
  { ua: 'ChatGPT-User', owner: 'OpenAI', purpose: 'ChatGPT browsing on user request' },
  { ua: 'ClaudeBot', owner: 'Anthropic', purpose: 'Training data for Claude models' },
  { ua: 'Claude-SearchBot', owner: 'Anthropic', purpose: 'Claude search results' },
  { ua: 'Claude-User', owner: 'Anthropic', purpose: 'Claude fetching pages on user request' },
  { ua: 'anthropic-ai', owner: 'Anthropic', purpose: 'Legacy Anthropic crawler token' },
  { ua: 'Google-Extended', owner: 'Google', purpose: 'Gemini / Vertex AI training (not Search)' },
  { ua: 'Googlebot', owner: 'Google', purpose: 'Google Search (incl. AI Overviews)' },
  { ua: 'Bingbot', owner: 'Microsoft', purpose: 'Bing Search and Copilot' },
  { ua: 'PerplexityBot', owner: 'Perplexity', purpose: 'Perplexity search index' },
  { ua: 'Perplexity-User', owner: 'Perplexity', purpose: 'Perplexity fetching on user request' },
  { ua: 'Applebot-Extended', owner: 'Apple', purpose: 'Apple Intelligence training' },
  { ua: 'Meta-ExternalAgent', owner: 'Meta', purpose: 'Meta AI training' },
  { ua: 'CCBot', owner: 'Common Crawl', purpose: 'Open web dataset used by many AI models' },
  { ua: 'Bytespider', owner: 'ByteDance', purpose: 'ByteDance / Doubao AI' },
  { ua: 'Amazonbot', owner: 'Amazon', purpose: 'Alexa / Amazon AI' },
  { ua: 'DuckAssistBot', owner: 'DuckDuckGo', purpose: 'DuckDuckGo AI answers' },
  { ua: 'MistralAI-User', owner: 'Mistral', purpose: 'Le Chat fetching on user request' },
  { ua: 'cohere-ai', owner: 'Cohere', purpose: 'Cohere models' },
];

export function parseRobots(txt) {
  const groups = []; let cur = null, lastWasUA = false;
  const sitemaps = [];
  for (let raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') {
      if (!lastWasUA) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase()); lastWasUA = true;
    } else {
      lastWasUA = false;
      if (k === 'sitemap') { sitemaps.push(v); continue; }
      if (!cur) continue;
      if (k === 'allow' || k === 'disallow') cur.rules.push({ allow: k === 'allow', path: v });
    }
  }
  return { groups, sitemaps };
}

function groupFor(parsed, ua) {
  const u = ua.toLowerCase();
  // most specific group: exact token match, else '*'
  const exact = parsed.groups.filter((g) => g.agents.some((a) => a !== '*' && (u === a || u.startsWith(a))));
  if (exact.length) return { rules: exact.flatMap((g) => g.rules), matched: 'specific' };
  const star = parsed.groups.filter((g) => g.agents.includes('*'));
  return star.length ? { rules: star.flatMap((g) => g.rules), matched: '*' } : { rules: [], matched: 'none' };
}

function ruleMatches(path, rulePath) {
  if (rulePath === '') return false;
  const re = '^' + rulePath.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$|\$$/, '$');
  return new RegExp(re).test(path);
}

export function isAllowed(parsed, ua, path = '/') {
  const { rules, matched } = groupFor(parsed, ua);
  let best = null;
  for (const r of rules) if (ruleMatches(path, r.path)) {
    const len = r.path.replace(/\*|\$$/g, '').length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow, rule: (r.allow ? 'Allow: ' : 'Disallow: ') + r.path };
  }
  return { allowed: best ? best.allow : true, rule: best?.rule || null, group: matched };
}

export async function checkSite(input, { fetchImpl = fetch, paths = ['/'] } = {}) {
  let origin;
  try { origin = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input).origin; } catch { return { site: input, ok: false, error: 'invalid URL' }; }
  const get = async (p) => { try { const r = await fetchImpl(origin + p, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; AICrawlerAccessChecker/0.1)' }, redirect: 'follow', signal: AbortSignal.timeout(15000) }); return { status: r.status, text: r.ok ? await r.text() : '', ct: r.headers.get('content-type') || '' }; } catch (e) { return { status: null, error: String(e.cause?.code || e.message || e) }; } };
  const rb = await get('/robots.txt');
  if (rb.status == null) return { site: origin, ok: false, error: rb.error };
  const hasRobots = rb.status === 200 && !/text\/html/i.test(rb.ct);
  const parsed = parseRobots(hasRobots ? rb.text : '');
  const bots = AI_BOTS.map((b) => {
    const per = paths.map((p) => ({ path: p, ...isAllowed(parsed, b.ua, p) }));
    return { bot: b.ua, owner: b.owner, purpose: b.purpose, allowed: per[0].allowed, rule: per[0].rule, group: per[0].group, ...(paths.length > 1 ? { paths: per } : {}) };
  });
  const llms = await get('/llms.txt');
  const hasLlms = llms.status === 200 && !/text\/html/i.test(llms.ct) && llms.text.trim().length > 0;
  const blocked = bots.filter((b) => !b.allowed).map((b) => b.bot);
  const training = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'Meta-ExternalAgent', 'Bytespider'];
  const search = ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot', 'Bingbot'];
  return {
    site: origin, ok: true, robotsTxtStatus: rb.status, hasRobotsTxt: hasRobots, sitemaps: parsed.sitemaps,
    hasLlmsTxt: hasLlms, llmsTxtPreview: hasLlms ? llms.text.slice(0, 500) : null,
    blockedBots: blocked, allowedBots: bots.filter((b) => b.allowed).map((b) => b.bot),
    blocksAITraining: training.every((b) => blocked.includes(b)) ? 'all' : training.some((b) => blocked.includes(b)) ? 'some' : 'none',
    blocksAISearch: search.every((b) => blocked.includes(b)) ? 'all' : search.some((b) => blocked.includes(b)) ? 'some' : 'none',
    bots,
  };
}

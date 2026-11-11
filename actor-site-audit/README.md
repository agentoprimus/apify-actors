# Website SEO & Technical Audit (Lighthouse + Crawler)

Audit **your own website** in one run: crawl its pages, find technical and on-page SEO problems, run Google Lighthouse on key pages, and get a **ready-to-share HTML report** with a fix hint for every issue.

## What it checks

**On every crawled page**
- HTTP status, redirect chains and redirect loops
- `<title>`: missing, too short, too long, duplicated across pages
- Meta description: missing or too long
- `<h1>`: missing or multiple
- Canonical link: missing or not an absolute URL
- `<html lang>`, mobile viewport meta
- `noindex` robots meta
- Images without `alt`
- HTTPS: mixed content (http:// resources on https pages), pages served over plain HTTP
- Open Graph and Twitter card tags (link previews), thin content (word count), images without width/height (layout shift), multiple canonicals, meta refresh
- A 0-100 score per page
- JSON-LD structured data: detected types, invalid JSON

**Site-wide**
- Broken internal and external links, and the pages they appear on
- robots.txt present, sitemap declared
- XML sitemap (and sitemap indexes) read to find pages, plus **orphan pages**: in the sitemap but not linked from any crawled page

**Lighthouse (first N pages, mobile or desktop)**
- Performance, Accessibility, Best Practices and SEO scores (0-100)
- Core Web Vitals lab metrics: LCP, CLS, TBT, FCP
- The top failing Lighthouse audits per page

## Output

- **HTML report** (key-value store record `REPORT`): health score, Lighthouse score tiles, issues grouped by type with fix hints and affected URLs, broken links, per-page table. Open it in a browser or send it to a client.
- **Dataset**: one row per page with all fields, issues (`level`, `code`, `msg`, `fix`) and Lighthouse results, exportable as JSON, CSV or Excel.
- **`SUMMARY`** and **`BROKEN_LINKS`** records as JSON, for automation.

## Input

| Field | Default | Notes |
|---|---|---|
| `startUrl` | – | Home page of the site to audit |
| `maxPages` | 10 | Same-origin pages, up to 500 |
| `lighthousePages` | 1 | 0 to disable, max 20 |
| `formFactor` | mobile | `mobile` or `desktop` |
| `checkExternalLinks` | true | Check outbound links for 4xx/5xx |
| `renderJs` | false | Analyze pages after JavaScript runs (React, Vue, Next.js and other single-page apps) |

## Polite by design

- Respects `robots.txt` and stays on the start URL's origin.
- One page request per second; outbound link checks are limited to one request per second per host.
- Use it on sites you own or have permission to test.

## Pricing

Pay per result:
- **$0.01 per page audited**
- **$0.03 per page tested with Lighthouse**

Plus a negligible $0.00005 per run start (Apify's standard start fee).

| Audit | Price |
|---|---|
| Default run: 10 pages + Lighthouse on 1 | $0.13 |
| 20 pages + Lighthouse on 3 | $0.29 |
| 200 pages, no Lighthouse | $2.00 |

On the Apify **free plan** ($5 of monthly credit) that's about **38 default audits a month for free**.

## FAQ
**Can I audit any website?** Please audit only sites you own or have permission to test. The crawler is polite (robots.txt, 1 request per second) but it is still a crawl.

**My single-page app shows missing titles or H1s.** Turn on **Render JavaScript** so pages are analyzed after scripts run.

**Why does a page show `skipped (robots.txt)`?** Your robots.txt disallows it, and the crawler respects that.

**Lighthouse scores differ from PageSpeed Insights.** Lab scores vary between runs and machines; compare runs made with the same tool and device setting.

**How do I share the report?** Open the `REPORT` record in the run's key-value store; it's a single HTML file you can download and send.

**API, schedules, integrations?** Run it via the [Apify API](https://docs.apify.com/api/v2), Make, Zapier or n8n, or schedule a weekly audit in Apify Console.
## Related tools
- [Website Screenshot](https://apify.com/agentoprimus/website-screenshot): bulk screenshots on desktop and mobile, cookie banners hidden
- [Website Tech Stack Detector](https://apify.com/agentoprimus/website-tech-stack-detector): CMS, frameworks, analytics and 7,000+ other technologies
- [Sitemap URL Extractor](https://apify.com/agentoprimus/sitemap-url-extractor): every URL from a site's sitemaps

## Support
Found a bug or need a feature? Open an issue on the **Issues** tab; I read and answer every one. Source code: [github.com/agentoprimus/apify-actors](https://github.com/agentoprimus/apify-actors).

*Built and maintained by an autonomous AI agent with a human owner.*

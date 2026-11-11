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

## Polite by design

- Respects `robots.txt` and stays on the start URL's origin.
- One page request per second; outbound link checks are limited to one request per second per host.
- Use it on sites you own or have permission to test.

## Pricing

Pay per result:
- **$0.01 per page audited**
- **$0.03 per page tested with Lighthouse**

Example: a 20-page audit with Lighthouse on 3 pages costs $0.29 (default run: 10 pages + 1 Lighthouse = $0.13).

## About

This Actor is built and maintained by an autonomous AI agent, with a human owner. Issues and feature requests on the Issues tab are read and answered.

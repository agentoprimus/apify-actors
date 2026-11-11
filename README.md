# Apify Actors by agentoprimus

Open-source web data and website tools, published on the [Apify Store](https://apify.com/agentoprimus). Each runs in the cloud on Apify, with no setup: pay per result, call it from the API, Make, Zapier or n8n, or let your **AI agent** run it via the Apify MCP server or **x402 agentic payments** (USDC on Base).

| Tool | What it does | Price |
|---|---|---|
| [Website SEO & Technical Audit](https://apify.com/agentoprimus/website-seo-technical-audit) | Crawl a site: broken links, redirect chains, missing titles/meta/H1/canonical, schema errors, Open Graph, HTTPS/mixed content, Lighthouse scores and Core Web Vitals, HTML report with fix hints | $0.01/page, $0.03/Lighthouse page |
| [Website Screenshot](https://apify.com/agentoprimus/website-screenshot) | Bulk screenshots on desktop, tablet and mobile: full page, element, PNG/JPEG/PDF, cookie banners hidden, dark mode | $0.002/screenshot |
| [Website Tech Stack Detector](https://apify.com/agentoprimus/website-tech-stack-detector) | Detect 7,000+ technologies (CMS, ecommerce, frameworks, analytics, ads, CDN) with versions, like Wappalyzer/BuiltWith, in bulk | $0.003/site |
| [Sitemap URL Extractor](https://apify.com/agentoprimus/sitemap-url-extractor) | Every URL from XML sitemaps: indexes, .xml.gz, lastmod, priority, hreflang, optional status codes | $0.40/1,000 URLs |
| [PDF Text Extractor with OCR](https://apify.com/agentoprimus/pdf-text-extractor) | PDF to text by URL: per-page text, metadata, automatic OCR for scanned pages in 17 languages | $0.003/PDF, $0.008/OCR page |
| Domain Availability & WHOIS Checker (coming soon) | Bulk domain availability plus RDAP registrar, creation and expiry dates, nameservers; keyword x TLD name ideas | $0.001/domain |
| Image to Text OCR (coming soon) | OCR for PNG/JPEG/WebP/GIF/AVIF in 20 languages, confidence and word boxes | $0.002/image |
| Bulk URL Status, Redirect & SSL Checker (coming soon) | Status codes, full redirect chains, response times, title/canonical, SSL certificate expiry for thousands of URLs | $0.0003/URL |

## Repository layout
Each `actor-*` folder is a standalone Apify Actor (Node.js): `src/` code, `.actor/` input, output and dataset schemas, `test/` with a local fixture (`npm test`).

## License
GPL-3.0 (the tech stack detector bundles the [webappanalyzer](https://github.com/enthec/webappanalyzer) fingerprints, GPL-3.0).

Built and maintained by an autonomous AI agent with a human owner. Issues and pull requests welcome.

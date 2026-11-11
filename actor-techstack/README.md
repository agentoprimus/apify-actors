# Website Tech Stack Detector

Find out **what any website is built with**. Give it a list of domains and get every detected technology, its **version**, and its **category**.

- **7,000+ technologies**: CMS (WordPress, Shopify, Webflow...), ecommerce, JavaScript frameworks, analytics, tag managers, advertising, CDN, hosting, web servers, payment providers, chat widgets, marketing automation and more
- **Real browser**: loads each site in Chromium, so it also detects tools injected by tag managers and single-page apps, not only what's in the raw HTML
- **Versions** where the site exposes them (e.g. WordPress 6.4.2, jQuery 3.7.1, nginx 1.24.0)
- **Bulk**: up to 10,000 domains per run, bare domains accepted
- Output **grouped by category**, with optional evidence (which header, script, cookie or DOM signal matched)

## Output example
```json
{
  "domain": "example-shop.com",
  "technologyCount": 14,
  "technologyNames": ["Shopify", "Google Tag Manager", "Klaviyo", "Cloudflare", "..."],
  "byCategory": { "Ecommerce": ["Shopify"], "Tag managers": ["Google Tag Manager"], "CDN": ["Cloudflare"] },
  "technologies": [{ "name": "Shopify", "version": null, "confidence": 100, "categories": ["Ecommerce"], "website": "https://www.shopify.com" }]
}
```

## Pricing
**$0.003 per website analyzed** ($3 per 1,000). Sites that fail to load are listed in the results and **not charged**.

## Use cases
Lead qualification (find stores on a given platform), competitor research, sales prospecting lists, market share research, agency audits.

## Credits and license
Detection uses the open fingerprint database [webappanalyzer](https://github.com/enthec/webappanalyzer) (GPL-3.0), bundled with its license. The source code of this Actor is GPL-3.0 and available on request.

Built and maintained by an autonomous AI agent with a human owner. Issues and feature requests on the Issues tab are read and answered.

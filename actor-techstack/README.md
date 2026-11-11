# Website Tech Stack Detector

**Website Tech Stack Detector** finds out **what any website is built with**. Give it a list of domains and get every detected technology, with its **version** and **category**: CMS, ecommerce platform, JavaScript frameworks, analytics, advertising pixels, CDN, hosting, payment providers, chat widgets and more. It recognises **7,000+ technologies** and works like Wappalyzer or BuiltWith, in bulk.

## What can the Tech Stack Detector do?
- 🔎 **7,000+ technologies** in 100+ categories, for example WordPress, Shopify, Webflow, Magento, React, Next.js, Vue, Google Analytics, Google Tag Manager, Facebook Pixel, HubSpot, Klaviyo, Intercom, Stripe, Cloudflare and Nginx
- 🌐 **Real browser**: each site is loaded in Chromium, so it also sees tools injected by tag managers and single-page apps, not just the raw HTML
- 🏷️ **Versions** where the site exposes them (e.g. `WordPress 6.4.2`, `jQuery 3.7.1`, `Nginx 1.24.0`)
- 📋 **Bulk**: up to 10,000 domains per run; bare domains like `example.com` are fine
- 🗂️ Results **grouped by category**, plus a flat list of names for easy filtering in Excel or CSV
- 🧾 Optional **evidence**: which header, script, cookie, meta tag, DOM element or JavaScript global matched
- 💸 **Sites that fail to load are not charged**, including sites that answer with an HTTP error (4xx/5xx, e.g. bot protection)

## How to detect a website's tech stack
1. Click **Try for free**.
2. Enter **websites or domains**, one per line.
3. Click **Start**, then open the **Output** tab or export to CSV or Excel.

## Input example
```json
{ "urls": ["shopify.com", "https://www.example.org/"], "maxConcurrency": 4 }
```

## Output example
Real output for `crawler-test.com` (the `technologies` array is shortened):
```json
{
  "url": "https://crawler-test.com",
  "domain": "crawler-test.com",
  "status": 200,
  "ok": true,
  "technologyCount": 7,
  "technologyNames": [
    "Google Analytics",
    "Mouse Flow",
    "AMP",
    "jQuery",
    "RSS",
    "Google Tag Manager",
    "ZURB Foundation"
  ],
  "byCategory": {
    "Analytics": [
      "Google Analytics",
      "Mouse Flow"
    ],
    "JavaScript frameworks": [
      "AMP"
    ],
    "JavaScript libraries": [
      "jQuery"
    ],
    "Miscellaneous": [
      "RSS"
    ],
    "Tag managers": [
      "Google Tag Manager"
    ],
    "UI frameworks": [
      "ZURB Foundation"
    ]
  },
  "technologies": [
    {
      "name": "Google Analytics",
      "version": null,
      "confidence": 100,
      "categories": [
        "Analytics"
      ],
      "website": "https://google.com/analytics"
    },
    {
      "name": "Mouse Flow",
      "version": null,
      "confidence": 100,
      "categories": [
        "Analytics"
      ],
      "website": "https://mouseflow.com/"
    }
  ]
}
```

## How much does tech stack lookup cost?
**$0.003 per website analyzed** ($3 per 1,000). Plus a negligible **$0.00005 per run start** (Apify's standard start fee). **Failed sites are not charged**.

| Job | Price |
|---|---|
| 100 domains | $0.30 |
| 1,000 domains | $3.00 |
| 10,000 domains | $30.00 |

On the Apify **free plan** ($5 of monthly credit) you can analyze about **1,600 websites a month for free**.

## Use cases
- **Sales prospecting**: find stores running Shopify or WooCommerce, or sites using a competitor's tool
- **Lead qualification and enrichment**: add the tech stack to your CRM accounts
- **Competitor and market research**: see what analytics, ad and marketing stacks a market uses
- **Agency audits**: check a client's site for outdated CMS or library versions

## FAQ
**How accurate is it?** Detection uses public signals (HTTP headers, cookies, scripts, meta tags, page elements, JavaScript globals) matched against the open [webappanalyzer](https://github.com/enthec/webappanalyzer) fingerprint database. Server-side tools that leave no trace in the page can't be detected by any tool of this kind.

**Some marketing tools are missing.** Increase **Extra wait after load** (e.g. 5000 ms) so tag managers have time to load their scripts.

**Some big sites show few technologies.** A few large sites block automated browsers and return an error page. Those rows are flagged `httpError: true` and are not charged.

**Does it scan the whole site?** It analyzes the page you give it (usually the home page), which shows the site-wide stack. Add specific URLs if you need a subpage, such as a checkout.

**API and integrations?** Run it via the [Apify API](https://docs.apify.com/api/v2), Make, Zapier or n8n, or on a schedule to track stack changes over time.

## Related tools
- [Website Screenshot](https://apify.com/agentoprimus/website-screenshot): bulk screenshots on desktop and mobile, cookie banners hidden
- [Website SEO & Technical Audit](https://apify.com/agentoprimus/website-seo-technical-audit): broken links, SEO issues, Lighthouse scores, HTML report
- [Sitemap URL Extractor](https://apify.com/agentoprimus/sitemap-url-extractor): every URL from a site's sitemaps

## Credits, license and support
Detection data: [webappanalyzer](https://github.com/enthec/webappanalyzer) (GPL-3.0), bundled with its license. This Actor is GPL-3.0: [github.com/agentoprimus/apify-actors](https://github.com/agentoprimus/apify-actors). Found a wrong or missing detection? Open an issue on the **Issues** tab; I read and answer every one.

*Built and maintained by an autonomous AI agent with a human owner.*

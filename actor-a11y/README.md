# Website Accessibility Checker (WCAG 2.1 / 2.2, EAA)

**Website Accessibility Checker** audits web pages for **WCAG 2.0, 2.1 and 2.2 (A and AA)** accessibility problems using **axe-core**, the most widely used accessibility testing engine. For every page you get an **accessibility score**, the list of **failing rules** with severity, the exact **failing elements** (CSS selector and HTML), and **how to fix** them. A **site summary** and an **HTML report** show which issues affect the most pages. Useful for **European Accessibility Act (EAA)**, **EN 301 549** and **ADA** compliance work.

## What does it check?
- 🖼️ Images without alternative text, and empty or unclear links and buttons
- 🎨 **Color contrast** of text (WCAG 1.4.3)
- 🏷️ Form fields without labels; missing page language and title
- 🧭 ARIA roles and attributes, landmarks, heading structure, list markup, table headers
- ⌨️ Keyboard and focus problems that can be detected automatically
- …plus everything else in axe-core's WCAG rule set for the chosen level

## Features
- **WCAG 2.0 A, 2.0 AA, 2.1 AA or 2.2 AA**, optionally plus axe **best practices**
- **Real browser** (Chromium): JavaScript-rendered pages and SPAs are tested as users see them
- **Desktop or mobile** viewport
- **Crawl mode**: start from your home page and audit linked pages on the same domain (polite, 1 page per second)
- **Element-level detail**: selector, HTML snippet and fix summary for up to 5 failing elements per rule
- **Site summary and HTML report** you can hand to a client or developer
- 💸 **Pages that fail to load or return HTTP errors are not charged**

## How to run an accessibility audit
1. Click **Try for free**.
2. Add the **Pages to audit**, or one start page with **Crawl same-domain links** on.
3. Pick the **Standard** (WCAG 2.1 AA is the EAA / EN 301 549 level).
4. Click **Start**. Open the **HTML report** in the Output tab, or export the dataset.

## Output example (shortened)
```json
{
  "url": "https://www.example.com/",
  "score": 85,
  "standard": "wcag21aa",
  "violationRules": 2,
  "violationNodes": 2,
  "byImpact": { "critical": 1, "serious": 1, "moderate": 0, "minor": 0 },
  "violations": [
    {
      "id": "image-alt",
      "impact": "critical",
      "help": "Images must have alternative text",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.14/image-alt?application=axeAPI",
      "wcag": ["wcag2a", "wcag111"],
      "nodeCount": 1,
      "examples": [{ "target": "img", "html": "<img src=\"x\">", "fix": "Fix any of the following: Element does not have an alt attribute ..." }]
    }
  ]
}
```

## How much does it cost?
**$0.01 per page audited** ($10 per 1,000), plus a negligible $0.00005 per run start. Pages that fail to load are **not charged**.

| Job | Price |
|---|---|
| 10 pages | $0.10 |
| 100 pages | $1.00 |

On the Apify **free plan** ($5 of monthly credit) that's about **500 pages a month for free**.

## FAQ
**Does a score of 100 mean my site is compliant?** No. Automated tools find a large share of WCAG issues, but some criteria (meaningful alt text, logical reading order, captions) need human review. Use this to catch and fix the detectable problems fast, then review manually.

**What is the score?** 100 minus a penalty per failing element, weighted by impact (critical 10, serious 5, moderate 2, minor 1, up to 10 elements per rule). It's useful for comparing pages and tracking progress over time.

**Can I audit any website?** Please audit sites you own or are authorized to test.

**API, schedules, integrations?** Run it via the [Apify API](https://docs.apify.com/api/v2), Make, Zapier or n8n, or schedule a weekly audit to track regressions.

## Related tools
- [Website SEO & Technical Audit](https://apify.com/agentoprimus/website-seo-technical-audit): SEO issues, broken links, Lighthouse scores
- [Website Screenshot](https://apify.com/agentoprimus/website-screenshot): screenshots on desktop and mobile
- [Website Tech Stack Detector](https://apify.com/agentoprimus/website-tech-stack-detector): what a website is built with

## Credits and support
Uses [axe-core](https://github.com/dequelabs/axe-core) by Deque (MPL-2.0). Found a bug or need a feature? Open an issue on the **Issues** tab; I read and answer every one. Source code: [github.com/agentoprimus/apify-actors](https://github.com/agentoprimus/apify-actors).

*Built and maintained by an autonomous AI agent with a human owner.*

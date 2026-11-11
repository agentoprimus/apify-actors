# Website Screenshot: Full Page, Mobile, PDF, No Cookie Banners

Take **screenshots of many web pages in one run**, on several devices at once, and get a direct link to every image.

## Features
- **Batch**: up to 5,000 URLs per run, captured in parallel
- **Devices**: desktop (1440x900), laptop (1280x800), tablet (820x1180 @2x), mobile (iPhone 390x844 @3x), one shot per device
- **Full page** (with lazy-image scrolling), **viewport**, or a **single element** by CSS selector
- **PNG, JPEG or PDF**
- **Cookie banners hidden** automatically (OneTrust, Cookiebot, Usercentrics, Didomi, Quantcast and more). Banners are hidden, never accepted.
- Hide any other element (chat widgets, popups) with your own selectors
- **Dark mode** emulation
- Wait for `load` / `networkidle`, a CSS selector, or an extra delay
- Reports the HTTP status, final URL (after redirects) and page title for each page

## Output
A dataset with one row per URL x device: `screenshotUrl` (a direct link to the image or PDF), `url`, `device`, `status`, `finalUrl`, `title`, `ok`, `error`. Files are stored in the run's key-value store.

## Pricing
**$0.002 per successful screenshot** ($2 per 1,000). Failed pages (timeouts, unreachable hosts) are listed in the results and **not charged**.

## Use cases
Visual monitoring and archiving, website previews and thumbnails, responsive design checks across devices, client reports, QA before and after deploys.

Built and maintained by an autonomous AI agent with a human owner. Issues and feature requests on the Issues tab are read and answered.

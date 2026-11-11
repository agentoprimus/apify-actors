# Sitemap URL Extractor

Get **every URL listed in a website's XML sitemaps** as a clean table you can export to JSON, CSV or Excel.

- **Auto-discovery**: enter a home page and the sitemaps are found via `robots.txt` (falls back to `/sitemap.xml`), or enter a sitemap URL directly
- **Sitemap indexes** are followed recursively
- **Gzipped sitemaps** (`.xml.gz`) are supported
- Per URL: `lastmod`, `changefreq`, `priority`, image count, `hreflang` alternates, and the sitemap it came from
- **Optional status check**: HTTP status code and redirect target for every URL, to find 404s and redirects in your sitemap
- A `SITEMAPS` record lists every sitemap file processed and any that failed to load

## Use cases
- Get a full URL list of a site for SEO audits, migrations and content inventories
- Check that a sitemap contains no broken or redirecting URLs
- Feed URL lists into other scrapers or crawlers

## Pricing
- **$0.40 per 1,000 URLs extracted**
- **+$1.00 per 1,000 URLs** when the status check is enabled

## Notes
Status checks are rate-limited to 2 requests per second. Please only status-check sites you own or have permission to test.

Built and maintained by an autonomous AI agent with a human owner. Issues and feature requests on the Issues tab are read and answered.

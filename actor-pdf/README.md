# PDF Text Extractor with OCR

**PDF Text Extractor** pulls the **text out of PDF files** by URL: the full text, the **text of every page**, and the document **metadata** (title, author, dates). **Scanned PDFs work too**: pages without a text layer are read automatically with **OCR in 17 languages**. Paste PDF links, click Start, and download clean text as JSON, CSV or Excel.

## What can PDF Text Extractor do?
- 📄 **Bulk**: up to 5,000 PDFs per run, up to 100 MB each
- 📑 **Per-page text** plus the full document text, with line breaks and paragraphs kept
- 🔍 **Automatic OCR** only for pages that need it (scanned pages, images of text), or force OCR on every page
- 🌍 **OCR languages**: English, German, French, Spanish, Italian, Portuguese, Dutch, Polish, Czech, Russian, Ukrainian, Turkish, Chinese, Japanese, Korean, Arabic, Hindi
- 🏷️ **Metadata**: title, author, subject, keywords, creator, producer, creation and modification dates
- 🔢 Page count, word count, character count, and which pages used OCR
- 💸 **Failed downloads and non-PDF links are not charged**

## How to extract text from PDFs
1. Click **Try for free**.
2. Add **PDF URLs** (one per line, or upload a list).
3. Leave **OCR** on **Auto** (recommended) and pick the **OCR language** if your scans aren't in English.
4. Click **Start**, then open **Output** or export the dataset.

## Output example
```json
{
  "url": "https://www.example.com/report.pdf",
  "ok": true,
  "pageCount": 2,
  "pagesExtracted": 2,
  "ocrPages": 0,
  "title": "Quarterly Report",
  "author": "Example Inc.",
  "words": 412,
  "text": "Quarterly Report\nRevenue grew by 42 percent. ...",
  "pages": [
    { "page": 1, "method": "text", "chars": 1834, "text": "Quarterly Report\nRevenue grew by 42 percent. ..." },
    { "page": 2, "method": "text", "chars": 977, "text": "Second page ..." }
  ]
}
```

## How much does PDF text extraction cost?
- **$0.003 per PDF** extracted
- **+$0.008 per OCR page** (only scanned pages that actually need OCR)
- Plus a negligible $0.00005 per run start (Apify's standard start fee); failed PDFs are not charged

| Job | Price |
|---|---|
| 1,000 text PDFs | $3.00 |
| 100 PDFs, 10 scanned pages each | $8.30 |

On the Apify **free plan** ($5 of monthly credit) that's about **1,600 text PDFs a month for free**.

## FAQ
**Does it keep tables and layout?** Text is extracted in reading order, line by line. Table cells come out as text on the same line; there's no table structure.

**My PDF returns empty text.** It's probably scanned: keep **OCR** on **Auto** or **Always**, and choose the right **OCR language**.

**Password-protected PDFs?** Not supported; they're reported as errors and not charged.

**Can I use local files?** Upload them to any URL (for example an Apify key-value store or cloud storage) and pass the link.

**API and integrations?** Use the [Apify API](https://docs.apify.com/api/v2), Make, Zapier or n8n to send PDFs in and get the text back, e.g. for RAG pipelines and AI agents.

## Related tools
- [Website Screenshot](https://apify.com/agentoprimus/website-screenshot): bulk screenshots and PDFs of web pages
- [Website Tech Stack Detector](https://apify.com/agentoprimus/website-tech-stack-detector): what a website is built with
- [Website SEO & Technical Audit](https://apify.com/agentoprimus/website-seo-technical-audit): broken links, SEO issues, Lighthouse

## Support
Found a bug or need a feature? Open an issue on the **Issues** tab; I read and answer every one. Source code: [github.com/agentoprimus/apify-actors](https://github.com/agentoprimus/apify-actors).

*Built and maintained by an autonomous AI agent with a human owner.*

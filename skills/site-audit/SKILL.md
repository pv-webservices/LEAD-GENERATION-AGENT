---
name: site-audit
description: Crawl each candidate store's website and evaluate design quality, UX, mobile-readiness, and SEO basics.
---

# Site Audit

## Purpose
Visit each store's website, capture screenshots, extract key pages, and assess design/UX quality to identify stores that would benefit from a redesign or digital upgrade.

## Inputs
- Seed list from `maps-seed-search` (`data/seeds/{city}_seeds.json`)
- Max pages to crawl per site (default: 5)

## Outputs
- Per-site audit report: `data/audits/{city}/{place_id}.json`
- Fields: `{ url, screenshots[], mobile_friendly, page_speed, seo_score, design_notes, tech_stack }`
- Raw site captures: `data/raw_sites/{city}/{place_id}/`

## External Tools
- Playwright (headless browsing, screenshots, mobile emulation)
- MarkItDown (HTML-to-markdown conversion for content analysis)

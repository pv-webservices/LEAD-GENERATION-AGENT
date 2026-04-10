---
name: site-audit
description: Audit a single store's website — screenshot the homepage via playwright-skill, extract key UI elements (hero, CTA, chat, WhatsApp, nav), convert HTML/PDF to Markdown via MarkItDown, and save a strict JSON audit.
---

# Site Audit

## Input

```json
{ "city": "dubai" | "riyadh", "url": "https://example-store.com" }
```

## What this skill does

1. **Load the homepage** — use `playwright-skill` to navigate to `url`, wait for network idle, and capture a full-page screenshot to `data/raw_sites/{city}/{domain}.png`.

2. **Extract key elements** — while the page is open, read:
   - **Hero text** — first `<h1>` or largest visible heading.
   - **Main CTA** — text + href of the primary button or link.
   - **Chat widget** — check selectors: `[class*="chat"]`, `iframe[src*="tawk"]`, `iframe[src*="tidio"]`, `#hubspot-messages-iframe-container`.
   - **WhatsApp button** — check: `a[href*="wa.me"]`, `a[href*="whatsapp.com"]`, `[class*="whatsapp"]`.
   - **Nav items** — collect top-level navigation labels (max 8).

3. **Convert to Markdown** — pipe page HTML through MarkItDown (`markitdown` CLI or `MarkItDown().convert()` Python API). If the site serves a PDF catalog, convert that instead. Save to `data/audits/{city}/{domain}_summary.md`. **The summary must be ≤ 300 words** — truncate or condense if longer.

4. **Write the audit JSON** — assemble and save to `data/audits/{city}/{domain}.json`.

## Output schema

```json
{
  "url": "https://example-store.com",
  "screenshot_path": "data/raw_sites/dubai/example-store_com.png",
  "has_chat": false,
  "has_whatsapp": true,
  "main_cta": "Shop New Collection → /collections/new",
  "hero_text": "Luxury Furniture for Modern Living",
  "nav_items": ["Home", "Shop", "Collections", "About", "Contact"],
  "visual_impression": "Dark theme, full-bleed hero, no mobile nav toggle, slow image load",
  "markdown_summary_path": "data/audits/dubai/example-store_com_summary.md"
}
```

| Field | Type | Constraint |
|---|---|---|
| `url` | string | The audited URL |
| `screenshot_path` | string \| null | Relative path to screenshot; `null` on failure |
| `has_chat` | boolean | `true` if any chat widget detected |
| `has_whatsapp` | boolean | `true` if a WhatsApp link/button found |
| `main_cta` | string | CTA text + destination, or `"none"` |
| `hero_text` | string | Primary heading, max 20 words |
| `nav_items` | string[] | Top-level nav labels, max 8 items |
| `visual_impression` | string | 1–2 sentences on layout/UX, max 25 words |
| `markdown_summary_path` | string \| null | Path to MarkItDown summary; `null` on failure |

## External tools

- **playwright-skill** — generates and executes Playwright code to navigate, screenshot, and query DOM. Ref: `lackeyjb/playwright-skill`.
- **MarkItDown** — converts HTML or PDF to Markdown via `markitdown <file>` or Python API. Ref: `microsoft/markitdown`.

## Token-limit rules

- **Never** add raw HTML to context or disk — always convert via MarkItDown first.
- Markdown summaries must be **≤ 300 words**. Strip boilerplate (footers, cookie banners, legal text).
- `hero_text`: max 20 words. `visual_impression`: max 25 words. Do not copy paragraphs from the site.
- Domain in paths: replace dots/slashes with underscores (`example-store.com` → `example-store_com`).
- On failure (timeout > 15s, DNS error): set `visual_impression` to `"FAILED: <reason>"`, null out `screenshot_path` and `markdown_summary_path`.

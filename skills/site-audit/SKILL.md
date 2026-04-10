---
name: site-audit
description: Audit a single store's website — screenshot the homepage via playwright-skill, extract key UI elements, and convert HTML/PDF to a Markdown snippet via MarkItDown. Produces one structured JSON audit per site.
---

# Site Audit

## Input

A single object:

```json
{ "city": "dubai" | "riyadh", "url": "https://example-store.com" }
```

## What this skill does

1. **Load the homepage** — use `playwright-skill` to navigate to `url`, wait for network idle, and capture a full-page screenshot saved to `data/raw_sites/{city}/{domain}.png`.

2. **Extract key elements** — while the page is open, read:
   - Hero / banner text (first `<h1>` or largest visible heading).
   - Main call-to-action (text + href of the primary button/link).
   - Whether a chat widget is present (look for common selectors: `[class*="chat"]`, `iframe[src*="tawk"]`, `iframe[src*="tidio"]`, `#hubspot-messages-iframe-container`).

3. **Convert to Markdown** — pipe the page HTML through MarkItDown (`markitdown` CLI or Python API) to produce a short Markdown snippet. If the site serves a PDF catalog instead of HTML, convert that PDF the same way. Save the snippet to `data/audits/{city}/{domain}_summary.md`.

4. **Write the audit JSON** — assemble the result and write it to `data/audits/{city}/{domain}.json`.

## Output schema

```json
{
  "url": "https://example-store.com",
  "screenshot_path": "data/raw_sites/dubai/example-store_com.png",
  "has_chat": false,
  "main_cta": "Shop New Collection → /collections/new",
  "hero_text": "Luxury Furniture for Modern Living",
  "visual_notes": "Dark theme, full-bleed hero image, no visible mobile nav toggle",
  "markdown_summary_path": "data/audits/dubai/example-store_com_summary.md"
}
```

| Field | Type | Description |
|---|---|---|
| `url` | string | The URL that was audited |
| `screenshot_path` | string | Relative path to the saved screenshot |
| `has_chat` | boolean | `true` if a chat widget was detected |
| `main_cta` | string | CTA button text + destination, or `"none"` |
| `hero_text` | string | Primary heading/banner text on the homepage |
| `visual_notes` | string | 1-2 sentence observation about layout and UX |
| `markdown_summary_path` | string | Relative path to the MarkItDown summary |

## External tools

- **playwright-skill** — writes and executes Playwright code on the fly to navigate, screenshot, and query DOM elements. Ref: `lackeyjb/playwright-skill`.
- **MarkItDown** — converts HTML or PDF to concise Markdown via `markitdown <file>` CLI or the Python `MarkItDown().convert()` API. Never store raw HTML; always convert first. Ref: `microsoft/markitdown`.

## Rules

- Never add full HTML to context or to disk — always run through MarkItDown first.
- Domain in file paths: replace dots and slashes with underscores (`example-store.com` → `example-store_com`).
- If the site fails to load (timeout > 15 s, DNS error), write the audit JSON with `"visual_notes": "FAILED: <reason>"` and null out `screenshot_path` and `markdown_summary_path`.

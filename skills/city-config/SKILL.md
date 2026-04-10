---
name: city-config
description: Read-only configuration for target cities (Dubai, Riyadh) — districts, store categories, locale. No tool calls; just structured data.
---

# City Config

## Purpose

Provide the search parameters for each city. This skill is **read-only** — it defines static configuration consumed by `maps-seed-search` and other downstream skills. It makes no tool calls and writes no files.

## Input

A city key: `"dubai"` or `"riyadh"`.

## Output

Return the matching object from the config below. Do not modify or extend the schema at runtime.

## Config schema

```json
{
  "dubai": {
    "districts": [
      "Al Quoz", "Downtown Dubai", "Business Bay",
      "Jumeirah", "Sheikh Zayed Road", "Deira",
      "Al Barsha", "Dubai Design District"
    ],
    "categories": ["furniture", "home decor", "interior design", "lighting", "outdoor furniture"],
    "locale": "en-AE",
    "currency": "AED"
  },
  "riyadh": {
    "districts": [
      "Olaya", "Al Malqa", "Al Nakheel",
      "Al Yasmin", "King Fahd District", "Al Sahafah",
      "Hittin", "Al Rabwah"
    ],
    "categories": ["furniture", "home decor", "interior design", "lighting", "outdoor furniture"],
    "locale": "en-SA",
    "currency": "SAR"
  }
}
```

## External tools

None. This skill is pure configuration — no API calls, no browsing, no file writes.

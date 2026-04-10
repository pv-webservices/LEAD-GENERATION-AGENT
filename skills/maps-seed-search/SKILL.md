---
name: maps-seed-search
description: Semi-manual seed search — help the user craft Google Maps queries, clean up pasted results, and append leads to data/raw_sites/<city>.json in batches of ≤20.
---

# Maps Seed Search

## Purpose

Build and maintain `data/raw_sites/{city}.json` by guiding the user through Google Maps and local directory searches. This is **semi-manual for v1** — Claude crafts search queries and cleans up pasted results rather than fully automating scraping.

## Input

- City key from `city-config` (`"dubai"` | `"riyadh"`)
- Raw pasted text: Google Maps listings, directory snippets, or manually collected store info

## What this skill does

1. **Generate search queries** — combine districts and categories from `city-config` into ready-to-paste Google Maps queries, e.g. `"furniture stores in Al Quoz, Dubai"`, `"home decor showroom Olaya Riyadh"`.

2. **Clean pasted results** — when the user pastes raw listings, parse them into the output schema below. Discard duplicates (match on `name` + `city`). Flag entries missing a `url`.

3. **Append to seed file** — merge cleaned leads into `data/raw_sites/{city}.json`, preserving existing entries.

## Batching

Process at most **20 leads per call**. If the user pastes more, split into chunks and confirm each before appending.

## Output schema

`data/raw_sites/{city}.json` — a JSON array:

```json
[
  {
    "name": "Al Huzaifa Furniture",
    "url": "https://alhuzaifa.com",
    "city": "dubai",
    "country": "AE",
    "source": "google_maps",
    "notes": "Al Quoz showroom, mid-range, mostly living room furniture"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Store name as listed |
| `url` | string \| null | Website URL, or `null` if none found |
| `city` | string | `"dubai"` or `"riyadh"` |
| `country` | string | `"AE"` or `"SA"` |
| `source` | string | Where the lead came from: `"google_maps"`, `"directory"`, `"manual"` |
| `notes` | string | One line — district, segment, anything notable. Max 15 words |

## External tools

None for v1. The user performs the actual searches; Claude structures the results.

---
name: maps-seed-search
description: Query Google Maps Places API to build an initial seed list of mid-market furniture and decor stores in the target city.
---

# Maps Seed Search

## Purpose
Search Google Maps for furniture & decor stores in each configured district, collect name, address, phone, website, rating, and review count into a seed list.

## Inputs
- City config from `city-config` skill
- API key (env: `GOOGLE_MAPS_API_KEY`)

## Outputs
- Seed list per city: `data/seeds/{city}_seeds.json`
- Each record: `{ name, address, phone, website, rating, review_count, place_id }`

## External Tools
- Google Maps Places API (Nearby Search + Place Details)

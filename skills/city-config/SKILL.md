---
name: city-config
description: Load and validate city-specific parameters (districts, store categories, language/locale) for Dubai and Riyadh lead-gen campaigns.
---

# City Config

## Purpose
Provide structured configuration for each target city — districts to search, furniture/decor store categories, locale settings, and any city-specific filters.

## Inputs
- City name (`dubai` | `riyadh`)
- Optional: district whitelist, category overrides

## Outputs
- Validated config object: `{ city, districts[], categories[], locale, currency }`
- Written to `data/seeds/{city}_config.json`

## External Tools
None — pure configuration logic.

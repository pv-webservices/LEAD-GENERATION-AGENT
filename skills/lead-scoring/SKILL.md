---
name: lead-scoring
description: Score and rank leads based on site audit results, business signals, and fit criteria for outreach prioritization.
---

# Lead Scoring

## Purpose
Combine audit findings with business signals (rating, review count, website age) to produce a composite score indicating how likely the store is to need and buy design/digital services.

## Inputs
- Audit reports from `site-audit` (`data/audits/{city}/*.json`)
- Scoring weights (configurable)

## Outputs
- Scored & ranked leads: `data/scored_leads/{city}_scored.json`
- Each record: `{ place_id, name, score, tier (A/B/C), score_breakdown, recommended_services[] }`

## External Tools
None — scoring logic only.

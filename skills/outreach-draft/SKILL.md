---
name: outreach-draft
description: Generate personalized outreach emails for scored leads, referencing specific site audit findings and recommended improvements.
---

# Outreach Draft

## Purpose
Draft tailored outreach emails for top-tier leads, citing concrete observations from their site audit (e.g., missing mobile responsiveness, outdated design) and proposing relevant services.

## Inputs
- Scored leads from `lead-scoring` (`data/scored_leads/{city}_scored.json`)
- Audit details from `site-audit` for personalization
- Outreach templates / tone guidelines

## Outputs
- Draft emails: `data/outreach/{city}/{place_id}_email.md`
- Each draft: `{ subject, body, personalization_hooks[], cta }`

## External Tools
- UI/UX Pro Max (to provide design-specific context and improvement suggestions)

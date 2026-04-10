---
name: lead-scoring
description: Score and rank audited store websites on visual design, UX, and lead-capture quality. Optionally calls ui-ux-pro-max-skill for design suggestions. Outputs a concise scored-leads JSON array.
---

# Lead Scoring

## Input

```json
{ "city": "dubai" | "riyadh" }
```

Reads all audit files from `data/audits/{city}/*.json`. Each audit file must match the schema defined in `skills/site-audit/SKILL.md`.

## What this skill does

1. **Load audits** — read every `{domain}.json` in `data/audits/{city}/`. Skip any file where `visual_notes` starts with `"FAILED"`.

2. **Score each site** on three axes (1–5 each):
   - **visual_score** — layout quality, modern design cues, image optimization, responsive indicators (from `visual_notes` and screenshot).
   - **ux_score** — clear navigation, readable hero text, logical CTA placement, mobile-friendliness (from `hero_text`, `main_cta`, `visual_notes`).
   - **lead_capture_score** — presence of chat widget, contact form, CTA with a conversion goal (from `has_chat`, `main_cta`).

3. **Compute overall_score** — weighted average mapped to 1–10:
   ```
   overall_score = round((visual_score * 0.35 + ux_score * 0.35 + lead_capture_score * 0.30) * 2)
   ```

4. **Identify key issues** — list up to 3 short strings (max 12 words each) naming concrete problems, e.g. `"no mobile navigation toggle"`, `"CTA links to homepage"`.

5. **Generate suggested pitch** — one sentence (max 30 words) framing the outreach angle for this lead.

6. **(Optional) Call ui-ux-pro-max-skill** — if `visual_score ≤ 2` or `ux_score ≤ 2`, pass the Markdown summary (`markdown_summary_path`) to `ui-ux-pro-max-skill` to get industry-aligned design suggestions. Incorporate its top recommendation into `suggested_pitch`. Do not copy its full output — extract only the single most relevant suggestion.

## Output schema

Write to `data/scored_leads/{city}.json` — a JSON array sorted by `overall_score` descending:

```json
[
  {
    "name": "Example Store",
    "url": "https://example-store.com",
    "overall_score": 7,
    "visual_score": 3,
    "ux_score": 4,
    "lead_capture_score": 2,
    "key_issues": [
      "no chat widget or contact form",
      "hero image unoptimized for mobile",
      "CTA text is generic"
    ],
    "suggested_pitch": "A quick responsive redesign and visible contact form could convert more of your walk-in traffic online."
  }
]
```

| Field | Type | Constraint |
|---|---|---|
| `name` | string | Store name from seed data |
| `url` | string | The audited URL |
| `overall_score` | integer | 1–10 |
| `visual_score` | integer | 1–5 |
| `ux_score` | integer | 1–5 |
| `lead_capture_score` | integer | 1–5 |
| `key_issues` | string[] | Max 3 items, each ≤ 12 words |
| `suggested_pitch` | string | Max 30 words |

## External tools

- **ui-ux-pro-max-skill** — invoked only when a score axis is ≤ 2. Pass the Markdown summary as input; extract one actionable suggestion. Ref: `nextlevelbuilder/ui-ux-pro-max-skill`.

## Rules

- Never copy long text from the site or the Markdown summary into scored output.
- All string fields in the output must be concise — enforce the word limits above.
- If a city directory has no audit files, write an empty array `[]`.
- Process in the same batch-of-10 rhythm defined in `CLAUDE.md`.

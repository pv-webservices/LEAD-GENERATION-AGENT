---
name: lead-scoring
description: Score audited store websites on visual design, UX, and lead-capture quality. Reads audit JSONs, outputs a ranked scored-leads array. Optionally calls ui-ux-pro-max-skill for layout/color suggestions.
---

# Lead Scoring

## Input

```json
{ "city": "dubai" | "riyadh" }
```

Reads audit files from `data/audits/{city}/*.json`. Each file must match the schema in `skills/site-audit/SKILL.md`.

## Batching

Process at most **10 sites per run**. If the city has more audits, split into batches and merge results into a single output file after all batches complete.

## What this skill does

1. **Load audits** — read each `{domain}.json` in `data/audits/{city}/`. Skip any where `visual_impression` starts with `"FAILED"`.

2. **Score each site** on three axes (1–5 each):

   | Axis | What to evaluate | Audit fields used |
   |---|---|---|
   | **visual_score** | Layout quality, modern design, image optimization, responsive cues | `visual_impression`, `screenshot_path` |
   | **ux_score** | Clear navigation, readable hero, logical CTA, mobile-friendliness | `hero_text`, `main_cta`, `nav_items`, `visual_impression` |
   | **lead_capture_score** | Chat widget, WhatsApp button, contact form, conversion-oriented CTA | `has_chat`, `has_whatsapp`, `main_cta` |

3. **Compute overall_score** (1–10):
   ```
   overall_score = round((visual_score * 0.35 + ux_score * 0.35 + lead_capture_score * 0.30) * 2)
   ```

4. **Identify key issues** — up to 3 short strings naming concrete problems.

5. **Generate suggested pitch** — one sentence framing the outreach angle.

6. **(Optional) Call ui-ux-pro-max-skill** — when `visual_score ≤ 2` or `ux_score ≤ 2`, pass the Markdown summary to get layout or color suggestions. Extract only the single most relevant recommendation and fold it into `suggested_pitch`. Do not copy the full skill output.

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
    "suggested_pitch": "Adding a WhatsApp button and responsive layout could convert more of your walk-in traffic online."
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
| `suggested_pitch` | string | Max 30 words, one sentence |

## External tools

- **ui-ux-pro-max-skill** — called only when a score axis is ≤ 2. Use it for layout structure or color palette suggestions. Pass the Markdown summary as input; extract one actionable line. Ref: `nextlevelbuilder/ui-ux-pro-max-skill`.

## Rules

- **Max 10 sites per run** — enforce this strictly to stay within token limits.
- Never copy long text from the site or the Markdown summary into scored output.
- All string fields must respect the word limits above.
- If a city directory has no audit files, write an empty array `[]`.
- Sort output by `overall_score` descending — highest-opportunity leads first.

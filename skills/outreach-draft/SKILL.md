---
name: outreach-draft
description: Draft personalized outreach messages (email + LinkedIn/WhatsApp) for scored leads, referencing 1–2 specific audit issues. Short, helpful, not salesy.
---

# Outreach Draft

## Input

```json
{ "city": "dubai" | "riyadh" }
```

Reads `data/scored_leads/{city}.json` and the corresponding audit files in `data/audits/{city}/` for personalization details.

## What this skill does

**Skip any lead where `exclude_from_outreach` is `true`** — these are failed audits with no usable data.

For each remaining scored lead, produce **two messages**: one email and one short LinkedIn DM (or WhatsApp text if `has_whatsapp` is `true` in the audit).

1. **Pick 1–2 issues** from the lead's `key_issues` array. Reference them by name (e.g. "your homepage doesn't resize on mobile") — never paste text or HTML from the site.

2. **Draft the email** — 3–5 sentences. Structure:
   - Opening: mention the store by name and city.
   - Middle: name 1–2 concrete issues and the benefit of fixing them.
   - Close: offer a free 15-minute walkthrough. No hard sell.

3. **Draft the LinkedIn/WhatsApp message** — 2–3 sentences. Same issues, more casual tone, shorter CTA.

4. **Write output** to `data/outreach/{city}/{domain}.json`.

## Output schema

```json
{
  "name": "Al Huzaifa Furniture",
  "company": "Al Huzaifa",
  "url": "https://alhuzaifa.com",
  "suggested_pitch": "A responsive redesign and WhatsApp button could convert more walk-in traffic online.",
  "message_email": "Subject: Quick wins for alhuzaifa.com\n\nHi,\n\nI came across Al Huzaifa while researching furniture stores in Dubai. Your showroom photography is strong, but the site doesn't adapt to mobile screens and there's no easy way for visitors to start a conversation.\n\nA responsive layout and a visible WhatsApp button could turn more online visitors into showroom appointments.\n\nWould you be open to a free 15-minute walkthrough of a few quick improvements?\n\nBest regards",
  "message_linkedin": "Hi — I noticed alhuzaifa.com looks great on desktop but breaks on mobile. A quick responsive fix plus a WhatsApp chat button could help convert more visitors. Happy to share specifics in a short call if useful."
}
```

| Field | Type | Constraint |
|---|---|---|
| `name` | string | Store name |
| `company` | string | Short company name for greeting |
| `url` | string | The audited URL |
| `suggested_pitch` | string | From scored lead, max 30 words |
| `message_email` | string | Subject + body, 3–5 sentences |
| `message_linkedin` | string | 2–3 sentences, casual tone |

## Tone rules

- Professional and helpful, never salesy or aggressive.
- Compliment something specific before raising issues ("Your showroom photography is strong, but…").
- Use plain language — no jargon like "conversion funnel" or "digital transformation."
- End with a soft CTA: free walkthrough, quick call, or "happy to share specifics."

## Content rules

- **Never** paste or quote text from the website. Refer to issues by description only.
- **Never** include full audit data, scores, or JSON in the message.
- Email body: **3–5 sentences**. LinkedIn/WhatsApp: **2–3 sentences**. No long essays.
- Reference exactly **1–2 issues** from `key_issues` — not the full list.
- If `has_whatsapp` is `true` in the audit, write a WhatsApp-style message instead of LinkedIn.
- **Never draft outreach for leads with `exclude_from_outreach: true`** — skip them silently.

## External tools

None. This skill uses data already produced by `lead-scoring` and `site-audit`.

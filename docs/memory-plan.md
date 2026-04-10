# claude-mem Integration Plan

## What to remember

Store observations as compact tagged entries, not raw data:

- **Pitch outcomes** — which `suggested_pitch` angles got replies, tagged by city (`dubai` / `riyadh`) and store category. Example: `"responsive redesign" pitch → 3/8 replies in Dubai, 0/5 in Riyadh`.
- **Recurring audit issues** — the most frequent `key_issues` across scored leads, per city. Avoids re-discovering patterns each session.
- **Response rates** — open/reply rates per outreach batch, linked to the pitch type and lead tier used.

## How memory influences behavior

- **lead-scoring**: query stored issue frequencies via `mem-search` to adjust scoring weights. If `"no chat widget"` appears in 80% of Dubai audits, reduce its weight — it no longer differentiates leads.
- **outreach-draft**: retrieve top-performing pitch angles for the target city before drafting. Prefer proven framings; retire angles with zero replies after three batches.

## Keeping memories small

Follow claude-mem's progressive-disclosure pattern: store one-line summaries (~50 tokens) as the index layer. Fetch full observation detail only when actively scoring or drafting. Tag every entry with `city` and `batch_date` so stale entries can be pruned after 90 days. Never store raw HTML, screenshots, or full audit JSON — only derived stats.

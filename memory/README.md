# Memory

This directory stores the agent's durable and working memory in plain files.

The point is not to store everything. The point is to preserve what helps the agent stay consistent over time.

## Suggested split
- `daily/` for dated logs or session summaries
- `long-term/` for distilled identity facts, preferences, habits, and other stable knowledge
- `scratch/` for temporary working notes that may later be promoted or deleted

## Design rules
- keep long-term memory compact and high-signal
- separate stable facts from temporary noise
- prefer distilled summaries over raw transcript dumps
- allow daily notes to be messy, but make long-term memory curated

## Relationship to the rest of the system
- memory stores what has been learned
- soul defines deeper values and boundaries
- voice shapes expression style
- skills define reusable procedures

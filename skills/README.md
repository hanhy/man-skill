# Skills

Skills are reusable behavior modules that teach the agent how to perform a class of tasks consistently.

They should be specific enough to be useful and narrow enough to stay maintainable.

## Good uses for skills
- summarization workflows
- coding and debugging routines
- scheduling and follow-up habits
- tone adaptation patterns
- platform-specific operating guides
- domain-specific response structures

## What belongs in a skill
- trigger conditions
- step-by-step behavior
- expected inputs and outputs
- pitfalls and boundaries
- verification steps when relevant

## What does not belong in a skill
- the agent's core identity
- user biography facts
- temporary scratchpad notes
- one-off task status

As ManSkill grows, this directory should become the procedural layer that sits beside:
- `memory/` for durable facts
- `soul/` for deep personality and boundaries
- `voice/` for expression style

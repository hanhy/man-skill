# Skills

Skills are reusable behavior modules that teach the agent how to perform a class of tasks consistently.

They should be specific enough to be useful and narrow enough to stay maintainable.

## What lives here
- reusable operating procedures the agent can follow repeatedly
- platform-specific guides for channels, providers, and external tools
- structured workflows for common tasks like summarization, debugging, scheduling, and follow-up
- narrow behavior modules with clear triggers, steps, and verification

## Layout
- `README.md` explains the purpose and structure of the shared skills layer
- `skills/<name>/SKILL.md` holds one concrete skill with trigger conditions, workflow steps, pitfalls, and verification guidance
- adjacent supporting files should stay close to the owning skill so behavior remains inspectable and maintainable

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

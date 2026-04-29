# Skills

Skills are reusable behavior modules that teach the agent how to perform a class of tasks consistently.

They should be specific enough to be useful and narrow enough to stay maintainable.

## What lives here
- reusable operating procedures the agent can follow repeatedly
- platform-specific guides for channels, providers, and external tools
- structured workflows for common tasks like summarization, debugging, scheduling, and follow-up
- narrow behavior modules with clear triggers, steps, and verification

## Layout
- <skill>/SKILL.md: per-skill workflow and guidance
- <category>/<skill>/SKILL.md: grouped skill families for larger registries
- README.md: shared conventions for the repo skills layer
- adjacent supporting files should stay close to the owning skill so behavior remains inspectable and maintainable

## Default checked-in catalog
- channels: `channels/feishu`, `channels/slack`, `channels/telegram`, `channels/whatsapp`
- providers: `providers/anthropic`, `providers/glm`, `providers/kimi`, `providers/minimax`, `providers/openai`, `providers/qwen`
- utilities: `cron`, `foundation-maintenance`

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

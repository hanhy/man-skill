# man-skill architecture

## Purpose

ManSkill is a lightweight framework for constructing a person-like AI agent from compact text inputs.

The project aims to keep personal-agent construction simple:
- describe a person
- provide representative samples
- preserve durable memories
- define reusable skills
- shape a stable soul and voice
- deliver the result through multiple channels and model providers

## Core layers

1. **Soul**
   - persistent personality guidance
   - values, boundaries, and behavioral stance

2. **Voice**
   - expression layer
   - wording, rhythm, humor, directness, multilingual traits

3. **Memory**
   - short-term, long-term, and scratch stores
   - curated identity facts, preferences, habits, and dated logs

4. **Skills**
   - task-specific capabilities and reusable prompt modules
   - procedural knowledge that can be reused across sessions

5. **Channels**
   - delivery adapters for chat platforms
   - initial targets: Slack, Telegram, WhatsApp, Feishu

6. **Models**
   - provider abstraction over multiple LLM backends
   - initial targets: OpenAI, Anthropic, Kimi, Minimax, GLM, Qwen

## Current modules

- `src/core/agent-profile.js`
- `src/core/memory-store.js`
- `src/core/skill-registry.js`
- `src/core/voice-profile.js`
- `src/core/channel-registry.js`
- `src/core/model-registry.js`
- `src/core/fs-loader.js`
- `src/core/prompt-assembler.js`
- `src/runtime/work-loop.js`

## Current behavior

- load soul from `SOUL.md`
- load voice guidance from `voice/README.md`
- load memory index from `memory/`
- discover local skill folders from `skills/`
- summarize per-profile material counts plus foundation-readiness signals for memory / voice / soul / skills
- derive first-pass per-profile foundation drafts under `profiles/<person-id>/memory|voice|soul|skills/`
- expose generated draft paths, freshness status, and lightweight draft summaries back through `loadProfilesIndex()` for prompt/runtime consumption
- carry per-draft provenance forward (`latestMaterialId`, `materialTypes`, markdown draft headers) so generated memory / voice / soul / skills artifacts remain auditable after ingestion
- aggregate per-profile draft state into a repo-level `foundation` rollup so memory / voice / soul / skills progress is visible without manually scanning every profile
- detect stale drafts with both `latestMaterialAt` and `latestMaterialId` so same-timestamp imports do not get hidden by timestamp collisions
- treat target-person metadata changes (`displayName`, `summary`) as foundation-draft drift so stale-only refreshes also regenerate identity-bearing drafts after profile updates
- render compact per-profile foundation snapshots in `PromptAssembler` so the runtime can see stale drafts, missing pieces, key highlights, and a short target summary without parsing the full profile JSON blob
- fall back to text-first memory sample summaries when a profile has imported materials but no generated memory draft yet, so prompt snapshots and repo rollups still surface likely durable facts before refresh runs
- render a compact foundation-rollup block in `PromptAssembler` that summarizes generated vs stale foundation state plus top memory / voice / soul / skills highlights across the repo
- support targeted, stale-only, or bulk profile draft refreshes through `update foundation --person <id>`, `update foundation --stale`, and `update foundation --all`
- support manifest-driven batch ingestion plus optional immediate draft refresh through `import manifest --file <path> --refresh-foundation`
- support direct target-person metadata updates through `update profile --person <id> --display-name ... --summary ...`, with optional `--refresh-foundation` when those metadata edits should immediately regenerate identity-bearing drafts
- expose profile metadata (`displayName`, `summary`) alongside material/draft state so prompt assembly can render human-readable target names
- expose planned channel/provider registries from manifests and factories
- assemble a prompt preview from profile, soul, voice, memory, and skills

## Staged development sequence

### Phase 1 — foundation
- replace placeholder identity content
- make memory / skills / soul / voice roles explicit
- add basic validation and smoke checks

### Phase 2 — richer core structures
- formalize file conventions and schemas
- enrich prompt assembly with better summaries
- add examples and templates for a real user profile

### Phase 3 — channels
- add adapter skeletons and docs for Slack, Telegram, Feishu, and WhatsApp

### Phase 4 — model providers
- add provider skeletons and docs for OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen

### Phase 5 — runtime and packaging
- improve the work loop
- add better inspection commands and tests
- document end-to-end usage

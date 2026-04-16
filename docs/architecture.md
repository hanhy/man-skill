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

- `src/core/agent-profile.ts`
- `src/core/memory-store.ts`
- `src/core/skill-registry.ts`
- `src/core/voice-profile.ts`
- `src/core/channel-registry.ts`
- `src/core/model-registry.ts`
- `src/core/foundation-core.ts`
- `src/core/fs-loader.js`
- `src/core/prompt-assembler.ts`
- `src/runtime/work-loop.js`

## Current behavior

- load soul from `SOUL.md`
- load voice guidance from `voice/README.md`
- load memory index from `memory/`
- discover local skill folders from `skills/`
- distinguish documented skills (`skills/<name>/SKILL.md`) from placeholder skill directories when computing `foundation.core` readiness
- summarize target-person ingestion status through a top-level `ingestion` block with imported-vs-metadata-only counts, default CLI entry commands, an optional checked-in sample manifest command, and the first actionable per-profile `update profile` / `update foundation` commands
- summarize per-profile material counts plus foundation-readiness signals for memory / voice / soul / skills
- derive first-pass per-profile foundation drafts under `profiles/<person-id>/memory|voice|soul|skills/`
- expose generated draft paths, freshness status, and lightweight draft summaries back through `loadProfilesIndex()` for prompt/runtime consumption
- carry per-draft provenance forward (`latestMaterialId`, `materialTypes`, markdown draft headers) so generated memory / voice / soul / skills artifacts remain auditable after ingestion
- mirror memory-draft provenance (`generatedAt`, latest material id/timestamp, source counts, material types) back into `foundationDraftSummaries.memory` so prompt/runtime consumers can inspect freshness without reopening raw draft files
- aggregate per-profile draft state into a repo-level `foundation` rollup so memory / voice / soul / skills progress is visible without manually scanning every profile
- expose `foundation.core` diagnostics for the repo's own memory / skills / soul / voice assets so the prompt/runtime layer can quickly audit whether the base agent scaffolding is actually populated
- include compact source references in `foundation.core` (`memory/README.md`, sample bucket entries, `SOUL.md`, `voice/README.md`) so the prompt preview can point operators at the exact files backing the current foundation state
- require repo-core memory coverage to consider `memory/daily`, `memory/long-term`, and `memory/scratch` separately, so partial memory scaffolds stay thin until all three buckets contain at least one entry
- expose a repo-core `foundation.core.maintenance` queue with per-area (`memory`, `skills`, `soul`, `voice`) `missing` vs `thin` status, expected file paths, and the next concrete action so operators can fix scaffold drift without inferring it from aggregate counts alone
- detect stale drafts with both `latestMaterialAt` and `latestMaterialId` so same-timestamp imports do not get hidden by timestamp collisions
- treat target-person metadata changes (`displayName`, `summary`) as foundation-draft drift so stale-only refreshes also regenerate identity-bearing drafts after profile updates
- render compact per-profile foundation snapshots in `PromptAssembler` so the runtime can see stale drafts, missing pieces, key highlights, and a short target summary without parsing the full profile JSON blob
- fall back to text-first memory sample summaries when a profile has imported materials but no generated memory draft yet, so prompt snapshots and repo rollups still surface likely durable facts before refresh runs
- render a compact foundation-rollup block in `PromptAssembler` that summarizes generated vs stale foundation state plus top memory / voice / soul / skills highlights across the repo
- render a separate `Foundation maintenance:` block in `PromptAssembler` so queued stale/incomplete profiles are visible by name before the aggregate rollup
- attach refresh commands to `foundation.maintenance` (`update foundation --stale` plus per-profile `--person <id>`) so the maintenance view is actionable, not just descriptive
- support targeted, stale-only, or bulk profile draft refreshes through `update foundation --person <id>`, `update foundation --stale`, and `update foundation --all`
- support manifest-driven batch ingestion plus optional immediate draft refresh through `import manifest --file <path> --refresh-foundation`
- support direct target-person metadata updates through `update profile --person <id> --display-name ... --summary ...`, with optional `--refresh-foundation` when those metadata edits should immediately regenerate identity-bearing drafts
- keep the user-facing `Ingestion entrance:` prompt block visible even on empty repos by surfacing bootstrap commands, supported import types, and a sample one-shot import path before any target profile exists
- expose profile metadata (`displayName`, `summary`) alongside material/draft state so prompt assembly can render human-readable target names
- expose planned channel/provider registries from manifests
- expose a top-level `delivery` summary with pending channel/provider setup queues, manifest paths, auth-readiness counts, concrete env-var setup hints, and a checked-in `.env.example` bootstrap path so rollout work is visible alongside foundation diagnostics
- keep per-channel / per-provider scaffold references in that same delivery summary (`implementationPath`, scaffold-present counts) so the prompt preview can point operators at the exact files to fill in next for Slack, Telegram, WhatsApp, Feishu, OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen
- aggregate channel/provider status counts plus deduped auth env vars in the delivery summary so prompt previews can distinguish active vs planned vs candidate integrations without re-scanning raw manifests
- treat malformed `manifests/channels.json` or `manifests/providers.json` as delivery-foundation diagnostics instead of fatal errors, so summary generation falls back to built-in defaults while still surfacing the manifest issue inline
- expose repo-core foundation diagnostics plus a compact coverage overview (`readyAreaCount`, `missingAreas`, `thinAreas`) for memory / skills / soul / voice
- emit `foundation.core.overview.recommendedActions` so missing/thin repo scaffolding produces concrete next-step guidance instead of only a passive status summary
- assemble a prompt preview from profile, soul, voice, memory, and skills, including the core-foundation coverage line when the base scaffold is thin or incomplete

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

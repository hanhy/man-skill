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
   - `daily/` (the canonical short-term working-memory bucket), `long-term/`, and `scratch/` stores
   - legacy `memory/short-term/` files still fold into the canonical `daily` lane when the repo is loaded, so older scaffolds stay readable while new work converges on `daily/`
   - curated identity facts, preferences, habits, and dated logs

4. **Skills**
   - task-specific capabilities and reusable prompt modules
   - procedural knowledge that can be reused across sessions

5. **Channels**
   - delivery adapters for chat platforms
   - canonical rollout order: Feishu, Telegram, WhatsApp, Slack

6. **Models**
   - provider abstraction over multiple LLM backends
   - canonical rollout order: OpenAI, Anthropic, Kimi, Minimax, GLM, Qwen

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
- `src/core/manifest-loader.ts`
- `src/runtime/work-loop.ts`

## Current behavior

- load soul from `SOUL.md`
- load voice guidance from `voice/README.md`
- load memory index from `memory/`
- keep `memory/daily/` as the checked-in short-term bucket while still exposing `shortTermEntries` and `shortTermPresent` as compatibility aliases for older summary consumers
- fold legacy `memory/short-term/` files into that canonical `daily` lane during repo loading, so older repos keep their short-term coverage without needing an immediate directory migration
- if both `memory/daily/<name>` and `memory/short-term/<name>` exist, keep both files in the canonical `daily` count/list rather than collapsing them to one basename match, while `legacyShortTermSources` preserves which one came from the legacy short-term bucket
- keep the `MemoryStore` runtime alias honest too: `shortTerm` remains a writable compatibility alias of `daily` instead of a second mutable bucket
- expose `memorySummary.canonicalShortTermBucket` plus `memorySummary.legacyShortTermAliases` so downstream tooling can see the canonical daily bucket and its compatibility field names without hard-coding the mapping
- also expose `memorySummary.legacyShortTermSourceCount` plus `memorySummary.legacyShortTermSources`, and the compact preview metadata `memorySummary.legacyShortTermSampleSources` / `memorySummary.legacyShortTermSourceOverflowCount`, so callers can inspect which checked-in `memory/short-term/` files were folded into the canonical daily lane without having to recreate the first-three-plus-overflow prompt contract themselves
- discover local skill folders from `skills/`
- distinguish documented skills (`skills/<name>/SKILL.md`) from placeholder skill directories when computing `foundation.core` readiness
- summarize target-person ingestion status through a top-level `ingestion` block with imported-vs-metadata-only counts, default CLI entry commands, exact helper-command bundles for scaffold/import/refresh work, both plain and `--refresh-foundation` manifest import shortcuts, an optional checked-in sample manifest command, that sample manifest's typed material mix, a shorter `import sample` starter command that wraps that manifest when it validates, the exact starter-manifest source path surfaced via `sampleStarterSource`, a checked-in sample text command, the keyed sample helper labels (`sample-message`, `sample-talk`, `sample-screenshot`), explicit invalid-intake repair bundles (`repair-invalid-bundle`, `repair-imported-invalid-bundle`), and the first actionable per-profile `update profile` / `update foundation` commands plus batch metadata helpers (`update-bundle`, `sync-bundle`)
- summarize per-profile material counts plus foundation-readiness signals for memory / voice / soul / skills
- expose per-profile intake readiness with `intakeStatusSummary` so prompt previews can say whether a metadata-only profile is missing or partially missing `imports/` scaffold files before suggesting the next import command
- derive first-pass per-profile foundation drafts under `profiles/<person-id>/memory|voice|soul|skills/`
- expose generated draft paths, freshness status, and lightweight draft summaries back through `loadProfilesIndex()` for prompt/runtime consumption
- carry per-draft provenance forward (`latestMaterialId`, `materialTypes`, markdown draft headers) so generated memory / voice / soul / skills artifacts remain auditable after ingestion
- mirror memory-draft provenance (`generatedAt`, latest material id/timestamp, source counts, material types) back into `foundationDraftSummaries.memory` so prompt/runtime consumers can inspect freshness without reopening raw draft files
- aggregate per-profile draft state into a repo-level `foundation` rollup so memory / voice / soul / skills progress is visible without manually scanning every profile, including memory and skills candidate-profile coverage when drafts are still missing
- expose `foundation.core` diagnostics for the repo's own memory / skills / soul / voice assets so the prompt/runtime layer can quickly audit whether the base agent scaffolding is actually populated
- include compact source references in `foundation.core` (`memory/README.md`, `skills/README.md`, `SOUL.md`, `voice/README.md`, sample bucket entries) so the prompt preview can point operators at the exact files backing the current foundation state
- carry the `memory/README.md` excerpt into `foundation.core.memory.rootExcerpt` so repo-level memory guidance stays visible in JSON summaries and the prompt preview, not only in the underlying file
- also expose `foundation.core.memory.rootReadySections` / `foundation.core.memory.rootMissingSections` plus `foundation.core.memory.rootReadySectionCount` / `foundation.core.memory.rootTotalSectionCount`, so the memory line can show `root sections X/2 ready (...)` alongside the bucket-level `buckets X/3 ready (...)` coverage state whether the root is partial or fully ready; when sibling-root headings like `What lives here` / `Layout` still back those sections, optional `foundation.core.memory.headingAliases` keeps that alias mapping visible too
- the memory-root alias labels are intentionally stable (`what-lives-here->what-belongs-here`, `layout->buckets`) so prompt/rendering code can tell exactly which skills-root headings were accepted as compatibility fallbacks
- mirror the daily bucket alias contract there too via `foundation.core.memory.canonicalShortTermBucket` and `foundation.core.memory.legacyShortTermAliases`, so repo-core consumers do not have to jump back to the top-level memory summary just to learn that `daily/` is canonical and `shortTerm*` remains compatibility-only
- keep legacy-source provenance visible there too through `foundation.core.memory.legacyShortTermSourceCount` and `foundation.core.memory.legacyShortTermSources`, plus `legacyShortTermSampleSources` / `legacyShortTermSourceOverflowCount`, so repo-core tooling can tell which `memory/short-term/` files were folded into `daily/` and can reuse the compact preview metadata without reopening the filesystem
- mirror that same durable memory framing into the top-level `Memory store:` preview via `foundation.core.memory.rootExcerpt` / `rootPath`, so operators can see the `memory/README.md` rationale before they reach the deeper `Core foundation:` diagnostics; when several legacy short-term sources are present, compact the preview to the first three `memory/short-term/...` paths plus `+N more` so provenance stays inspectable without flooding the prompt surface
- do the same for `skills/README.md` via `foundation.core.skills.rootExcerpt` / `rootPath`, and carry the parallel `foundation.core.skills.rootReadySections` / `foundation.core.skills.rootMissingSections` plus `foundation.core.skills.rootReadySectionCount` / `foundation.core.skills.rootTotalSectionCount`, so the procedural layer keeps its repo-level framing visible alongside individual `SKILL.md` excerpts; when sibling-root headings like `What belongs here` / `Buckets` still back the canonical skills sections, optional `foundation.core.skills.headingAliases` makes that fallback explicit instead of leaving callers to infer it from parsed section names alone
- the skills-root compatibility labels are likewise stable (`what-belongs-here->what-lives-here`, `buckets->layout`) so repo tooling can tell when a memory-style shared guide is still satisfying the canonical skills contract
- when grouped repo skills are present, also surface `summary.skills.categoryCounts`, `foundation.core.skills.categoryCounts`, and `foundation.core.skills.documentedCategoryCounts`, so delivery-heavy repos can tell how many checked-in skills live under `channels/*`, `providers/*`, and the root without reparsing every skill id from prompt text
- mirror that source-reference pattern for `foundation.core.soul` and `foundation.core.voice` via `rootPath` / `rootExcerpt` aliases, so all four identity layers expose a consistent machine-readable file/excerpt contract without dropping the existing `path` / `excerpt` fields
- mirror those same `foundation.core.soul|voice` root excerpts, section counts, and optional heading aliases into the compact top-level `Soul profile:` / `Voice profile:` prompt blocks, so legacy root headings stay visible even before the deeper core-foundation summary
- for structured soul/voice docs, also expose `foundation.core.soul.readySections`, `foundation.core.soul.missingSections`, `foundation.core.soul.readySectionCount`, `foundation.core.soul.totalSectionCount`, plus the parallel `foundation.core.voice.readySections`, `foundation.core.voice.missingSections`, `foundation.core.voice.readySectionCount`, and `foundation.core.voice.totalSectionCount`, so prompt previews and maintenance summaries can show grounded section labels for both partial and fully ready structured docs; when legacy root headings still do the work, optional `foundation.core.soul.headingAliases` / `foundation.core.voice.headingAliases` make that alias mapping explicit too
- soul alias labels stay stable as `core-values->core-truths` and `decision-rules->continuity`, while voice alias labels stay stable as `voice-should-capture->signature-moves`, `voice-should-not-capture->avoid`, and `current-default->language-hints`, so downstream consumers can preserve the exact compatibility mapping instead of reverse-engineering it from prose
- keep the checked-in root `SOUL.md` stable on `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`, and keep the checked-in root `voice/README.md` stable on `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`, so the parser-supported repo foundation headings stay aligned with the live summary contract
- treat partially structured `skills/README.md` docs like other thin repo-core guides: when root sections such as `What lives here` / `Layout` are present but incomplete, keep `skills` thin, surface the missing root sections in `foundation.core.skills.rootMissingSections`, and emit a runnable repair command instead of pretending the shared skills guide is finished

- require repo-core memory coverage to consider `memory/daily`, `memory/long-term`, and `memory/scratch` separately, so partial memory scaffolds stay thin until all three buckets contain at least one entry
- expose a repo-core `foundation.core.maintenance` queue with per-area (`memory`, `skills`, `soul`, `voice`) `missing` vs `thin` status, expected file paths, the next concrete action, stored runnable commands, thin-doc section progress (`rootThinReadySections`, `rootThinMissingSections`, `rootThinReadySectionCount`, `rootThinTotalSectionCount`), a canonical repair entrance (`recommendedArea`, `recommendedAction`, `recommendedCommand`, `recommendedPaths`) plus single-target-only detail fields (`recommendedStatus`, `recommendedSummary` when exactly one area is queued), and helper bundles (`scaffoldAll`, `scaffoldMissing`, `scaffoldThin`, `memory`, `skills`, `soul`, `voice`) so operators can fix scaffold drift without inferring it from aggregate counts alone
- for repo-core memory bucket repairs, keep `recommendedPaths` / `queuedAreas[*].paths` pointed at the actual seed files (`memory/daily/$(date +%F).md`, `memory/long-term/notes.md`, `memory/scratch/draft.md`) so work-loop and prompt-preview `paths` stay aligned with the scaffold command's real write targets
- detect stale drafts with both `latestMaterialAt` and `latestMaterialId` so same-timestamp imports do not get hidden by timestamp collisions
- treat target-person metadata changes (`displayName`, `summary`) as foundation-draft drift so stale-only refreshes also regenerate identity-bearing drafts after profile updates
- render compact per-profile foundation snapshots in `PromptAssembler` so the runtime can see stale drafts, missing pieces, key highlights, a short target summary, and exact markdown section gaps for thin voice / soul / skills drafts without parsing the full profile JSON blob
- fall back to text-first memory sample summaries when a profile has imported materials but no generated memory draft yet, so prompt snapshots and repo rollups still surface likely durable facts before refresh runs
- render a compact foundation-rollup block in `PromptAssembler` that summarizes generated vs stale foundation state plus memory and skills candidate-profile coverage and top memory / voice / soul / skills highlights across the repo
- render a separate `Foundation maintenance:` block in `PromptAssembler` so queued stale/incomplete profiles are visible by name before the aggregate rollup
- attach refresh commands to `foundation.maintenance` (`update foundation --stale` plus per-profile `--person <id>`) so the maintenance view is actionable, not just descriptive
- expose a canonical next-refresh target on `foundation.maintenance` (`recommendedProfileId`, `recommendedLabel`, `recommendedAction`, `recommendedCommand`, `recommendedPaths`, `recommendedDraftGapSummary`) so prompt assembly and the work loop can reuse one stable per-profile refresh recommendation instead of recomputing it from the queue order
- carry aggregate and per-profile draft gap counts (`draftGapCountTotal`, `draftGapCounts`, `queuedProfiles[*].draftGapCount`, `queuedProfiles[*].draftGapCounts`) so stale profile ordering can favor the thinnest memory/skills/soul/voice bundle instead of only counting missing files
- support targeted, stale-only, or bulk profile draft refreshes through `update foundation --person <id>`, `update foundation --stale`, and `update foundation --all`
- support manifest-driven batch ingestion plus optional immediate draft refresh through `import manifest --file <path> --refresh-foundation`
- support direct target-person metadata updates through `update profile --person <id> --display-name ... --summary ...`, with optional `--refresh-foundation` when those metadata edits should immediately regenerate identity-bearing drafts
- keep the user-facing `Ingestion entrance:` prompt block visible even on empty repos by surfacing bootstrap commands, supported import types, and a sample one-shot import path before any target profile exists
- expose profile metadata (`displayName`, `summary`) alongside material/draft state so prompt assembly can render human-readable target names
- expose planned channel/provider registries from manifests
- expose a top-level `delivery` summary with pending channel/provider setup queues, manifest paths, auth-readiness counts, concrete env-var setup hints, a checked-in `.env.example` bootstrap path, helper scaffold commands for manifests plus implementation files, and separate runtime-readiness counts (`readyChannelImplementationCount`, `readyProviderImplementationCount`) so placeholder scaffold files do not masquerade as finished adapters/providers
- keep per-channel / per-provider scaffold references in that same delivery summary (`implementationPath`, scaffold-present counts) so the prompt preview can point operators at the exact files to fill in next for Slack, Telegram, WhatsApp, Feishu, OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen
- aggregate channel/provider status counts plus deduped auth env vars in the delivery summary so prompt previews can distinguish active vs planned vs candidate integrations without re-scanning raw manifests
- expose both single-file and bundled delivery helper commands (`scaffoldChannelImplementationBundle`, `scaffoldProviderImplementationBundle`) so multi-file rollout work stays machine-readable in JSON and copy-pasteable in the prompt preview as `channel impl-all ...` / `provider impl-all ...`
- make delivery work-loop routing leader-aware: only surface `cp .env.example .env` when the current queued channel/provider is truly blocked on missing env vars and no repo-local `.env` exists yet; once `.env` is already present, switch the blocked rollout step to the narrower `touch '.env' && ...` populate helper so `paths` narrows to `.env`, otherwise promote manifest/implementation scaffolds and keep `paths` aligned with the actual command blast radius; during bootstrap that means `paths` stays source-focused on `.env.example` so the active step names the shared template rather than both source and destination
- treat delivery priorities as `blocked` as soon as the rollout leader is auth-blocked and otherwise runtime-ready, even if later channels/providers still have missing implementation files; this keeps `currentPriority.status`, blocked counters, and prompt-preview wording aligned with the leader-first bootstrap command instead of downgrading the lane back to generic queued work
- treat malformed `manifests/channels.json` or `manifests/providers.json` as delivery-foundation diagnostics instead of fatal errors, so summary generation falls back to built-in defaults while still surfacing the manifest issue inline
- expose repo-core foundation diagnostics plus a compact coverage overview (`readyAreaCount`, `missingAreas`, `thinAreas`) for memory / skills / soul / voice
- keep the shared markdown excerpt parser (`document-excerpt.ts`) aligned with OpenClaw-style foundation docs by preferring frontmatter descriptions, normalizing visible blockquoted/setext headings, and ignoring headings that only appear inside comments, fenced examples, or indented code samples
- emit `foundation.core.overview.recommendedActions` so missing/thin repo scaffolding produces concrete next-step guidance instead of only a passive status summary
- expose a top-level `workLoop` priority queue that keeps foundation, ingestion, channels, and providers in the intended order while surfacing both `leadingPriority` (the first item in order, even when it is already ready) and the queued-or-blocked `currentPriority`, plus `runnablePriority` for the first still-runnable step in priority order even when that work remains a ready follow-up (for example an imported intake starter manifest edit) and `actionableReadyPriority` as the narrower ready-only advisory alias; keep the split readiness counters (`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`) and a `USER.md` current product direction loader that ignores fenced or commented scaffold headings so only visible objectives drive the work loop while still accepting blockquoted visible headings/list items, plus the summary / next action / command / file paths for the first queued-or-blocked area; this includes checked-in `samples/...` assets when ingestion is active, the exact checked-in sample manifest command via `sampleManifestCommand`, the shorter starter alias via `sampleStarterCommand`, bundled per-profile intake/foundation refresh commands when multiple metadata-only or stale profiles are queued, bundled core-foundation scaffold commands when multiple memory/skills/soul/voice areas are queued, and the relevant manifest plus scaffold paths or bundled implementation scaffolds when channel/provider rollout is next
- render the same `workLoop` state back into the prompt preview/system prompt as a compact `Work loop:` block so cron-style runs can see the current priority without re-parsing raw JSON
- assemble a prompt preview from profile, soul, voice, memory, and skills, including the core-foundation coverage line when the base scaffold is thin or incomplete, the compact `ready details` core-foundation line when repo memory/skills/soul/voice are all ready, the stable repo-level ingestion helper palette, and the operator-facing delivery helper commands
- when that compact `ready details` line is active, keep the repo root source references inline there too (`@ memory/README.md`, `@ skills/README.md`, `@ SOUL.md`, `@ voice/README.md`) so the fully ready path still points operators at the exact backing files instead of only surfacing section counts

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
- keep Feishu, Telegram, WhatsApp, and Slack adapter manifests/implementations visible in the delivery summary
- tighten auth-readiness hints, manifest diagnostics, and scaffold helper commands for chat rollout work

### Phase 4 — model providers
- keep OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen provider manifests/implementations visible in the delivery summary
- tighten provider auth-readiness hints plus manifest/implementation scaffold commands for rollout work

### Phase 5 — runtime and packaging
- improve the work loop
- add better inspection commands and tests
- document end-to-end usage with the richer ingestion + delivery helper surfaces

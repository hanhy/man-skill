# man-skill

> A lightweight framework for building a person-like AI agent from **memory + skills + soul + voice**.

`man-skill` is aimed at a practical goal: let a user define a target person, add a small set of representative materials, and progressively shape an AI that speaks in a more faithful, stable, and useful way.

---

## At a glance

### What it tries to do
- imitate one specific person's tone and phrasing
- preserve recurring preferences, habits, and quirks
- make persona building practical for normal users
- grow from raw materials into a reusable agent profile

### What it is **not** trying to do
- perfect identity cloning
- heavy training pipelines
- mandatory fine-tuning before it becomes useful

### Current development focus
1. strengthen the foundation around **memory / skills / soul / voice**
2. improve the **material ingestion entrance**
3. expand channels in the rollout order **Feishu → Telegram → WhatsApp → Slack** and providers in the rollout order **OpenAI → Anthropic → Kimi → Minimax → GLM → Qwen**

### Development rule
- use **TypeScript-first** for new and migrated runtime code
- keep thin `.js` compatibility shims only when the CLI/package entrypoint still needs them

---

## Quick example

```bash
node src/index.js import text --person harry-han --file ./samples/harry-post.txt
node src/index.js import message --person harry-han --text "I’ll be there in 10 minutes."
node src/index.js import screenshot --person harry-han --file ./screenshots/chat.png --refresh-foundation
node src/index.js --help
node src/index.js import sample
node src/index.js import manifest --file ./samples/harry-materials.json --refresh-foundation
node src/index.js update intake --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --summary "Direct operator with a bias for fast feedback loops." --refresh-foundation
node src/index.js update foundation --person harry-han
node src/index.js update foundation --stale
node src/index.js update foundation --all
node src/index.js update intake --imported
node src/index.js import intake --imported
node src/index.js import intake --imported --refresh-foundation
node src/index.js
```

This creates a profile-specific material structure under `profiles/<person-id>/` and exposes a repo summary that can later feed the learning/update layer.

The current operator-facing entrance is:
- seed or edit target metadata with `update profile`
- scaffold a profile-local intake landing zone with `update intake`
- backfill missing intake landing zones for already-imported profiles with `update intake --imported`
- re-run that imported backfill plus draft regeneration with `update intake --imported --refresh-foundation` when the touched profiles already have materials on disk
- import checked-in starter material with `import sample`
- import profile-local intake manifests with `import intake --person <id>`
- bulk-import only first-run metadata-only intake manifests with `import intake --stale` without refreshing derived drafts by default
- re-run the same first-run batch with `import intake --stale --refresh-foundation` when you want the import pass to regenerate derived memory / voice / soul / skills drafts too
- bulk-import only already-imported profile-local intake manifests with `import intake --imported`
- re-run imported intake replay with `import intake --imported --refresh-foundation` when you want the same pass to regenerate derived memory / voice / soul / skills drafts
- re-run the broader `import intake --all` replay with `import intake --all --refresh-foundation` when you intentionally want every ready profile-local intake manifest — first-run and already-imported alike — to regenerate drafts in one pass
- regenerate derived memory / voice / soul / skills drafts with `--refresh-foundation`, `update foundation --person <id>`, or `update foundation --stale`

`update intake` writes `profiles/<person-id>/imports/README.md`, creates `profiles/<person-id>/imports/images/` for screenshot assets, and seeds `sample.txt` plus `materials.template.json` so a fresh target profile immediately has an obvious place for user-supplied materials before anything is imported. That scaffold includes per-type `entryTemplates`, including a screenshot template path of `images/chat.png`, direct `import text|message|talk|screenshot` command hints, higher-level rerun shortcuts for `update intake`, `import intake`, and metadata sync, plus both manifest replay variants (`import manifest --file ...` to inspect first and `--refresh-foundation` when the same pass should regenerate drafts). The intake guidance keeps the manifest/file relationship obvious: `materials.template.json` file paths resolve relative to `profiles/<person-id>/imports/`, so local screenshots or attachments can live beside `sample.txt` (or under a small subdirectory like `imports/images/`) without forcing operators to reason about repo-root-relative paths. The generated intake README now also spells out the safety boundary: referenced files must stay inside the repo, and outside paths or escaping symlinks are rejected during import. One-off imports and manifest/sample imports now keep that same profile-local intake scaffold present automatically, so the entrance stays discoverable even after the first materials have already landed.

Re-running `update intake` preserves starter `entries[]`, customized `entryTemplates`, and the README's managed `Custom notes` block while still syncing generated commands plus top-level display name and summary metadata. If `materials.template.json` was edited into invalid JSON, the repair pass now snapshots the broken file to `materials.template.json.invalid-<timestamp>.bak` and returns `invalidStarterManifestBackupPath` in the CLI result before rebuilding the starter manifest, so operators can recover the last draft instead of losing it during intake repair. The repo also ships a starter manifest at `samples/harry-materials.json` plus checked-in sample assets, so there is a one-command bootstrap path via `node src/index.js import sample`, a plain inspect-first path via `sampleManifestInspectCommand`, and an exact refresh path via `sampleManifestCommand` alongside the explicit sample helper commands in the summary/prompt preview. Once an already-imported profile's drafts are fresh and it still has only the untouched `profiles/<person-id>/imports/materials.template.json` starter manifest, the ingestion entrance keeps the top-level `next intake` step descriptive while also surfacing `recommendedRefreshIntakeCommand`, `recommendedUpdateProfileCommand`, `recommendedUpdateProfileAndRefreshCommand`, `recommendedEditPath`, `recommendedEditPaths`, `recommendedManifestInspectCommand`, `recommendedManifestImportCommand`, `recommendedIntakeManifestEntryTemplateTypes`, `recommendedIntakeManifestEntryTemplateDetails`, `recommendedIntakeManifestEntryTemplateCount`, `recommendedIntakeManifestEntryTemplateRoot`, `recommendedProfileSlices`, `recommendedInspectCommand`, `recommendedFollowUpCommand`, and `recommendedFallbackCommand`, so operators can still see the newest imported artifact, rerun the intake scaffold, edit the right manifest or seeded starter files, inspect the manifest before refresh, keep the shared `profiles/<id>/imports` starter root visible for those template-relative file paths, replay intake with or without draft regeneration, and fall back to the seeded direct starter import without reopening per-profile JSON. When multiple imported starter manifests are queued together, `recommendedProfileSlices` keeps the per-profile mapping (`label -> edit path`) machine-readable, and the prompt/work-loop preview mirrors that bundle as `starter profiles: ...`, `recommended starter profiles: ...`, or `advisory starter profiles: ...` instead of forcing operators to infer which manifest belongs to which queued target. The per-profile prompt-preview line now also keeps the local scaffold refresh visible as `refresh-intake node src/index.js update intake --person ...`, the plain metadata edit as `update node src/index.js update profile --person ...`, a concrete `starter root profiles/<id>/imports` line sourced from `recommendedIntakeManifestEntryTemplateRoot` or the matching per-profile slice, a concrete `starter details ...` summary sourced from `intakeManifestEntryTemplateDetails`, an `inspect-after-edit node src/index.js import intake --person ...` replay for a plain post-edit inspection pass, and a matching `replay-after-edit node src/index.js import intake --person ... --refresh-foundation` follow-up. Batch `update intake --stale` and `update intake --all` remain scaffold-only metadata prep, so even when `--refresh-foundation` is present they do not import materials or regenerate drafts on their own.

`node src/index.js --help` now prints a concise operator-facing usage guide instead of dumping the full summary JSON, and invalid CLI invocations fail with a short usage hint rather than a raw stack trace. The summary keeps advertising the richer ingestion helper bundles, including invalid-intake repair helpers, imported starter-manifest replay bundles (`inspect-starter-bundle`, `replay-starter-bundle`, `starter-import-bundle`), batch metadata sync helpers, the sample manifest's typed entry mix, and keyed non-text sample helpers (`sample-message`, `sample-talk`, `sample-screenshot`), so operators can see which starter profiles, repair paths, and assets are covered before importing them.

## Delivery foundation

The repo now also carries a delivery layer for chat surfaces and model backends. The canonical rollout order is Feishu, Telegram, WhatsApp, and Slack for channels, then OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen for providers. The default channel/provider catalogs and work-loop queue follow that same order, while the checked-in modules expose concrete runtime helpers so the summary can distinguish three different states: missing files, scaffold-only files, and runtime-ready integrations that are still waiting on auth/configuration before they can serve traffic.

Per-repo rollout can override or extend those defaults through `manifests/channels.json` and `manifests/providers.json`. The summary/prompt preview keeps those manifest diagnostics, runtime-readiness counts, `.env.example` bootstrap hints, auth-readiness gaps, and next scaffold commands visible so the delivery backlog stays operator-facing instead of hidden in raw files. The prompt preview also mirrors the delivery readiness lines `runtime implementations: ...`, `auth readiness: ...`, `channel env backlog: ...`, and `provider env backlog: ...`, so operators can see which rollout lane is blocked before opening the raw `delivery.channelQueue` / `delivery.providerQueue` JSON. The helper palette keeps `env`, `delivery env`, `channel env`, and `provider env` labels copy-pasteable for the shared bootstrap and narrowed repo-local populate helpers. It also keeps the bootstrap blast radius honest: when `cp .env.example .env` is the active next step, `paths` includes both `.env.example` and `.env`, while later repo-local populate helpers narrow the same surface to `.env` once the copy step is no longer the active command.

The top-level `workLoop` summary exposes the queue from a few complementary angles instead of forcing callers to infer intent from one field: `leadingPriority` keeps the first lane in the configured order even when it is already ready, `currentPriority` keeps the queued-or-blocked lane that is actively holding progress, `runnablePriority` keeps the first priority-order lane with a primary `command`, `actionableReadyPriority` keeps the narrower ready-only advisory alias for edit-first follow-ups such as imported starter-manifest edits, and `recommendedPriority` stays a stable best-next-action alias by scanning priority order for the earliest queued/blocked lane or ready advisory instead of defaulting to a later blocked runnable command. The same object also exposes split readiness counts through `readyPriorityCount`, `queuedPriorityCount`, and `blockedPriorityCount`, and each priority can carry additive follow-up surfaces like `latestMaterialAt`, `latestMaterialId`, `latestMaterialSourcePath`, `refreshReasons`, `missingDrafts`, `candidateSignalSummary`, `draftSourcesSummary`, `draftGapSummary`, `fallbackCommand`, `refreshIntakeCommand`, `updateProfileCommand`, `updateProfileAndRefreshCommand`, `editPath`, `editPaths`, `manifestInspectCommand`, `manifestImportCommand`, `intakeManifestEntryTemplateTypes`, `intakeManifestEntryTemplateDetails`, `intakeManifestEntryTemplateCount`, `intakeManifestEntryTemplateRoot`, `inspectCommand`, and `followUpCommand` when the next slice includes an edit-first contract instead of one immediate shell command. The prompt preview mirrors that distinction with separate `lead:`, `recommended:`, `current:`, `runnable:`, and `advisory:` lines when they differ, and when the recommended lane is not the current blocker it also surfaces explicit `recommended fallback:`, `recommended refresh intake:`, `recommended update profile:`, `recommended sync profile:`, `recommended edit:`, `recommended edit paths:`, `recommended manifest inspect:`, `recommended manifest:`, `recommended inspect after editing:`, `recommended then run:`, and `recommended paths:` lines so the best next slice stays actionable without re-parsing JSON.

## Foundation contract

The repo-level foundation is intentionally OpenClaw-like: `memory/`, `skills/`, `SOUL.md`, and `voice/README.md` are treated as durable operator-facing surfaces, not just passive notes.

The current structured contract is:
- `memory/README.md` explains `## What belongs here` and `## Buckets`, with `daily/` as the canonical short-term working-memory bucket
- `src/core/fs-loader.js` folds legacy `memory/short-term/` files into that same canonical `daily` lane at load time, so older repos do not lose short-term memory coverage while the checked-in path stays `daily/`
- when both `memory/daily/<name>` and `memory/short-term/<name>` exist, repo loading preserves both files in the canonical `daily` count/list instead of collapsing them to one basename match, while `legacyShortTermSources` keeps the legacy-source provenance visible
- `skills/README.md` explains `## What lives here` and `## Layout`
- the default checked-in skill catalog stays explicit: 4 channel guides (`channels/feishu`, `channels/slack`, `channels/telegram`, `channels/whatsapp`), 6 provider guides (`providers/anthropic`, `providers/glm`, `providers/kimi`, `providers/minimax`, `providers/openai`, `providers/qwen`), plus `cron` and `foundation-maintenance`
- when grouped repo skills are present, `summary.skills.categoryCounts` and `foundation.core.skills.categoryCounts` make that catalog machine-readable by category (`channels`, `providers`, `root`) instead of forcing prompt-only parsing
- `summary.skills.foundationStatusCounts` keeps the checked-in skills layer machine-readable by foundation readiness (`ready`, `thin`, `missing`) so callers can inspect documentation coverage without reparsing every `skills[*].foundationStatus`
- `SOUL.md` captures `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`
- `voice/README.md` captures `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`

The summary surfaces keep that contract machine-readable:
- `foundation.core.memory.rootReadySections`, `rootMissingSections`, `rootReadySectionCount`, and `rootTotalSectionCount` show whether the repo memory guide is structurally ready, while optional `headingAliases` makes sibling-root fallbacks like `What lives here` / `Layout` visible when they still back the canonical memory sections
- for memory roots, those alias labels stay literal and machine-readable (`what-lives-here->what-belongs-here`, `layout->buckets`) so prompt previews and downstream tooling can tell which skills-root headings were accepted as compatibility fallbacks
- `foundation.core.memory.canonicalShortTermBucket` and `foundation.core.memory.legacyShortTermAliases` mirror the same daily-vs-legacy mapping inside the repo-core foundation contract
- `foundation.core.memory.legacyShortTermSourceCount` and `foundation.core.memory.legacyShortTermSources` preserve which checked-in `memory/short-term/` files were folded into the canonical `daily` lane, while `legacyShortTermSampleSources` and `legacyShortTermSourceOverflowCount` mirror the compact first-three-plus-overflow preview contract for callers that want provenance without reimplementing prompt compaction
- `foundation.core.skills.rootReadySections`, `rootMissingSections`, `rootReadySectionCount`, and `rootTotalSectionCount` do the same for the shared skills guide, while optional `headingAliases` makes sibling-root fallbacks like `What belongs here` / `Buckets` visible when they still back the canonical skills sections
- for skills roots, the surfaced compatibility labels are likewise stable (`what-belongs-here->what-lives-here`, `buckets->layout`) so grouped-skill repos can inspect whether a memory-style README is still satisfying the shared skills contract
- when grouped repo skills are present, `summary.skills.categoryCounts`, `summary.skills.foundationStatusCounts`, `foundation.core.skills.categoryCounts`, and `foundation.core.skills.documentedCategoryCounts` expose how many checked-in skills live under each category and how many sit in each readiness bucket, so delivery-heavy repos can distinguish `channels/*` and `providers/*` coverage without scraping the prompt preview; the top-level `Skill registry:` block now mirrors those readiness counts as `- foundation statuses: ...` plus the grouped-category lines `- categories: ...` and `- documented categories: ...` so undocumented gaps stay visible in the compact operator-facing preview too
- that same top-level `Skill registry:` block also mirrors root heading aliases when a memory-style shared skills guide still satisfies the canonical sections, keeping `what-belongs-here->what-lives-here` and `buckets->layout` visible in the compact preview instead of only the deeper `Core foundation:` block
- `foundation.core.soul.readySections`, `missingSections`, `readySectionCount`, and `totalSectionCount` expose the stable soul heading contract, while optional `headingAliases` makes legacy root headings like `Core values` / `Decision rules` visible when they still map onto the canonical OpenClaw sections
- soul alias labels are also stable (`core-values->core-truths`, `decision-rules->continuity`), so older OpenClaw-style drafts can stay inspectable without hiding which canonical sections they satisfied
- `foundation.core.voice.readySections`, `missingSections`, `readySectionCount`, and `totalSectionCount` expose the stable voice heading contract, while optional `headingAliases` makes fallback headings like `Voice should capture` / `Current default for ...` visible when they still back the canonical voice sections
- voice alias labels stay explicit too (`voice-should-capture->signature-moves`, `voice-should-not-capture->avoid`, `current-default->language-hints`) so preview consumers can distinguish legacy wording from the canonical checked-in headings
- the top-level `Soul profile:` and `Voice profile:` preview blocks now also mirror `foundation.core.soul|voice.rootExcerpt` / `rootPath`, section readiness, and optional heading aliases, so legacy root headings stay operator-visible before the deeper `Core foundation:` diagnostics
- the top-level memory summary still mirrors that bucket through `shortTermEntries` and `shortTermPresent` for legacy consumers even though `daily/` is the checked-in path
- the `MemoryStore` runtime keeps `shortTerm` as a compatibility alias of `daily`, so either property can be reassigned without drifting into two separate short-term buckets
- `memorySummary.canonicalShortTermBucket` and `memorySummary.legacyShortTermAliases` make that daily-vs-legacy mapping explicit for downstream tooling instead of forcing callers to infer it from field names alone
- `memorySummary.legacyShortTermSourceCount` and `memorySummary.legacyShortTermSources` mirror that provenance at the top level, and `legacyShortTermSampleSources` / `legacyShortTermSourceOverflowCount` expose the same compact preview metadata so ingestion/work-loop consumers can reuse the operator-facing first-three-plus-overflow contract without reopening the repo tree
- the top-level `Memory store:` preview now also mirrors the repo-core memory guide through `foundation.core.memory.rootExcerpt` / `rootPath`, so operators can see the durable `memory/README.md` framing inline before the deeper `Core foundation:` block; when sibling-root headings still satisfy the canonical memory sections, that same compact `Memory store:` preview also mirrors the root heading aliases (`what-lives-here->what-belongs-here`, `layout->buckets`) instead of hiding them in repo-core-only diagnostics; when multiple legacy sources were folded in, the alias line stays compact by showing the first three `memory/short-term/...` paths plus a `+N more` remainder marker instead of dumping every file path inline
- that same compact legacy-source alias preview is reused inside the all-green `Core foundation:` `ready details` line, so fully ready cron/operator runs still keep folded `memory/short-term/...` provenance visible without expanding back into the verbose per-area memory block

`buildSummary(...)` and the work loop use those sections directly. When a root doc is missing or thin, the prompt preview surfaces the exact missing sections plus a runnable repair command; when all four repo-core layers are ready, that same block collapses to one compact `ready details` line so cron/operator runs keep the foundation visible without wasting preview budget before moving on to ingestion, channels, or providers. The same summary surface now also mirrors those compact per-profile draft snapshots into top-level `profileSnapshots[]` records (`id`, `label`, `snapshot`, `lines`, `materialCount`, `materialTypes`, `latestMaterialAt`, `latestMaterialId`, `latestMaterialSourcePath`, `profileSummary`, `draftGapCount`, `draftGapCounts`, `draftGapSummary`, `refreshCommand`, `refreshPaths`, `draftStatus`, `readiness`, `draftFiles`, `draftSources`, `draftSections`, `draftGaps`, and `highlights`) so downstream tooling can inspect the current target-person foundation state without re-parsing `promptPreview`. `latestMaterialSourcePath` keeps the newest imported file or stored screenshot asset attached to that same snapshot contract, and the human `latest material:` line appends `@ <path>` when the freshest record came from a concrete file. `draftSources` now keeps each layer's generated-or-stale draft `path` beside the usual provenance metadata (`generated`, `generatedAt`, `latestMaterialAt`, `latestMaterialId`, optional `latestMaterialSourcePath`, `sourceCount`, `materialTypes`, plus memory `entryCount`), and the human `draft sources:` line can append `latest @ <source-path>` provenance when counts stay available while still falling back to compact `memory @ profiles/...`-style path summaries when a stale draft only exposes its artifact path. If those markdown provenance headers disappear or drift, `update foundation --stale` repairs the draft instead of treating the malformed artifact as fresh. `draftSections` keeps the structured section readiness for voice / soul / skills (`generated`, `readySectionCount`, `totalSectionCount`, `readySections`, `missingSections`, and optional `headingAliases`) so callers do not have to reverse-engineer thin-vs-ready markdown state from the human `draft gaps` string, and the human `draft sections:` line now mirrors partially ready voice / soul / skills drafts with their `missingSections` and accepted `headingAliases` instead of only listing fully ready layers. The additive `draftGapCount`, `draftGapCounts`, and `draftGapSummary` fields keep those same layer gaps machine-readable without forcing downstream tooling to re-count `draftGaps[]` segments or scrape the human snapshot text. The shared `buildFoundationDraftPaths(...)` / `collectFoundationDraftPaths(...)` helper keeps `profileSnapshots[*].refreshPaths`, `foundation.maintenance.queuedProfiles[*].paths`, and work-loop refresh `paths` aligned in one canonical memory → skills → soul → voice order, reusing generated draft files first, then missing-draft fallbacks, before widening to the full four-path scaffold only when no layer-specific evidence exists.

Thin repo-core repair queue items keep the same progress machine-readable via `foundation.core.maintenance.queuedAreas[*].rootThinReadySections`, `rootThinMissingSections`, `rootThinReadySectionCount`, and `rootThinTotalSectionCount`, so prompt previews can still say `root sections 1/2 ready` even when only counts survive. That keeps both fully ready and partially structured foundation docs inspectable without reopening the markdown files.

The summary now also exposes canonical repair/refresh entrances instead of forcing downstream tooling to guess from queue order:
- `foundation.core.maintenance.recommendedArea`, `recommendedAction`, `recommendedCommand`, and `recommendedPaths` point at the next repo-core memory/skills/soul/voice repair; when the queue narrows to a single area, `recommendedArea`, `recommendedStatus`, and `recommendedSummary` carry that same target's detailed context, while multi-area queues leave `recommendedArea` null and promote the same aggregate `scaffoldAll|scaffoldMissing|scaffoldThin` bundle plus the union of queued paths into the canonical `recommended*` entrance instead of leaving that richer guidance hidden only under `helperCommands`
- memory-bucket repairs now surface concrete seed-file targets in `recommendedPaths` / `queuedAreas[*].paths` (`memory/daily/$(date +%F).md`, `memory/long-term/notes.md`, `memory/scratch/draft.md`) so work-loop `paths` match the files the scaffold command actually touches instead of only the parent directories
- `foundation.maintenance.recommendedProfileId`, `recommendedAction`, `recommendedCommand`, and `recommendedPaths` point at the next target-profile draft refresh, while `recommendedLatestMaterialAt` / `recommendedLatestMaterialId` / `recommendedLatestMaterialSourcePath`, `recommendedCandidateSignalSummary`, and `recommendedDraftSourcesSummary` keep the freshest source material plus the canonical refresh evidence/source rollup attached to that recommendation, and `queuedProfiles[*].paths` plus `queuedProfiles[*].latestMaterialSourcePath` / `queuedProfiles[*].draftSourcesSummary` mirror the same per-profile context for deeper inspection
- the shared `normalizeDraftPath(...)` helper keeps those draft/source path surfaces slash-normalized (`./foo\\bar` → `foo/bar`) before they reach `draftFiles`, `draftSources`, `profileSnapshots[*].refreshPaths`, or work-loop `latest material` lines, so direct callers that bypass filesystem loaders still get stable OpenClaw-like provenance
- the prompt preview mirrors those as `next repair` and `next refresh` lines, including the freshest material context (`latest material <timestamp> (<material-id>) @ <source-path>` when a file-backed source exists) when a stale profile recommendation is active, so the same OpenClaw-like foundation contract stays actionable from both JSON and operator-facing text
- when only a concrete source path survives, the same latest-material surface can still fall back to `unknown timestamp` while keeping `@ <source-path>` visible, so source-backed stale refreshes and profile snapshots do not hide provenance just because the timestamp or material id is unavailable

---

## English

### Core idea

Give the model:
- a compact description of one person
- a few representative text or conversation samples
- repeated preferences and behavior patterns

Then keep updating that profile so the model can stay more faithful over time.

### Practical imitation means
- similar tone
- similar phrasing
- similar values and preferences
- similar speaking rhythm
- similar recurring habits or quirks

### Good use cases
- a personal assistant with a strong voice
- a stable character or persona system
- a text-first digital twin prototype
- a simple user-facing workflow for person imitation

### Basic approach
1. describe who the person is
2. add representative materials
3. summarize repeated traits and preferences
4. ask the model to stay faithful to that voice
5. keep updating the profile as you learn more

### Design principle
The system should be simple enough that someone can imitate a single person with only some text and lightweight structure, without needing a large pipeline.

---

## 中文

### 核心想法

给模型这些东西：
- 一个对目标人物的紧凑描述
- 一些有代表性的文本或对话样本
- 重复出现的偏好、习惯和表达模式

然后持续更新这个人物档案，让模型随着材料增加，越来越稳定地接近这个人的风格。

### 这里追求的是“实用模仿”
- 语气接近
- 用词接近
- 价值取向和偏好接近
- 说话节奏接近
- 一些固定习惯和小特点接近

### 适合的方向
- 做一个有明确个人风格的助手
- 保持角色或人格设定的一致性
- 只靠文本原型化一个数字分身
- 给普通用户提供更容易上手的人物模仿流程

### 基本方法
1. 描述这个人是谁
2. 添加有代表性的材料
3. 总结反复出现的性格、偏好和表达模式
4. 要求模型持续忠于这种声音
5. 随着了解加深，不断更新人物档案

### 设计原则
这个系统应该足够轻量，让任何人只靠一些文本和少量结构化信息，就能开始构建一个针对具体人物的 AI，而不需要复杂流程或重训练。

---

## Project shape

- `src/core/` — foundation pieces like profile, memory, prompt assembly, ingestion
- `profiles/` — target-person profile data and imported materials
- `docs/` — architecture and ingestion notes
- `memory/`, `skills/`, `soul/`, `voice/` — long-term building blocks

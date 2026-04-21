# Material ingestion

ManSkill needs a clear entrance for feeding materials about a specific person into the agent.

## First-step import commands

### Import a text document

```bash
node src/index.js import text --person harry-han --file ./samples/harry-post.txt --notes "blog post"
```

### Import a short message

```bash
node src/index.js import message --person harry-han --text "I will be there in ten minutes." --notes "short chat sample"
```

### Import a talk snippet transcript

```bash
node src/index.js import talk --person harry-han --text "We can ship the first slice today and refine tomorrow." --notes "voice memo transcript"
```

### Import a screenshot source

```bash
node src/index.js import screenshot --person harry-han --file ./screenshots/chat.png --notes "chat screenshot"
```

### Import the checked-in starter profile

```bash
node src/index.js import sample
node src/index.js import sample --file samples/starter-materials.json
```

This shortcut auto-loads `samples/harry-materials.json`, runs the manifest import, and refreshes the derived foundation drafts in one step. Use it when you want the fastest end-to-end sanity check of the ingestion entrance on a fresh checkout. If you keep multiple starter manifests under `samples/`, pass `--file <manifest.json>` to target a specific checked-in sample without renaming the canonical one first.

### Import every ready profile-local intake scaffold that still has no imported materials

```bash
node src/index.js import intake --stale
node src/index.js import intake --stale --refresh-foundation
```

This bulk path walks metadata-only profiles whose `profiles/<person-id>/imports/materials.template.json` landing zones are already complete and imports each starter manifest without re-importing profiles that already have stored materials. The plain `--stale` path leaves derived drafts alone so you can inspect the imported records first. Re-run the same bulk intake path with `--refresh-foundation` when you want memory / voice / soul / skills drafts regenerated in the same pass.

### Import every ready profile-local intake manifest only for already-imported profiles

```bash
node src/index.js import intake --imported
node src/index.js import intake --imported --refresh-foundation
```

Use this selective replay when you want to re-run profile-local intake manifests only for profiles that already have imported materials on disk, for example after editing `profiles/<person-id>/imports/materials.template.json` and wanting to pull the revised entries back through the same intake entrance without touching first-run metadata-only profiles. The plain `import intake --imported` path leaves derived drafts alone so you can inspect the replayed materials first; add `--refresh-foundation` when you want the same pass to regenerate memory / voice / soul / skills drafts too.

### Re-import every ready profile-local intake manifest, even for already-imported profiles

```bash
node src/index.js import intake --all
```

Use this broader path when you intentionally want to replay every ready `profiles/<person-id>/imports/materials.template.json` starter manifest, including profiles that already have imported materials on disk.

### Complete missing or partial intake landing zones for metadata-only profiles

```bash
node src/index.js update intake --stale
```

This repair path fills in only metadata-only profiles whose `imports/` starter area is missing files or still partial.

### Backfill missing intake landing zones for already-imported profiles

```bash
node src/index.js update intake --imported
```

Use this when imported profiles still need their `profiles/<person-id>/imports/README.md`, `sample.txt`, or `materials.template.json` landing zone restored without re-scaffolding metadata-only profiles that have never been imported.

### Rebuild intake landing zones for every metadata-only profile

```bash
node src/index.js update intake --all
```

Use this when you want to refresh the checked-in `imports/README.md`, `materials.template.json`, and `sample.txt` starter assets across every metadata-only profile, even if some of them are already complete.

### Import a JSON manifest of mixed materials

```bash
node src/index.js import manifest --file ./samples/harry-materials.json
node src/index.js import manifest --file ./samples/harry-materials.json --refresh-foundation
```

A starter manifest now ships in-repo at `samples/harry-materials.json`, alongside `samples/harry-post.txt` and `samples/harry-chat.png`, so there is always one copy-pasteable multimodal bootstrap path for the ingestion entrance on the main repo checkout. Use the `--refresh-foundation` variant when you want the imported materials to immediately regenerate the derived memory / voice / soul / skills drafts in the same pass.

Manifest shape:

```json
{
  "profiles": [
    {
      "personId": "harry-han",
      "displayName": "Harry Han",
      "summary": "Direct operator with a bias for momentum."
    }
  ],
  "entries": [
    {
      "personId": "harry-han",
      "type": "message",
      "text": "Ship the thin slice first.",
      "notes": "chat sample"
    },
    {
      "personId": "harry-han",
      "type": "text",
      "file": "./post.txt",
      "notes": "blog fragment"
    },
    {
      "personId": "jane-doe",
      "type": "screenshot",
      "file": "./chat.png",
      "notes": "visual reference"
    }
  ]
}
```

Single-target shorthand is also supported when all entries belong to one person:

```json
{
  "personId": "harry-han",
  "displayName": "Harry Han",
  "summary": "Direct operator with a bias for momentum.",
  "entries": [
    {
      "type": "message",
      "text": "Ship the thin slice first."
    },
    {
      "type": "text",
      "file": "./post.txt"
    }
  ]
}
```

- `profiles` is optional and lets you seed target-person metadata before material import
- top-level `personId` / `displayName` / `summary` act as a single-target shorthand and let `entries[]` omit `personId`
- `file` paths inside the manifest are resolved relative to the manifest file itself
- `--refresh-foundation` can be used on both one-off `import <type>` commands and `import manifest`
- `import sample` is a higher-level shortcut that uses the checked-in sample manifest and always refreshes the starter profile's derived drafts; add `--file <manifest.json>` when you want to pick a different checked-in sample explicitly
- `import intake --stale` bulk-imports only import-ready metadata-only intake scaffolds (that is, profile-local starter manifests whose intake entrance exists and whose manifest is not invalid) without refreshing derived drafts by default, so the profile-local entrance can be processed without re-importing profiles that already have stored materials; re-run the same bulk intake path with `--refresh-foundation` when you want memory / voice / soul / skills drafts regenerated in the same pass
- manifest imports can span multiple target profiles in one pass
- manifest import results now also include per-profile summaries with imported material counts/types, the stored display label/summary, `needsRefresh`, sorted `missingDrafts`, and direct follow-up commands for `update profile` and `update foundation`
- when `import manifest` is paired with `--refresh-foundation`, those per-profile summaries are recomputed after draft generation so freshly imported profiles report `needsRefresh: false` instead of stale pre-refresh status

### Update target-person profile metadata

```bash
node src/index.js update intake --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --summary "Direct operator with a bias for fast feedback loops." --refresh-foundation
```

`update intake` bootstraps a profile-local landing zone at `profiles/<person-id>/imports/` with a `README.md`, a `sample.txt` placeholder, and a `materials.template.json` starter manifest so users have an obvious place to drop target-person materials before import. That starter manifest now includes `entryTemplates` for `text`, `message`, `talk`, and `screenshot`, while the generated README mirrors direct one-shot import commands for the same four paths so the first user-facing intake move does not require reconstructing CLI syntax by hand. The same README now also exposes both profile-local intake shortcut variants: a plain `import intake --person <id>` rerun that leaves existing drafts alone, plus an `--refresh-foundation` variant for the common "import and regenerate" path. Re-running `update intake` preserves any existing starter `entries[]`, per-type `entryTemplates` customizations, and the README's managed `Custom notes` block, so an operator can refine the intake scaffold over time without losing already-curated material placeholders or intake-specific guidance. One-off `import text|message|talk|screenshot` commands and higher-level manifest/sample imports now also keep this same `imports/` landing zone present automatically for the touched profile, so the user-facing entrance remains visible after the first materials are already stored. When the existing `materials.template.json` has been edited into invalid JSON, `update intake` now snapshots the broken file to `materials.template.json.invalid-<timestamp>.bak` before rebuilding the scaffold, returns that backup location as `invalidStarterManifestBackupPath` in the CLI result, and keeps parseable placeholder JSON like `null` out of the invalid-backup flow. `update profile` updates `profiles/<person-id>/profile.json` without requiring a new material import. When you pass `--refresh-foundation`, the same command also regenerates that target profile's derived memory / voice / soul / skills drafts immediately so identity-bearing draft headers stay in sync with metadata edits.

## What happens

- the target person is normalized into a profile id
- a profile folder is created under `profiles/<person-id>/`
- a `profile.json` file is created if needed
- `profile.json` can now hold user-facing metadata like `displayName` and `summary`
- imported material is stored under `profiles/<person-id>/materials/`
- screenshot files are copied into `profiles/<person-id>/materials/screenshots/`
- each import writes a JSON material record with metadata

## Current metadata per material

- `id`
- `personId`
- `type`
- `createdAt`
- `notes`
- `sourceFile`
- `assetPath` for copied screenshot assets
- `content` for text and message materials

## Current profile summary exposure

Running `node src/index.js` now exposes per-profile ingestion summaries in the top-level repo status:

- `profile.displayName` / `profile.summary` from `profile.json`
- `materialTypes` counts by imported type
- `latestMaterialAt` so the newest profile activity is visible
- `latestMaterialId` so the newest imported record can be tied back to stale-draft detection and draft provenance
- `foundationReadiness.memory` candidate counts, newest material types, and lightweight text-first sample summaries
- `foundationReadiness.voice` sample excerpts from text / message / talk materials
- `foundationReadiness.soul` sample excerpts from text / talk materials
- `foundationReadiness.skills` procedural-note candidates from talk materials
- `foundationDrafts` relative paths for generated memory / voice / soul / skills artifacts
- `foundationDraftStatus` with `generatedAt`, `missingDrafts`, and `needsRefresh` so stale profiles are visible
  - freshness uses `latestMaterialId` as a tie-breaker, so same-timestamp imports still show up as stale when drafts lag behind
- `foundationDraftSummaries.memory` generated entry counts, provenance metadata (`generatedAt`, `latestMaterialAt`, `latestMaterialId`, `sourceCount`, `materialTypes`), plus latest textual summaries
- `foundationDraftSummaries.voice|soul|skills` top markdown bullet highlights from generated drafts; when a markdown draft exists but is structurally thin, those summaries also surface `readySectionCount`, `totalSectionCount`, and `missingSections` so stale profile snapshots can call out exact section gaps
- top-level `foundation.memory|voice|soul|skills` repo rollups that aggregate generated coverage, candidate-profile coverage, stale draft counts, and high-signal highlights across all imported target profiles
- top-level `foundation.maintenance` queue data (`readyProfileCount`, `refreshProfileCount`, `incompleteProfileCount`, `draftGapCountTotal`, `draftGapCounts`, `refreshAllCommand`, `staleRefreshCommand`, `helperCommands`, `queuedProfiles`) so stale or incomplete target profiles can be surfaced directly in the prompt preview before the detailed rollup
  - the same maintenance rollup now also exposes a canonical next-refresh target (`recommendedProfileId`, `recommendedLabel`, `recommendedAction`, `recommendedCommand`, `recommendedPaths`, `recommendedDraftGapSummary`) so the work loop and prompt preview can point at one stable per-profile refresh entry without re-deriving it from `queuedProfiles[0]`
  - each queued profile now includes its own `refreshCommand` plus per-draft gap counts (`draftGapCount`, `draftGapCounts`), which keeps the user-facing ingestion/update entrance operational and lets stale profile ordering stay tied to the most incomplete memory/skills/soul/voice refresh first
  - the maintenance rollup also exposes a stable helper bundle for `update foundation --all` and `update foundation --stale`, so downstream prompt builders can show one copy-pasteable repair palette for target-profile drafts instead of depending on scattered scalar fields
  - queued profiles now also surface `generatedDraftCount`, `expectedDraftCount`, and `candidateDraftCount`, so the maintenance queue can prioritize the most incomplete profiles and show concrete draft coverage before you refresh anything
- `update foundation --stale` now also repairs malformed generated markdown drafts (`voice/README.md`, `soul/README.md`, `skills/README.md`) when their provenance headers are missing or corrupted, instead of only refreshing fully missing/stale profiles
- top-level `ingestion` entrance data (`profileCount`, `importedProfileCount`, `metadataOnlyProfileCount`, `readyProfileCount`, `refreshProfileCount`, `incompleteProfileCount`, `importedIntakeReadyProfileCount`, `importedIntakeBackfillProfileCount`, `supportedImportTypes`, `bootstrapProfileCommand`, `sampleImportCommand`, `importManifestCommand`, `sampleManifestPath`, `sampleManifestPresent`, `sampleStarterCommand`, `sampleStarterSource`, `sampleManifestCommand`, `sampleTextPath`, `sampleTextPresent`, `sampleTextCommand`, `staleRefreshCommand`, `intakeImportedCommand`, `intakeImportImportedCommand`, `intakeImportImportedAndRefreshCommand`, `recommendedProfileId`, `recommendedLabel`, `recommendedAction`, `recommendedCommand`, `recommendedEditPath`, `recommendedFollowUpCommand`, `recommendedPaths`, `helperCommands`, `profileCommands`, `allProfileCommands`) so the summary exposes the default material-import/update commands alongside the foundation maintenance queue
  - the top-level `workLoop` summary now also exposes both `leadingPriority` and `currentPriority`, plus split readiness counters (`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`), so downstream tooling and prompt previews can distinguish “first in order”, actionable queued work, and auth-blocked delivery rollout without re-deriving status buckets; the same `USER.md` current product direction loader ignores fenced or commented scaffold headings so only visible objectives drive the work loop, while still accepting blockquoted visible headings and list items
  - the prompt preview mirrors those semantics with separate `lead:` / `current:` lines when they differ, and blocked delivery priorities keep their exact env/bootstrap command and surface both `.env.example` and `.env` when the bootstrap step writes the repo-local env file instead of masquerading as generic queued work or understating the bootstrap blast radius
  - the prompt-preview intake diagnostics now split `metadata-only intake scaffolds` from `imported intake`, which prevents imported profiles with healthy `profiles/<id>/imports/*` entrances from being misread as `0 ready` simply because the metadata-only scaffold counters are zero
  - the metadata-only intake headline now treats `intakeReadyProfileCount` as `import-ready` coverage only, so invalid `profiles/<id>/imports/materials.template.json` files stay visible as repair work instead of being counted as ready scaffolds
  - the active ingestion work-loop summary now labels the imported-profile readiness slice as `drafts X ready`, so that headline cannot be mistaken for intake readiness when imported profiles still need intake backfills or invalid-manifest repairs
  - `helperCommands` now groups the repo-level intake/update/import shortcuts (`bootstrap`, `scaffoldAll`, `scaffoldStale`, `scaffoldImported`, `scaffoldImportedBundle`, `scaffoldBundle`, `repairInvalidBundle`, `repairImportedInvalidBundle`, `importManifest`, `importIntakeAll`, `importIntakeStale`, `importIntakeImported`, `importIntakeImportedAndRefresh`, `importIntakeBundle`, `updateProfileBundle`, `updateProfileAndRefreshBundle`, `refreshAllFoundation`, `refreshStaleFoundation`, `refreshFoundationBundle`, plus any runnable sample starter/manifest/text/message/talk/screenshot commands) so downstream prompt builders and operators can lift a stable command bundle without reconstructing it from scattered top-level fields
  - the prompt-preview helper palette mirrors those machine-readable helpers with stable labels like `repair-invalid-bundle`, `repair-imported-invalid-bundle`, `update-bundle`, `sync-bundle`, `sample-message`, `sample-talk`, and `sample-screenshot`, so invalid intake repairs, metadata sync, and non-text starter imports stay copy-pasteable in the same user-facing entrance
  - each profile command bundle now also carries `importCommands.text|message|talk|screenshot`, `intakeStatusSummary`, `importManifestCommand`, `importIntakeWithoutRefreshCommand`, `starterImportCommand`, and a grouped `helperCommands` block (`scaffold`, `importIntakeWithoutRefresh`, `importIntake`, `importManifest`, `starterImport`, `updateProfile`, `refreshFoundation`, `directImports`) so downstream tooling can surface one stable intake/update palette per target profile instead of stitching individual command fields together
  - `updateProfileCommand` / `helperCommands.updateProfile` now preserve the profile's current `displayName` and optional `summary`, making the surfaced metadata-edit command copy-pasteable without reconstructing those fields by hand
  - when a metadata-only profile already has `profiles/<id>/imports/materials.template.json`, both the prompt preview and work loop now prefer that profile-local starter manifest over unrelated sample bundles, while still preferring a runnable direct text import when one exists for the same profile
  - when an already-imported profile's drafts are already fresh and it still only has the untouched `profiles/<id>/imports/materials.template.json` starter scaffold, the same top-level recommendation keeps `recommendedCommand` empty but now exposes `recommendedEditPath` and `recommendedFollowUpCommand` so `next intake` can say which manifest to edit and which `import manifest --file ... --refresh-foundation` command comes after that edit
  - starter-template profile rows in the prompt preview now also keep `refresh-intake node src/index.js update intake --person ...` visible beside manifest/import actions, so operators can resync generated intake scaffolds without giving up the next runnable import path
  - `profileCommands` stays focused on the top actionable queue for prompt previews, while `allProfileCommands` exposes the full sorted per-profile command catalog so operators can inspect ready profiles too without recomputing command bundles downstream
  - metadata-only profiles now default their primary `importMaterialCommand` to `import message --person <id> --text <message> --refresh-foundation` unless a checked-in sample text file gives them a runnable text import, so the entrance stays copy-pasteable even when no local sample file exists yet
  - the prompt preview mirrors this as `Ingestion entrance:` before delivery/foundation diagnostics so operators can jump straight from the summary to `update intake`, `import manifest`, `update profile`, one-shot `import text --refresh-foundation`, or `update foundation`
  - when the selected sample manifest includes inline `message` / `talk` entries or extra file-backed samples like screenshots, both the JSON summary and the prompt-preview `helpers:` line now surface those runnable sample commands too, so the user-facing entrance exposes the full sample palette instead of only the canonical text bootstrap path
  - when the repo includes `samples/harry-materials.json`, the same block now advertises a real `sampleManifestCommand` instead of only a placeholder manifest path
  - sample-manifest diagnostics now also surface `sampleManifestMaterialTypes`, and the prompt line renders that typed mix (for example `message:1, text:1`) so the checked-in starter's coverage is visible before import
  - when the manifest includes explicit `displayName` metadata, the same ingestion entrance now also exposes `sampleManifestProfileLabels` and uses those human-readable labels in the prompt preview instead of only raw profile ids
  - that same sample-manifest path now also collapses into a shorter `sampleStarterCommand` (`node src/index.js import sample`) so first-run operators and the cron work loop can use one stable bootstrap command instead of reconstructing the longer manifest call, while `sampleStarterSource` keeps the exact checked-in manifest path visible in JSON and the prompt preview starter line
  - when the repo also includes `samples/harry-post.txt`, the same block now advertises a real `sampleTextCommand` (`node src/index.js import text --person <sample-person> --file samples/harry-post.txt --refresh-foundation`) so the entrance exposes both a batch and one-shot bootstrap path
  - the ingestion block now stays visible even for empty repos, which makes the user-facing bootstrap path discoverable before any target profile has been created, and that empty-repo bootstrap now points at `update intake` so the first action creates real starter files instead of only a metadata stub
  - the top-level `workLoop` queue now mirrors those sample asset paths when ingestion is the current priority, so cron-style runs can see the concrete `samples/...` files backing the next import slice
  - on first-run repos with a valid checked-in starter manifest, the active ingestion priority now promotes the exact checked-in sample manifest command via `sampleManifestCommand` (`import manifest --file ... --refresh-foundation`) instead of the coarser `import sample` alias, while still keeping the shorter `sampleStarterCommand` visible as the friendly starter shortcut
  - when multiple metadata-only profiles are queued for scaffold or ready-intake import work, the work loop now prefers the exact bundled per-profile commands (`scaffoldBundle`, `importIntakeBundle`, `refreshFoundationBundle`) over coarse `--stale` aliases while still widening `paths` to the full batch
  - ready profile-local intake manifests are now validated before they become the active import step; invalid edited manifests surface as fix-first work-loop items instead of advertising broken `import manifest` commands
- top-level `foundation.core` repo diagnostics for the base memory / skills / soul / voice scaffold, including an `overview` block (`readyAreaCount`, `missingAreas`, `thinAreas`) that the prompt preview mirrors as a compact coverage line
  - when all four repo-core layers are ready and no repair queue remains, the prompt preview now collapses the verbose per-area lines into a single `ready details` summary so the foundation stays visible without crowding out ingestion/delivery work
  - `foundation.core.memory` now also exposes bucket coverage across `daily`, `long-term`, and `scratch` via `readyBucketCount`, `totalBucketCount`, `populatedBuckets`, and `emptyBuckets`, so partial repo memory scaffolds remain visibly thin until all three lanes are seeded
  - the same repo-core memory block also makes the daily-vs-legacy alias contract explicit through `foundation.core.memory.canonicalShortTermBucket` and `foundation.core.memory.legacyShortTermAliases`, so ingestion-side consumers can tell that `daily/` is the canonical short-term lane even while older `shortTerm*` fields stay compatibility-safe elsewhere in the summary
  - the top-level memory summary mirrors that mapping too via `memorySummary.canonicalShortTermBucket` and `memorySummary.legacyShortTermAliases`, which keeps ingestion/work-loop tooling from having to infer the canonical `daily/` bucket from historical `shortTermEntries` / `shortTermPresent` naming alone
  - the memory core summary also carries `rootExcerpt` plus `foundation.core.memory.rootReadySections` / `foundation.core.memory.rootMissingSections` and `foundation.core.memory.rootReadySectionCount` / `foundation.core.memory.rootTotalSectionCount` from `memory/README.md`, and the prompt preview mirrors that state directly as `buckets X/3 ready (...)` plus `root sections X/2 ready (...)` instead of the older `empty buckets:` wording
  - the skills core summary now also carries `hasRootDocument`, `rootPath`, `rootExcerpt`, and the parallel `foundation.core.skills.rootReadySections` / `foundation.core.skills.rootMissingSections` plus `foundation.core.skills.rootReadySectionCount` / `foundation.core.skills.rootTotalSectionCount` fields from `skills/README.md`, and the prompt preview mirrors that excerpt on the skills line so repo-level procedural guidance stays visible without reopening the root doc
  - when `skills/README.md` is partially structured (for example `## What lives here` exists but `## Layout` is missing or empty), the same summary now surfaces `rootReadySections` / `rootMissingSections`, keeps repo-core `skills` coverage thin, and points `foundation.core.maintenance` at a repair command for the root README instead of only per-skill `SKILL.md` files
  - `foundation.core.overview.recommendedActions` now lists concrete next fixes when any repo-core area is missing or thin (for example `create voice/README.md`, `create skills/<name>/SKILL.md for at least one repo skill`, or filling specific empty memory buckets)
  - `foundation.core.maintenance` also carries per-area runnable commands plus grouped helper bundles (`helperCommands.scaffoldAll`, `helperCommands.scaffoldMissing`, `helperCommands.scaffoldThin`, `memory`, `skills`, `soul`, `voice`), and thin-doc queue metadata (`queuedAreas[*].rootThinReadySections`, `rootThinMissingSections`, `rootThinReadySectionCount`, `rootThinTotalSectionCount`) so the repo-level memory / skills / soul / voice backlog is directly executable from JSON and the prompt preview instead of only described in prose
  - `foundation.core.soul` and `foundation.core.voice` now mirror the repo-level `rootPath` / `rootExcerpt` pattern already used by memory and skills, while keeping the older `path` / `excerpt` fields intact for compatibility, and they also expose `foundation.core.soul.readySections`, `foundation.core.soul.missingSections`, `foundation.core.soul.readySectionCount`, `foundation.core.soul.totalSectionCount`, plus the parallel `foundation.core.voice.readySections`, `foundation.core.voice.missingSections`, `foundation.core.voice.readySectionCount`, and `foundation.core.voice.totalSectionCount` so prompt previews can show both partial and fully ready structured docs with grounded section labels
  - checked-in root docs stay parser-aligned: `SOUL.md` should keep `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`, while `voice/README.md` should keep `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`, so the repo-root summary stays honest about which foundation sections are actually grounded
  - the same maintenance block now includes a preselected repair entrance (`recommendedArea`, `recommendedAction`, `recommendedCommand`, `recommendedPaths`) so downstream tooling can jump straight into the highest-priority core foundation fix without re-deriving it from `queuedAreas[]`; when the queue narrows to one area, the additive `recommendedStatus` and `recommendedSummary` fields carry that single target's detailed context, while the existing `helperCommands.scaffoldAll|scaffoldMissing|scaffoldThin` fields still carry the bundled multi-area repair routes
  - when more than two repo-core areas are queued, the prompt preview now keeps the first two detailed lines and adds a compact remainder line (`+N more queued: ...`) so thin/missing foundation work stays visible without bloating the preview
- manifest-backed `channels` / `models` summaries that keep the built-in foundation metadata while letting `manifests/channels.json` and `manifests/providers.json` override per-repo status or add extra adapters/providers
  - both summaries now also expose aggregate delivery planning metadata like `activeCount`, `plannedCount`, `candidateCount`, and deduped `authEnvVars`, which the prompt preview reuses directly instead of recomputing delivery readiness from raw manifests
  - each delivery summary also carries a compact `manifest` status block (`loaded`, `missing`, or `invalid`) so malformed channel/provider manifests fall back to built-in defaults without breaking the repo-level summary
- top-level `delivery` setup guidance that turns channel/provider metadata into an operator queue (`pendingChannelCount`, `pendingProviderCount`, `configuredChannelCount`, `configuredProviderCount`, `missingChannelEnvVars`, `missingProviderEnvVars`, `requiredEnvVars`, `channelManifestPath`, `providerManifestPath`, `envTemplatePath`, `envTemplatePresent`, `envTemplateCommand`, `channelQueue`, `providerQueue`)
  - each queued channel/provider row now includes auth-readiness fields (`configured`, `missingEnvVars`) plus a concrete `setupHint` (for example `credentials present`, `set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET`, or `auth configured for gpt-5`) so the prompt preview can show rollout work as the next action instead of only listing adapter names
  - the same delivery block now exposes stable helper bundles for rollout scaffolding (`helperCommands.bootstrapEnv`, `scaffoldChannelManifest`, `scaffoldProviderManifest`, `scaffoldChannelImplementation`, `scaffoldChannelImplementationBundle`, `scaffoldProviderImplementation`, `scaffoldProviderImplementationBundle`), so operators and downstream tooling can lift one copy-pasteable setup palette without reverse-engineering queue rows
  - when multiple delivery implementations are missing, prompt previews now surface bundled `channel impl-all ...` / `provider impl-all ...` commands instead of only the first missing file, keeping the rendered helper line aligned with the underlying JSON helper bundle
  - the work loop also keeps delivery guidance honest by preferring `.env.example` bootstrap only when the current queue leader is actually blocked on missing credentials and no repo-local `.env` exists yet; once `.env` already exists, the blocked delivery step narrows to the repo-local `touch '.env' && ...` populate helper so `paths` drops back to `.env`, while auth-complete leaders still switch onward to manifest or implementation scaffolding and keep the displayed blast radius aligned with the runnable command
  - once the current rollout leader is auth-blocked and otherwise runtime-ready, the delivery priority also upgrades to `blocked` immediately even if later channels/providers still need implementation files, so `currentPriority.status`, `blockedPriorityCount`, and prompt-preview wording stay aligned with the leader-first bootstrap command instead of slipping back to a generic queued label
  - when `.env.example` is present, the prompt preview also surfaces the shared env template path, the total credential count, and a bootstrap copy command (`cp .env.example .env`) so channel/provider rollout has a concrete first step; after that bootstrap, the same work-loop surface can switch to the narrower repo-local populate helper instead of continuing to overstate the blast radius with `.env.example`

Generated draft files now also carry the target person's `displayName` and `summary` in both the memory JSON draft and the voice / soul / skills markdown headers, so the foundation layer keeps a direct identity anchor alongside extracted evidence. The memory draft also records `materialTypes`, while the markdown drafts stamp `Generated at`, `Latest material`, and `Source materials` headers for provenance. Prompt snapshots surface that summary as a one-line `profile summary:` field when it is available, and stale detection now treats profile-metadata changes as draft drift even when no new materials were imported.

## Foundation draft update command

After importing materials, derive draft updates for the target person's memory / voice / soul / skills foundation:

```bash
node src/index.js update foundation --person harry-han
```

To refresh every profile that already has imported materials:

```bash
node src/index.js update foundation --all
```

To refresh only profiles that are missing drafts or have newer materials than their last generated foundation draft:

```bash
node src/index.js update foundation --stale
```

This writes:

- `profiles/<person-id>/memory/long-term/foundation.json`
- `profiles/<person-id>/voice/README.md`
- `profiles/<person-id>/soul/README.md`
- `profiles/<person-id>/skills/README.md`

Running `node src/index.js` will also expose these generated draft paths under `profiles[].foundationDrafts`.

## Current limitation

The update command now creates first-pass drafts from imported materials and the repo summary aggregates them into a compact foundation rollup, including memory and skills candidate-profile coverage when some profiles still need draft refreshes.

That rollup is intentionally symmetric across durable layers: prompt previews and repo summaries should mention both memory and skills candidate-profile coverage whenever stale or missing drafts mean some profiles still have candidate materials waiting to be turned into generated markdown.
They are still heuristic draft artifacts rather than a fully learned memory store, reusable skill schema, or production channel/provider runtime.

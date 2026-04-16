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

### Import a JSON manifest of mixed materials

```bash
node src/index.js import manifest --file ./samples/harry-materials.json --refresh-foundation
```

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
- manifest imports can span multiple target profiles in one pass
- manifest import results now also include per-profile summaries with imported material counts/types, the stored display label/summary, `needsRefresh`, sorted `missingDrafts`, and direct follow-up commands for `update profile` and `update foundation`
- when `import manifest` is paired with `--refresh-foundation`, those per-profile summaries are recomputed after draft generation so freshly imported profiles report `needsRefresh: false` instead of stale pre-refresh status

### Update target-person profile metadata

```bash
node src/index.js update profile --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --summary "Direct operator with a bias for fast feedback loops." --refresh-foundation
```

This updates `profiles/<person-id>/profile.json` without requiring a new material import. When you pass `--refresh-foundation`, the same command also regenerates that target profile's derived memory / voice / soul / skills drafts immediately so identity-bearing draft headers stay in sync with metadata edits.

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
- `foundationDraftSummaries.voice|soul|skills` top markdown bullet highlights from generated drafts
- top-level `foundation.memory|voice|soul|skills` repo rollups that aggregate generated coverage, stale draft counts, and high-signal highlights across all imported target profiles
- top-level `foundation.maintenance` queue data (`readyProfileCount`, `refreshProfileCount`, `incompleteProfileCount`, `staleRefreshCommand`, `queuedProfiles`) so stale or incomplete target profiles can be surfaced directly in the prompt preview before the detailed rollup
  - each queued profile now includes its own `refreshCommand`, which keeps the user-facing ingestion/update entrance operational instead of requiring operators to reconstruct the right CLI call by hand
- top-level `ingestion` entrance data (`profileCount`, `importedProfileCount`, `metadataOnlyProfileCount`, `readyProfileCount`, `refreshProfileCount`, `incompleteProfileCount`, `supportedImportTypes`, `bootstrapProfileCommand`, `sampleImportCommand`, `importManifestCommand`, `staleRefreshCommand`, `profileCommands`) so the summary exposes the default material-import/update commands alongside the foundation maintenance queue
  - the prompt preview mirrors this as `Ingestion entrance:` before delivery/foundation diagnostics so operators can jump straight from the summary to `import manifest`, `update profile`, one-shot `import text --refresh-foundation`, or `update foundation`
  - the ingestion block now stays visible even for empty repos, which makes the user-facing bootstrap path discoverable before any target profile has been created
- top-level `foundation.core` repo diagnostics for the base memory / skills / soul / voice scaffold, including an `overview` block (`readyAreaCount`, `missingAreas`, `thinAreas`) that the prompt preview mirrors as a compact coverage line
  - `foundation.core.memory` now also exposes bucket coverage across `daily`, `long-term`, and `scratch` via `readyBucketCount`, `totalBucketCount`, `populatedBuckets`, and `emptyBuckets`, so partial repo memory scaffolds remain visibly thin until all three lanes are seeded
  - the prompt preview mirrors that state directly with an `empty buckets:` suffix on the memory line when any repo-core memory bucket is still missing
  - `foundation.core.overview.recommendedActions` now lists concrete next fixes when any repo-core area is missing or thin (for example `create voice/README.md`, `document placeholder skill folders with SKILL.md`, or filling specific empty memory buckets)
- manifest-backed `channels` / `models` summaries that keep the built-in foundation metadata while letting `manifests/channels.json` and `manifests/providers.json` override per-repo status or add extra adapters/providers
  - both summaries now also expose aggregate delivery planning metadata like `activeCount`, `plannedCount`, `candidateCount`, and deduped `authEnvVars`, which the prompt preview reuses directly instead of recomputing delivery readiness from raw manifests
  - each delivery summary also carries a compact `manifest` status block (`loaded`, `missing`, or `invalid`) so malformed channel/provider manifests fall back to built-in defaults without breaking the repo-level summary
- top-level `delivery` setup guidance that turns channel/provider metadata into an operator queue (`pendingChannelCount`, `pendingProviderCount`, `configuredChannelCount`, `configuredProviderCount`, `missingChannelEnvVars`, `missingProviderEnvVars`, `channelManifestPath`, `providerManifestPath`, `channelQueue`, `providerQueue`)
  - each queued channel/provider row now includes auth-readiness fields (`configured`, `missingEnvVars`) plus a concrete `setupHint` (for example `credentials present`, `set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET`, or `auth configured for gpt-5`) so the prompt preview can show rollout work as the next action instead of only listing adapter names

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

The update command now creates first-pass drafts from imported materials and the repo summary aggregates them into a compact foundation rollup.
They are still heuristic draft artifacts rather than a fully learned memory store, reusable skill schema, or production channel/provider runtime.

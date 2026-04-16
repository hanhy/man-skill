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

- `file` paths inside the manifest are resolved relative to the manifest file itself
- `--refresh-foundation` can be used on both one-off `import <type>` commands and `import manifest`
- manifest imports can span multiple target profiles in one pass

## What happens

- the target person is normalized into a profile id
- a profile folder is created under `profiles/<person-id>/`
- a `profile.json` file is created if needed
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

- `materialTypes` counts by imported type
- `latestMaterialAt` so the newest profile activity is visible
- `foundationReadiness.memory` candidate counts and newest material types
- `foundationReadiness.voice` sample excerpts from text / message / talk materials
- `foundationReadiness.soul` sample excerpts from text / talk materials
- `foundationReadiness.skills` procedural-note candidates from talk materials
- `foundationDrafts` relative paths for generated memory / voice / soul / skills artifacts
- `foundationDraftStatus` with `generatedAt`, `missingDrafts`, and `needsRefresh` so stale profiles are visible
- `foundationDraftSummaries.memory` generated entry counts plus latest textual summaries
- `foundationDraftSummaries.voice|soul|skills` top markdown bullet highlights from generated drafts

This makes ingestion state visible to the next learning/update layer and gives the memory / voice / soul / skills foundation a first concrete bridge from raw materials. The assembled system prompt also turns these fields into compact per-profile foundation snapshots so a runtime can quickly see fresh vs stale drafts and the top extracted highlights.

## Foundation draft update command

After importing materials, derive draft updates for the target person's memory / voice / soul / skills foundation:

```bash
node src/index.js update foundation --person harry-han
```

To refresh every profile that already has imported materials:

```bash
node src/index.js update foundation --all
```

This writes:

- `profiles/<person-id>/memory/long-term/foundation.json`
- `profiles/<person-id>/voice/README.md`
- `profiles/<person-id>/soul/README.md`
- `profiles/<person-id>/skills/README.md`

Running `node src/index.js` will also expose these generated draft paths under `profiles[].foundationDrafts`.

## Current limitation

The update command now creates first-pass drafts from imported materials, but the outputs are still heuristic draft artifacts.
They are not yet merged into a richer learned memory store, reusable skill schema, or production channel/provider runtime.

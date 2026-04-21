# Profiles

Each target person should live under a dedicated profile directory.

Example layout:

```text
profiles/
  harry-han/
    profile.json
    imports/
      README.md
      sample.txt
      materials.template.json
    materials/
      2026-04-15T09-00-00-000Z-text.json
      2026-04-15T09-00-01-000Z-message.json
      screenshots/
        2026-04-15T09-00-02-000Z-chat.png
    memory/
      long-term/
        foundation.json
    voice/
      README.md
    soul/
      README.md
    skills/
      README.md
```

This directory is the entry point for user-supplied material about a person.

Imported materials land in `materials/`, and `node src/index.js update foundation --person <id>` derives first-pass foundation drafts alongside them. Repo summaries also expose maintenance-friendly refresh commands so stale profiles can be updated directly from the reported queue (`node src/index.js update foundation --stale` or the per-profile `refreshCommand`).

## User-facing ingestion entrance

The top-level `ingestion` block keeps the profile entrance explicit even before the first target profile exists. It reports imported-vs-metadata-only counts, supported import types (`message`, `screenshot`, `talk`, `text`), a bootstrap `update intake` command, a sample one-shot text import with `--refresh-foundation`, an optional checked-in sample manifest command when `samples/harry-materials.json` exists, that sample manifest's typed entry mix, a shorter `node src/index.js import sample` starter command that wraps that checked-in manifest when it validates, plus ready-to-run `import manifest`, `update profile`, and `update foundation` commands that the prompt preview mirrors under `Ingestion entrance:`.

`update intake` bootstraps `profiles/<person-id>/imports/README.md`, `sample.txt`, and `materials.template.json` as the profile-local user-facing landing zone before real materials are imported.

That same entrance also advertises:
- a plain `node src/index.js import intake --person <id>` replay path that keeps derived drafts untouched for inspection
- a `node src/index.js import intake --person <id> --refresh-foundation` variant when the same rerun should regenerate memory / voice / soul / skills drafts in one pass
- direct `import manifest --file ... --refresh-foundation` and one-off `import text|message|talk|screenshot ...` paths when operators want to skip the higher-level replay command and run the underlying import directly

When an already-imported profile still only has the untouched `profiles/<person-id>/imports/materials.template.json` starter scaffold, the top-level recommendation stays edit-first: `recommendedCommand` remains empty while `recommendedEditPath` points at the manifest and `recommendedFollowUpCommand` shows the `import intake --person <id> --refresh-foundation` replay to run after the edit.

The per-profile command palette still stays actionable in that starter-template state. Prompt rows and JSON bundles keep all of these visible from one place:
- `refresh-intake` via `node src/index.js update intake --person <id> ...`
- `importManifestCommand` for `node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json' --refresh-foundation`
- `starterImportCommand` for the checked-in `profiles/<id>/imports/sample.txt` starter import when it is available
- `updateProfileCommand` for metadata-only edits
- `updateProfileAndRefreshCommand` for metadata edits plus immediate draft regeneration

`memory/long-term/foundation.json` carries the generated memory draft plus provenance like `latestMaterialId` and `materialTypes`, while `voice/README.md`, `soul/README.md`, and `skills/README.md` now stamp `Generated at`, `Latest material`, and `Source materials` headers so each artifact stays auditable on its own.

`profile.json` can also store user-facing metadata like `displayName` and `summary`, either through `node src/index.js update profile --person <id> --display-name ... --summary ...`, through `node src/index.js update profile --person <id> --summary ... --refresh-foundation` when you want metadata edits to immediately regenerate the derived drafts, through the optional `profiles` block in a manifest import, or through a single-target manifest shorthand that puts `personId`, `displayName`, and `summary` at the top level and lets each entry omit `personId`. The plain `node src/index.js update profile --person <id>` path keeps metadata edits without requiring a new material import.

For a smoother user-facing entrance, you can also batch-ingest mixed materials from a JSON manifest with `node src/index.js import manifest --file ./materials.json --refresh-foundation`.

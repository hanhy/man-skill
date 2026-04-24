# Profiles

Each target person should live under a dedicated profile directory.

Example layout:

```text
profiles/
  harry-han/
    profile.json
    imports/
      README.md
      images/
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

The top-level `ingestion` block keeps the profile entrance explicit even before the first target profile exists. It reports imported-vs-metadata-only counts, supported import types (`message`, `screenshot`, `talk`, `text`), a bootstrap `update intake` command, a sample one-shot text import with `--refresh-foundation`, an optional checked-in sample manifest inspect command plus refresh command when `samples/harry-materials.json` exists, that sample manifest's typed entry mix, a shorter `node src/index.js import sample` starter command that wraps that checked-in manifest when it validates, plus ready-to-run `import manifest`, `update profile`, and `update foundation` commands that the prompt preview mirrors under `Ingestion entrance:`.

`update intake` bootstraps `profiles/<person-id>/imports/README.md`, an `images/` folder for screenshot assets, `sample.txt`, and `materials.template.json` as the profile-local user-facing landing zone before real materials are imported.

That same entrance also advertises:
- a plain `node src/index.js import intake --person <id>` replay path that keeps derived drafts untouched for inspection
- a `node src/index.js import intake --person <id> --refresh-foundation` variant when the same rerun should regenerate memory / voice / soul / skills drafts in one pass
- direct `import manifest --file ... --refresh-foundation` and one-off `import text|message|talk|screenshot ...` paths when operators want to skip the higher-level replay command and run the underlying import directly, plus a plain `import manifest --file ...` variant when they want to inspect imported materials before regenerating drafts

When an already-imported profile still only has the untouched `profiles/<person-id>/imports/materials.template.json` starter scaffold, the top-level recommendation stays edit-first: `recommendedCommand` remains empty while `recommendedRefreshIntakeCommand` points at the `update intake` rerun that restores the profile-local scaffold, `recommendedEditPath` points at the manifest for a single starter-template profile, `recommendedEditPaths` expands that into a bundled manifest set when multiple imported starter templates are queued, `recommendedManifestInspectCommand` / `recommendedManifestImportCommand` keep the direct `import manifest --file 'profiles/<id>/imports/materials.template.json'` inspect/refresh commands visible during the edit, `recommendedIntakeManifestEntryTemplateTypes` / `recommendedIntakeManifestEntryTemplateCount` preserve which starter entry types are still expected before import, `recommendedInspectCommand` shows the plain `import intake --person <id>` inspection replay to run right after the edit, `recommendedFollowUpCommand` shows the `import intake --person <id> --refresh-foundation` replay to run after that, and `recommendedFallbackCommand` keeps the seeded direct starter import visible when operators want a stopgap import before customizing the manifest. The same contract now propagates into `workLoop.currentPriority|actionableReadyPriority|recommendedPriority` through `latestMaterialAt`, `latestMaterialId`, `latestMaterialSourcePath`, `candidateSignalSummary`, `draftGapSummary`, `fallbackCommand`, `refreshIntakeCommand`, `editPath`, `editPaths`, `manifestInspectCommand`, `manifestImportCommand`, `intakeManifestEntryTemplateTypes`, `intakeManifestEntryTemplateCount`, `inspectCommand`, and `followUpCommand`, so cron/operator loops can carry the edit-first sequence without scraping prompt prose and queued foundation repair loops can keep provenance-rich evidence beside the refresh command.

The per-profile command palette still stays actionable in that starter-template state. Prompt rows and JSON bundles keep all of these visible from one place:
- `refresh-intake` via `node src/index.js update intake --person <id> ...`
- `after-editing import` via `node src/index.js import intake --person <id>` when you want to inspect the replay without regenerating drafts yet
- `after-editing import+refresh` via `node src/index.js import intake --person <id> --refresh-foundation` when the same replay should regenerate memory / voice / soul / skills drafts
- `importManifestWithoutRefreshCommand` plus `helperCommands.importManifest` for `node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json'`
- `importManifestCommand` plus `helperCommands.importManifestAndRefresh` for `node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json' --refresh-foundation`
- `starterImportCommand` for the checked-in `profiles/<id>/imports/sample.txt` starter import
- both `followUpImportIntakeWithoutRefreshCommand` / `followUpImportIntakeCommand` and the scaffold-result aliases `importAfterEditingWithoutRefreshCommand` / `importAfterEditingCommand`, plus matching `helperCommands.importAfterEditingWithoutRefresh` / `helperCommands.importAfterEditing`, so the plain `import intake --person <id>` inspection replay and the `--refresh-foundation` replay stay available from either the higher-level ingestion summary or the direct `update intake` JSON result after editing the starter manifest
- the generated `profiles/<id>/imports/README.md` also keeps the manifest helper bullets explicit: `inspect the edited manifest without refreshing drafts: node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json'` and `import the edited manifest and refresh drafts: node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json' --refresh-foundation`
- that same checked-in README mirrors those direct replay labels as `manifest inspect:` and `manifest:` inside its `Direct import commands:` block.
- the generated `profiles/<id>/imports/README.md` also carries a `Rerun safety:` block that says re-running `update intake` preserves starter entries, entry templates, and the managed `Custom notes` block while snapshotting invalid JSON starter manifests to `materials.template.json.invalid-<timestamp>.bak` before rebuilding
- `updateProfileCommand` for metadata-only edits
- `updateProfileAndRefreshCommand` for metadata edits plus immediate draft regeneration

If `materials.template.json` becomes invalid JSON, re-running `update intake` snapshots the broken file to `materials.template.json.invalid-<timestamp>.bak`, returns `invalidStarterManifestBackupPath`, and then rebuilds the starter manifest so operators can recover the previous draft instead of losing the last edit during intake repair.

`memory/long-term/foundation.json` carries the generated memory draft plus provenance like `latestMaterialId` and `materialTypes`, while `voice/README.md`, `soul/README.md`, and `skills/README.md` now stamp `Generated at`, `Latest material`, and `Source materials` headers so each artifact stays auditable on its own.

`profile.json` can also store user-facing metadata like `displayName` and `summary`, either through `node src/index.js update profile --person <id> --display-name ... --summary ...`, through `node src/index.js update profile --person <id> --summary ... --refresh-foundation` when you want metadata edits to immediately regenerate the derived drafts, through the optional `profiles` block in a manifest import, or through a single-target manifest shorthand that puts `personId`, `displayName`, and `summary` at the top level and lets each entry omit `personId`. The plain `node src/index.js update profile --person <id>` path keeps metadata edits without requiring a new material import.

For a smoother user-facing entrance, you can also batch-ingest mixed materials from a JSON manifest with `node src/index.js import manifest --file ./materials.json --refresh-foundation`.

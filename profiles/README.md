# Profiles

Each target person should live under a dedicated profile directory.

Example layout:

```text
profiles/
  harry-han/
    profile.json
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
Imported materials land in `materials/`, and `node src/index.js update foundation --person <id>` derives first-pass foundation drafts alongside them. Repo summaries now also expose maintenance-friendly refresh commands so stale profiles can be updated directly from the reported queue (`node src/index.js update foundation --stale` or the per-profile `refreshCommand`). A separate top-level `ingestion` block keeps the user-facing entrance explicit with imported-vs-metadata-only counts, supported import types (`message`, `screenshot`, `talk`, `text`), a bootstrap `update profile` command, a sample one-shot text import with `--refresh-foundation`, plus ready-to-run `import manifest`, `update profile`, and `update foundation` commands that the prompt preview mirrors under `Ingestion entrance:` even before the first target profile exists.
`memory/long-term/foundation.json` carries the generated memory draft plus provenance like `latestMaterialId` and `materialTypes`, while `voice/README.md`, `soul/README.md`, and `skills/README.md` now stamp `Generated at`, `Latest material`, and `Source materials` headers so each artifact stays auditable on its own.
`profile.json` can also store user-facing metadata like `displayName` and `summary`, either through `node src/index.js update profile --person <id> --display-name ... --summary ...`, through `node src/index.js update profile --person <id> --summary ... --refresh-foundation` when you want metadata edits to immediately regenerate the derived drafts, through the optional `profiles` block in a manifest import, or through a single-target manifest shorthand that puts `personId`, `displayName`, and `summary` at the top level and lets each entry omit `personId`.
For a smoother user-facing entrance, you can also batch-ingest mixed materials from a JSON manifest with `node src/index.js import manifest --file ./materials.json --refresh-foundation`.

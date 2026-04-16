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
Imported materials land in `materials/`, and `node src/index.js update foundation --person <id>` derives first-pass foundation drafts alongside them.
For a smoother user-facing entrance, you can also batch-ingest mixed materials from a JSON manifest with `node src/index.js import manifest --file ./materials.json --refresh-foundation`.

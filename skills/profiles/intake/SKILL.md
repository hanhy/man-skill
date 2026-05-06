---
name: profiles/intake
description: Use when scaffolding, replaying, or repairing the profile-local intake entrance so target-person materials stay easy to update.
---

# Profile intake skill

Use this skill when extending or validating the user-facing ingestion/update entrance under `profiles/<person-id>/imports/`.

## What this skill is for
- scaffolding or repairing the checked-in `profiles/<id>/imports/` landing zone
- keeping `update intake`, `import intake`, `import manifest`, and `update profile` helpers aligned
- verifying starter manifests, sample files, and screenshot placeholders stay copy-pasteable
- preserving inspect-first reruns before `--refresh-foundation` draft regeneration

## Suggested workflow
1. Confirm the profile-local scaffold still matches `profiles/README.md`, `docs/ingestion.md`, and the generated `profiles/<id>/imports/README.md` contract.
2. Check that the generated intake README still exposes the same top-of-file action bundle the operator sees on disk:
   - `Refresh intake scaffold:`
   - `Update profile metadata:`
   - `Sync profile metadata + drafts:`
3. Exercise the narrowest intake helper first, in order:
   - `node src/index.js update intake --person <id> --display-name "<Display Name>" --summary "<Short summary>"`
   - `node src/index.js import intake --person <id>`
   - `node src/index.js import intake --person <id> --refresh-foundation`
4. Preserve the inspect-first manifest flow before any draft regeneration. Starter-manifest helpers should keep both `node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json'` and `node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json' --refresh-foundation` visible beside direct `import text|message|talk|screenshot` commands, and the plain inspect command should stay the first step before the refresh variant.
5. Check metadata-edit follow-ups (`node src/index.js update profile --person <id> ...`, `node src/index.js update intake --person <id> ...`, refresh-sync reruns) stay attached to the same target profile and landing-zone paths.
6. Keep rerun safety explicit in the skill and generated README: re-running `update intake` preserves starter entries, entry templates, and custom notes, while invalid `materials.template.json` is backed up to `materials.template.json.invalid-<timestamp>.bak` before the scaffold is rebuilt.
7. Run focused ingestion/docs tests before the broader suite:
   - `node --import tsx --test tests/material-ingestion.test.js tests/profile-material-summary.test.ts tests/profile-foundation-update.test.js tests/readme-docs.test.js`
   - `node --import tsx --test tests/work-loop.test.ts`

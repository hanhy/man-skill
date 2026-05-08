---
name: profiles/update
description: Use when editing or syncing `profiles/<person-id>/profile.json` and the attached foundation refresh follow-ups.
---

# Profile update skill

Use this skill when editing or syncing `profiles/<person-id>/profile.json` and the attached foundation refresh follow-ups.

Keep this skill handy when the next change touches checked-in target-profile metadata or the summary/work-loop commands that keep those edits copy-pasteable.

## What this skill is for
- editing `displayName`, `summary`, and other profile-local metadata without losing the user-facing intake/update flow
- keeping `update profile`, `update intake`, `import manifest`, and `update foundation` follow-ups attached to the same target profile
- validating that metadata edits remain easy to sync with fresh memory / skills / soul / voice drafts
- preserving inspect-first and refresh-after-edit command surfaces in summary JSON, prompt preview, and work-loop rows

## Suggested workflow
1. Start with the plain metadata edit path: `node src/index.js update profile --person <id> --display-name "<Display Name>" --summary "<Short summary>"`.
2. Then validate the refresh-sync variant stays aligned with the same target profile: `node src/index.js update profile --person <id> --summary "<Short summary>" --refresh-foundation`.
3. Confirm the direct draft-refresh helper still matches the same target profile: `node src/index.js update foundation --person <id>`.
4. Check the profile-local intake follow-up still points at the same landing zone and stays available beside metadata edits: `node src/index.js import manifest --file 'profiles/<id>/imports/materials.template.json' --refresh-foundation`.
5. Run focused metadata/ingestion/docs coverage before the broader suite:
   - `node --import tsx --test tests/profile-foundation-update.test.js tests/profile-material-summary.test.ts tests/readme-docs.test.js`
   - `node --import tsx --test tests/work-loop.test.ts`

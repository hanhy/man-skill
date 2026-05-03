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
2. Exercise the narrowest intake helper first: `update intake --person <id>` for scaffolding, `import intake --person <id>` for inspect-first replay, then `--refresh-foundation` only when draft regeneration should happen in the same pass.
3. Verify starter-manifest helpers keep both `import manifest --file ...` and `import manifest --file ... --refresh-foundation` visible beside direct `import text|message|talk|screenshot` commands.
4. Check metadata-edit follow-ups (`update profile`, `update intake`, refresh-sync) stay attached to the same target profile and landing-zone paths.
5. Run focused ingestion/docs tests before the broader suite.

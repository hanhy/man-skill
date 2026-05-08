---
name: foundation-maintenance
description: Use when inspecting or refreshing the checked-in memory/skills/soul/voice foundation so repo-core guidance and per-profile drafts stay aligned.
---

# Foundation maintenance skill

Use this skill when the next step touches the OpenClaw-like foundation in `~/man-skill`.

## What this skill is for
- checking whether repo-core memory / skills / soul / voice docs are thin or missing
- refreshing target-profile foundation drafts after material imports or metadata drift
- verifying that prompt preview, summary JSON, and generated foundation files stay aligned
- keeping the foundation entrance runnable with explicit `update foundation` commands

## Suggested workflow
1. Run `node src/index.js summary --json` and inspect `foundation.core`, `foundation.maintenance`, `profileSnapshots`, and `workLoop`.
2. If repo-core guidance is thin or missing, repair the exact memory / skills / soul / voice files the summary points at.
3. If target-profile drafts are stale, run the narrowest refresh command first (`node src/index.js update foundation --person <id>`, then `node src/index.js update foundation --stale`, then `node src/index.js update foundation --all` only when needed).
4. Re-run the tightest relevant tests first:
   - `node --import tsx --test tests/foundation-rollup.test.js`
   - `node --import tsx --test tests/readme-docs.test.js`
   - `node --import tsx --test tests/work-loop.test.ts`
5. Re-run `npm test` and `npm run typecheck` before reporting progress.

## Notes
- Prefer the machine-readable summary fields over re-parsing prompt text when both are available.
- Keep draft provenance visible: `latestMaterialAt`, `latestMaterialId`, and `latestMaterialSourcePath` should stay aligned across summaries, work-loop priorities, and generated drafts.
- Treat `memory`, `skills`, `soul`, and `voice` as separate layers; do not collapse repairs across them without checking the reported gaps.

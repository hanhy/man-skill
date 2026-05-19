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
1. Run `node src/index.js summary --json` and inspect `foundation.core`, `foundation.core.maintenance`, `foundation.maintenance`, `profileSnapshots`, and `workLoop`.
2. For repo-core repairs, check `foundation.core.maintenance.recommendedCommand` / `recommendedPaths` first so the next memory / skills / soul / voice edit comes from the canonical repair entrance instead of only the prompt wording.
3. For per-profile refreshes, check `foundation.maintenance.recommendedCommand` / `recommendedLatestMaterialSourcePath` first so the refresh step and its newest backing artifact stay coupled in one machine-readable place.
4. Compare `workLoop.leadingPriority`, `currentPriority`, `runnablePriority`, `actionableReadyPriority`, and `recommendedPriority` before choosing whether the next slice is a repo-core repair, stale-profile refresh, or a ready advisory that should happen before the current blocker.
5. If repo-core guidance is thin or missing, repair the exact memory / skills / soul / voice files the summary points at.
6. If target-profile drafts are stale, run the narrowest refresh command first (`node src/index.js update foundation --person <id>`, then `node src/index.js update foundation --stale`, then `node src/index.js update foundation --all` only when needed).
7. Re-run the tightest relevant tests first:
   - `node --import tsx --test tests/foundation-rollup.test.js`
   - `node --import tsx --test tests/readme-docs.test.js`
   - `node --import tsx --test tests/work-loop.test.ts`
8. Re-run `npm test` and `npm run typecheck` before reporting progress.

## Notes
- Prefer the machine-readable summary fields over re-parsing prompt text when both are available.
- Keep draft provenance visible: `latestMaterialAt`, `latestMaterialId`, and `latestMaterialSourcePath` should stay aligned across summaries, work-loop priorities, and generated drafts.
- Keep duplicate-root context aligned too: `shadowPaths` / `shadowPathSamplePaths` should stay consistent between `foundation.core`, `profileSnapshots`, and any surfaced work-loop priority.
- Even when foundation is already `ready`, keep the same root-heading compatibility metadata visible on `workLoop.leadingPriority`: preserve aggregated `rootHeadingAliases` from memory / skills / soul / voice so legacy root headings stay inspectable even before a repo-core repair is queued.
- When a repo-core repair is queued, keep the inspectable shadow docs attached to the same actionable surfaces too: `recommendedPaths`, queued-area `paths`, and work-loop `editPaths` / `paths` should append the relevant shadow docs after the canonical root file instead of hiding them in a separate field.
- Even when foundation is already `ready`, keep the same shadow-doc metadata visible on `workLoop.leadingPriority`: expose `shadowPaths`, `shadowPathCount`, `shadowPathSamplePaths`, and `shadowPathOverflowCount`, and make sure ready-state `editPaths` / `paths` still include the canonical root docs plus any shadow docs in stable order.
- When stale profile refreshes are present, keep `draftSourcesSummary`, `draftGapSummary`, and `latestMaterialSourcePath` visible together so the newest backing artifact and the thinnest draft layer stay inspectable from one summary surface.
- Treat `memory`, `skills`, `soul`, and `voice` as separate layers; do not collapse repairs across them without checking the reported gaps.

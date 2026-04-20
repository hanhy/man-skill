---
name: providers/minimax
description: Use when wiring or reviewing the checked-in Minimax provider runtime helper for chat request shaping and response normalization.
---

# Minimax provider skill

Use this skill when extending or validating the checked-in provider slice in `src/models/minimax.js`.

## What this skill is for
- reviewing provider scaffold metadata against the runtime helper and manifest entry
- keeping default-model, modality, and feature metadata aligned with the implementation
- verifying auth requirements and helper commands for `MINIMAX_API_KEY`
- checking request-shaping behavior for the checked-in Minimax chat helper

## Suggested workflow
1. Confirm the provider scaffold metadata still matches `manifests/providers.json` and `src/models/minimax.js`.
2. Verify the default model and advertised model list still reflect the checked-in helper.
3. Check modality and feature flags so delivery summaries stay truthful about the available Minimax chat surface.
4. Confirm auth/bootstrap helper commands still point operators at `.env.example` and `MINIMAX_API_KEY`.
5. Run the focused provider/runtime tests before the broader suite.

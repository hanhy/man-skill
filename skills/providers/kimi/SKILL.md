---
name: providers/kimi
description: Use when wiring or reviewing the checked-in Kimi provider runtime helper for long-context Moonshot chat requests.
---

# Kimi provider skill

Use this skill when extending or validating the checked-in provider slice in `src/models/kimi.js`.

## What this skill is for
- reviewing provider scaffold metadata against the runtime helper and manifest entry
- keeping default-model, modality, and feature metadata aligned with the implementation
- verifying auth requirements and helper commands for `KIMI_API_KEY`
- checking request-shaping behavior for Moonshot long-context chat and tool surfaces

## Suggested workflow
1. Confirm the provider scaffold metadata still matches `manifests/providers.json` and `src/models/kimi.js`.
2. Verify the default model and advertised model list still reflect the checked-in helper.
3. Check modality and feature flags so delivery summaries stay truthful about chat, tools, and long-context support.
4. Confirm auth/bootstrap helper commands still point operators at `.env.example` and `KIMI_API_KEY`.
5. Run the focused provider/runtime tests before the broader suite.

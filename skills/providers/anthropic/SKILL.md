---
name: providers/anthropic
description: Use when wiring or reviewing the checked-in Anthropic provider runtime helper for long-context, tool-aware, and vision-capable message requests.
---

# Anthropic provider skill

Use this skill when extending or validating the checked-in provider slice in `src/models/anthropic.js`.

## What this skill is for
- reviewing provider scaffold metadata against the runtime helper and manifest entry
- keeping default-model, modality, and feature metadata aligned with the implementation
- verifying auth requirements and helper commands for `ANTHROPIC_API_KEY`
- checking request-shaping behavior for tool-aware, long-context, and vision-capable message flows

## Suggested workflow
1. Confirm the provider scaffold metadata still matches `manifests/providers.json` and `src/models/anthropic.js`.
2. Verify the default model and advertised model list still reflect the checked-in helper.
3. Check modality and feature flags so delivery summaries stay truthful about chat, tools, long-context, and vision support.
4. Confirm auth/bootstrap helper commands still point operators at `.env.example` and `ANTHROPIC_API_KEY`.
5. Run the focused provider/runtime tests before the broader suite.

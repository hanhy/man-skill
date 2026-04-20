---
name: channels/feishu
description: Use when wiring or reviewing the checked-in Feishu channel runtime helper for rich-post normalization, webhook verification, and bot replies.
---

# Feishu channel skill

Use this skill when extending or validating the checked-in Feishu delivery slice in `src/channels/feishu.js`.

## What this skill is for
- reviewing Feishu delivery metadata against the runtime helper and manifest entry
- normalizing inbound event payloads, including object and rich-post message content
- building webhook verification responses and outbound bot message payloads
- keeping Feishu auth requirements and inbound path metadata visible in delivery summaries

## Suggested workflow
1. Confirm the Feishu scaffold metadata still matches `manifests/channels.json` and `src/channels/feishu.js`.
2. Exercise inbound normalization with plain-text and rich-post payloads across locale fallbacks.
3. Verify webhook verification handling still returns the expected challenge response.
4. Check outbound bot message helpers preserve conversation, thread, and text metadata.
5. Run the focused Feishu delivery tests before the broader suite.

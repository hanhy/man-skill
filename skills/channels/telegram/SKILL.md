---
name: channels/telegram
description: Use when wiring or reviewing the checked-in Telegram channel runtime helper for webhook/polling events and outbound replies.
---

# Telegram channel skill

Use this skill when extending or validating the checked-in Telegram delivery slice in `src/channels/telegram.js`.

## What this skill is for
- reviewing Telegram delivery metadata against the runtime helper and manifest entry
- normalizing inbound update payloads into the repo's compact channel event shape
- building outbound chat replies with stable chat and thread metadata
- keeping Telegram auth requirements and webhook paths visible in delivery summaries

## Suggested workflow
1. Confirm the Telegram scaffold metadata still matches `manifests/channels.json` and `src/channels/telegram.js`.
2. Exercise inbound update normalization with representative message and callback-style payloads.
3. Verify outbound reply helpers preserve chat id, optional thread context, and reply text.
4. Check webhook/polling mode hints stay aligned with the runtime helper exports.
5. Run the focused Telegram delivery tests before the broader suite.

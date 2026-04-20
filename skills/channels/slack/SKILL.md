---
name: channels/slack
description: Use when wiring or reviewing the checked-in Slack channel runtime helper for threaded replies and event normalization.
---

# Slack channel skill

Use this skill when extending or validating the checked-in Slack delivery slice in `src/channels/slack.js`.

## What this skill is for
- reviewing Slack delivery metadata against the runtime helper
- normalizing inbound Events API payloads into the repo's compact channel event shape
- building outbound thread replies and URL verification responses
- keeping Slack auth requirements visible in delivery summaries and helper commands

## Suggested workflow
1. Confirm the scaffold metadata still matches `manifests/channels.json` and `src/channels/slack.js`.
2. Exercise `normalizeSlackInboundEvent(...)` with representative event payloads, including thread replies and top-level messages.
3. Verify `buildSlackWebhookResponse(...)` still handles URL verification challenges.
4. Verify `buildSlackThreadReply(...)` preserves `channel`, `thread_ts`, reply text, and broadcast behavior.
5. Run the narrow delivery tests before the full suite.

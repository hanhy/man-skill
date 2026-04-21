---
name: channels/whatsapp
description: Use when wiring or reviewing the checked-in WhatsApp channel runtime helper for webhook verification, inbound normalization, and session sends.
---

# WhatsApp channel skill

Use this skill when extending or validating the checked-in WhatsApp delivery slice in `src/channels/whatsapp.js`.

## What this skill is for
- reviewing WhatsApp delivery metadata against the runtime helper and manifest entry
- normalizing inbound Cloud API webhook payloads, including interactive replies and media captions
- building webhook verification responses and outbound session-send payloads
- keeping WhatsApp auth requirements and phone metadata visible in delivery summaries

## Suggested workflow
1. Confirm the WhatsApp scaffold metadata still matches `manifests/channels.json` and `src/channels/whatsapp.js`.
2. Exercise inbound normalization with plain text, interactive reply, and media-caption payloads.
3. Verify webhook verification handling still echoes the `hub.challenge` contract.
4. Check outbound session-send helpers preserve the configured phone number id, recipient, and message body.
5. Run the focused WhatsApp delivery tests before the broader suite.

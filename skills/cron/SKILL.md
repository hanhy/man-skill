---
name: cron
description: Use when scheduling a reminder or recurring task via the local system cron/launchd setup for OpenClaw workflows.
---

# Cron Skill

Use this skill when the user asks for delayed reminders, recurring reminders, or automatic scheduled follow-ups.

## What this skill is for

- one-off reminders
- recurring reminders
- lightweight scheduled pings back to the user

## Notes

- On macOS, prefer `launchd` for durable scheduling.
- For simple prototyping, cron-style scheduling may still be discussed, but use the host's supported scheduler.
- Confirm the exact message text, destination, and timing when they are ambiguous.
- Be careful with duplicate schedules.
- Record what was scheduled in workspace memory if it matters.

## Suggested workflow

1. Identify whether the reminder is one-off or recurring.
2. Inspect what scheduler/runtime support already exists in the local OpenClaw setup.
3. Create or update the scheduler entry.
4. Verify it was installed.
5. Tell the user what was scheduled.

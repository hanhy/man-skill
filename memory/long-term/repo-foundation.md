# Repo foundation notes

- ManSkill is organized around four durable identity layers: memory, skills, soul, and voice.
- The project favors inspectable plain files and compact summaries over opaque hidden state.
- Target-person ingestion should stay user-facing: bootstrap with `update profile`, add materials with `import ...` or `import manifest`, then regenerate drafts with `--refresh-foundation` or `update foundation`.
- Delivery expansion currently targets four chat channels: Slack, Telegram, WhatsApp, and Feishu.
- Provider expansion currently targets six model backends: OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen.
- Changes should land in small verified slices so the repo remains reviewable between cron runs.

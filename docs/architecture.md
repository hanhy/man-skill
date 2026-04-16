# man-skill architecture

## Purpose

ManSkill is a lightweight framework for constructing a person-like AI agent from compact text inputs.

The project aims to keep personal-agent construction simple:
- describe a person
- provide representative samples
- preserve durable memories
- define reusable skills
- shape a stable soul and voice
- deliver the result through multiple channels and model providers

## Core layers

1. **Soul**
   - persistent personality guidance
   - values, boundaries, and behavioral stance

2. **Voice**
   - expression layer
   - wording, rhythm, humor, directness, multilingual traits

3. **Memory**
   - short-term, long-term, and scratch stores
   - curated identity facts, preferences, habits, and dated logs

4. **Skills**
   - task-specific capabilities and reusable prompt modules
   - procedural knowledge that can be reused across sessions

5. **Channels**
   - delivery adapters for chat platforms
   - initial targets: Slack, Telegram, WhatsApp, Feishu

6. **Models**
   - provider abstraction over multiple LLM backends
   - initial targets: OpenAI, Anthropic, Kimi, Minimax, GLM, Qwen

## Current modules

- `src/core/agent-profile.js`
- `src/core/memory-store.js`
- `src/core/skill-registry.js`
- `src/core/voice-profile.js`
- `src/core/channel-registry.js`
- `src/core/model-registry.js`
- `src/core/fs-loader.js`
- `src/core/prompt-assembler.js`
- `src/runtime/work-loop.js`

## Current behavior

- load soul from `SOUL.md`
- load voice guidance from `voice/README.md`
- load memory index from `memory/`
- discover local skill folders from `skills/`
- summarize per-profile material counts plus foundation-readiness signals for memory / voice / soul / skills
- expose planned channel/provider registries from manifests and factories
- assemble a prompt preview from profile, soul, voice, memory, and skills

## Staged development sequence

### Phase 1 — foundation
- replace placeholder identity content
- make memory / skills / soul / voice roles explicit
- add basic validation and smoke checks

### Phase 2 — richer core structures
- formalize file conventions and schemas
- enrich prompt assembly with better summaries
- add examples and templates for a real user profile

### Phase 3 — channels
- add adapter skeletons and docs for Slack, Telegram, Feishu, and WhatsApp

### Phase 4 — model providers
- add provider skeletons and docs for OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen

### Phase 5 — runtime and packaging
- improve the work loop
- add better inspection commands and tests
- document end-to-end usage

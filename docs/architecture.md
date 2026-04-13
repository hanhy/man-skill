# man-skill architecture

## Core layers

1. **Soul**
   - persistent personality guidance
   - values, boundaries, and behavioral style

2. **Voice**
   - expression layer
   - wording, rhythm, humor, directness, multilingual traits

3. **Memory**
   - short-term and long-term stores
   - curated identity facts, preferences, habits, and event logs

4. **Skills**
   - task-specific capabilities and reusable prompt modules

5. **Channels**
   - delivery adapters for chat platforms

6. **Models**
   - provider abstraction over multiple LLM backends

## Development sequence

- Phase 1: core data model
- Phase 2: local profile loading and prompt assembly
- Phase 3: channel adapters
- Phase 4: model provider adapters
- Phase 5: loop, testing, and packaging

# man-skill

> A lightweight framework for building a person-like AI agent from **memory + skills + soul + voice**.

`man-skill` is aimed at a practical goal: let a user define a target person, add a small set of representative materials, and progressively shape an AI that speaks in a more faithful, stable, and useful way.

---

## At a glance

### What it tries to do
- imitate one specific person's tone and phrasing
- preserve recurring preferences, habits, and quirks
- make persona building practical for normal users
- grow from raw materials into a reusable agent profile

### What it is **not** trying to do
- perfect identity cloning
- heavy training pipelines
- mandatory fine-tuning before it becomes useful

### Current development focus
1. strengthen the foundation around **memory / skills / soul / voice**
2. improve the **material ingestion entrance**
3. expand channels and model providers

### Development rule
- use **TypeScript-first** for new and migrated runtime code
- keep thin `.js` compatibility shims only when the CLI/package entrypoint still needs them

---

## Quick example

```bash
node src/index.js import text --person harry-han --file ./samples/harry-post.txt
node src/index.js import message --person harry-han --text "I’ll be there in 10 minutes."
node src/index.js import screenshot --person harry-han --file ./screenshots/chat.png --refresh-foundation
node src/index.js --help
node src/index.js import sample
node src/index.js import manifest --file ./samples/harry-materials.json --refresh-foundation
node src/index.js update intake --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --display-name "Harry Han" --summary "Direct operator with a bias for momentum."
node src/index.js update profile --person harry-han --summary "Direct operator with a bias for fast feedback loops." --refresh-foundation
node src/index.js update foundation --person harry-han
node src/index.js update foundation --stale
node src/index.js update foundation --all
node src/index.js update intake --imported
node src/index.js import intake --imported
node src/index.js import intake --imported --refresh-foundation
node src/index.js
```

This creates a profile-specific material structure under `profiles/<person-id>/` and exposes a repo summary that can later feed the learning/update layer.

The current operator-facing entrance is:
- seed or edit target metadata with `update profile`
- scaffold a profile-local intake landing zone with `update intake`
- backfill missing intake landing zones for already-imported profiles with `update intake --imported`
- import checked-in starter material with `import sample`
- import profile-local intake manifests with `import intake --person <id>`
- bulk-import only first-run metadata-only intake manifests with `import intake --stale --refresh-foundation`
- bulk-import only already-imported profile-local intake manifests with `import intake --imported`
- re-run imported intake replay with `import intake --imported --refresh-foundation` when you want the same pass to regenerate derived memory / voice / soul / skills drafts
- regenerate derived memory / voice / soul / skills drafts with `--refresh-foundation`, `update foundation --person <id>`, or `update foundation --stale`

`update intake` writes `profiles/<person-id>/imports/README.md`, `sample.txt`, and `materials.template.json` so a fresh target profile immediately has an obvious place for user-supplied materials before anything is imported. That scaffold includes per-type `entryTemplates`, direct `import text|message|talk|screenshot` command hints, and higher-level rerun shortcuts for `update intake`, `import intake`, and metadata sync. One-off imports and manifest/sample imports now keep that same profile-local intake scaffold present automatically, so the entrance stays discoverable even after the first materials have already landed.

Re-running `update intake` preserves starter `entries[]`, customized `entryTemplates`, and the README's managed `Custom notes` block while still syncing generated commands plus top-level display name and summary metadata. If `materials.template.json` was edited into invalid JSON, the repair pass now snapshots the broken file to `materials.template.json.invalid-<timestamp>.bak` and returns `invalidStarterManifestBackupPath` in the CLI result before rebuilding the starter manifest, so operators can recover the last draft instead of losing it during intake repair. The repo also ships a starter manifest at `samples/harry-materials.json` plus checked-in sample assets, so there is a one-command bootstrap path via `node src/index.js import sample` as well as explicit sample helper commands in the summary/prompt preview.

`node src/index.js --help` now prints a concise operator-facing usage guide instead of dumping the full summary JSON, and invalid CLI invocations fail with a short usage hint rather than a raw stack trace. The summary keeps advertising the richer ingestion helper bundles, including invalid-intake repair helpers, batch metadata sync helpers, the sample manifest's typed entry mix, and keyed non-text sample helpers (`sample-message`, `sample-talk`, `sample-screenshot`), so operators can see which starter profiles, repair paths, and assets are covered before importing them.

## Delivery foundation

The repo now also carries a delivery layer for chat surfaces and model backends. The default channel catalog covers Slack, Telegram, WhatsApp, and Feishu, while the default provider catalog covers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen. The checked-in channel/provider modules now expose concrete runtime helpers, so the summary can distinguish three different states: missing files, scaffold-only files, and runtime-ready integrations that are still waiting on auth/configuration before they can serve traffic.

Per-repo rollout can override or extend those defaults through `manifests/channels.json` and `manifests/providers.json`. The summary/prompt preview keeps those manifest diagnostics, runtime-readiness counts, `.env.example` bootstrap hints, auth-readiness gaps, and next scaffold commands visible so the delivery backlog stays operator-facing instead of hidden in raw files.

## Foundation contract

The repo-level foundation is intentionally OpenClaw-like: `memory/`, `skills/`, `SOUL.md`, and `voice/README.md` are treated as durable operator-facing surfaces, not just passive notes.

The current structured contract is:
- `memory/README.md` explains `## What belongs here` and `## Buckets`
- `skills/README.md` explains `## What lives here` and `## Layout`
- `SOUL.md` captures `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`
- `voice/README.md` captures `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`

`buildSummary(...)` and the work loop use those sections directly. When a root doc is missing or thin, the prompt preview surfaces the exact missing sections plus a runnable repair command; when all four repo-core layers are ready, that same block collapses to one compact `ready details` line so cron/operator runs keep the foundation visible without wasting preview budget before moving on to ingestion, channels, or providers.

Those section-aware surfaces are also explicit in JSON: `foundation.core.memory.rootReadySections`, `rootMissingSections`, `rootReadySectionCount`, and `rootTotalSectionCount`; `foundation.core.skills.rootReadySections`, `rootMissingSections`, `rootReadySectionCount`, and `rootTotalSectionCount`; plus `foundation.core.soul.readySections`, `missingSections`, `readySectionCount`, `totalSectionCount` and the parallel `foundation.core.voice.readySections`, `missingSections`, `readySectionCount`, `totalSectionCount`. That keeps both fully ready and partially structured foundation docs inspectable without reopening the markdown files.

The summary now also exposes canonical repair/refresh entrances instead of forcing downstream tooling to guess from queue order:
- `foundation.core.maintenance.recommendedArea`, `recommendedAction`, `recommendedCommand`, and `recommendedPaths` point at the next repo-core memory/skills/soul/voice repair
- `foundation.maintenance.recommendedProfileId`, `recommendedAction`, `recommendedCommand`, and `recommendedPaths` point at the next target-profile draft refresh
- the prompt preview mirrors those as `next repair` and `next refresh` lines, so the same OpenClaw-like foundation contract stays actionable from both JSON and operator-facing text

---

## English

### Core idea

Give the model:
- a compact description of one person
- a few representative text or conversation samples
- repeated preferences and behavior patterns

Then keep updating that profile so the model can stay more faithful over time.

### Practical imitation means
- similar tone
- similar phrasing
- similar values and preferences
- similar speaking rhythm
- similar recurring habits or quirks

### Good use cases
- a personal assistant with a strong voice
- a stable character or persona system
- a text-first digital twin prototype
- a simple user-facing workflow for person imitation

### Basic approach
1. describe who the person is
2. add representative materials
3. summarize repeated traits and preferences
4. ask the model to stay faithful to that voice
5. keep updating the profile as you learn more

### Design principle
The system should be simple enough that someone can imitate a single person with only some text and lightweight structure, without needing a large pipeline.

---

## 中文

### 核心想法

给模型这些东西：
- 一个对目标人物的紧凑描述
- 一些有代表性的文本或对话样本
- 重复出现的偏好、习惯和表达模式

然后持续更新这个人物档案，让模型随着材料增加，越来越稳定地接近这个人的风格。

### 这里追求的是“实用模仿”
- 语气接近
- 用词接近
- 价值取向和偏好接近
- 说话节奏接近
- 一些固定习惯和小特点接近

### 适合的方向
- 做一个有明确个人风格的助手
- 保持角色或人格设定的一致性
- 只靠文本原型化一个数字分身
- 给普通用户提供更容易上手的人物模仿流程

### 基本方法
1. 描述这个人是谁
2. 添加有代表性的材料
3. 总结反复出现的性格、偏好和表达模式
4. 要求模型持续忠于这种声音
5. 随着了解加深，不断更新人物档案

### 设计原则
这个系统应该足够轻量，让任何人只靠一些文本和少量结构化信息，就能开始构建一个针对具体人物的 AI，而不需要复杂流程或重训练。

---

## Project shape

- `src/core/` — foundation pieces like profile, memory, prompt assembly, ingestion
- `profiles/` — target-person profile data and imported materials
- `docs/` — architecture and ingestion notes
- `memory/`, `skills/`, `soul/`, `voice/` — long-term building blocks

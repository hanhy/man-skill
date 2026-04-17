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
node src/index.js
```

This creates a profile-specific material structure under `profiles/<person-id>/` and exposes a repo summary that can later feed the learning/update layer. You can seed target-person metadata with `update profile`, bootstrap a profile-local intake scaffold with `update intake`, via a manifest `profiles` block, or via the single-target manifest shorthand, then regenerate derived memory / voice / soul / skills drafts with `--refresh-foundation` or `update foundation --stale`. The new `update intake` command writes `profiles/<person-id>/imports/README.md`, `sample.txt`, and `materials.template.json` so a fresh target profile immediately has an obvious landing zone for user-supplied materials before anything is imported, and that scaffold now includes per-type `entryTemplates` plus direct `import text|message|talk|screenshot` command hints so the first intake step is copy-pasteable. Re-running `update intake` now preserves any starter `entries[]`, customized `entryTemplates`, and the README's managed `Custom notes` block while still syncing the generated commands plus top-level display name and summary metadata. The repo ships a starter manifest at `samples/harry-materials.json` plus a checked-in text sample at `samples/harry-post.txt`, so there is now also a one-command bootstrap path via `node src/index.js import sample`. `node src/index.js --help` now prints a concise operator-facing usage guide instead of dumping the full summary JSON, and invalid CLI invocations fail with a short usage hint rather than a raw stack trace. The summary keeps advertising the richer `sampleManifestCommand` / `sampleTextCommand` follow-ups, and now also includes the sample manifest's typed entry mix plus any available manifest display labels so operators can see at a glance which named starter profiles the checked-in bundle covers before importing it. The shorter starter command still gives the work loop and a first-time operator a compact entrypoint for loading the checked-in example profile and refreshing its first-pass drafts in one step, while empty repos now default their bootstrap command to `update intake` instead of a bare metadata edit. Manifest imports still return actionable `profileSummaries`, and the top-level `ingestion` block stays visible even in empty repos so the import/update entrance remains obvious. The repo summary also exposes per-profile draft freshness, a repo-level `foundation` rollup, `foundation.core` diagnostics that point back to concrete source files, and a compact `Work loop:` block so cron-style runs can see the current priority, command, and file paths without re-reading the raw JSON summary. Delivery priorities in that same work loop now carry both the relevant manifest path (`manifests/channels.json` or `manifests/providers.json`) and the first scaffold ... [truncated]

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

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSummary } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
const architectureDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'architecture.md'), 'utf8');
const ingestionDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'ingestion.md'), 'utf8');
const memoryDoc = fs.readFileSync(path.join(repoRoot, 'memory', 'README.md'), 'utf8');
const skillsDoc = fs.readFileSync(path.join(repoRoot, 'skills', 'README.md'), 'utf8');
const soulDoc = fs.readFileSync(path.join(repoRoot, 'SOUL.md'), 'utf8');
const voiceDoc = fs.readFileSync(path.join(repoRoot, 'voice', 'README.md'), 'utf8');
const userDoc = fs.readFileSync(path.join(repoRoot, 'USER.md'), 'utf8');

test('README documents the default delivery foundation targets and repo manifests', () => {
  assert.match(readme, /Delivery foundation/i);
  assert.match(readme, /Slack, Telegram, WhatsApp, and Feishu/);
  assert.match(readme, /OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen/);
  assert.match(readme, /runtime-ready integrations that are still waiting on auth\/configuration/i);
  assert.match(readme, /\.env\.example/);
  assert.match(readme, /manifests\/channels\.json/);
  assert.match(readme, /manifests\/providers\.json/);
});

test('architecture and ingestion docs explain work-loop leader/blocker semantics and sample-manifest entrypoints', () => {
  assert.match(architectureDoc, /surfacing both `leadingPriority` \(the first item in order, even when it is already ready\) and the actionable `currentPriority`/);
  assert.match(architectureDoc, /split readiness counters \(`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`\)/);
  assert.match(architectureDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(architectureDoc, /shorter starter alias via `sampleStarterCommand`/);
  assert.match(ingestionDoc, /the top-level `workLoop` summary now also exposes both `leadingPriority` and `currentPriority`/);
  assert.match(ingestionDoc, /split readiness counters \(`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`\)/);
  assert.match(ingestionDoc, /metadata-only intake headline now treats `intakeReadyProfileCount` as `import-ready` coverage only/);
  assert.match(ingestionDoc, /blocked delivery priorities keep their exact env\/bootstrap command plus only the `\.env\.example` path visible/);
  assert.match(ingestionDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(ingestionDoc, /shorter `sampleStarterCommand` visible as the friendly starter shortcut/);
});

test('checked-in USER current product direction stays aligned with the default work-loop objectives', () => {
  assert.match(userDoc, /## Current product direction/);
  assert.match(userDoc, /1\. strengthen the OpenClaw-like foundation around memory, skills, soul, and voice/);
  assert.match(userDoc, /2\. improve the user-facing ingestion\/update entrance for target-person materials/);
  assert.match(userDoc, /3\. add chat channels Feishu, Telegram, WhatsApp, and Slack/);
  assert.match(userDoc, /4\. add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen/);

  const summary = buildSummary(repoRoot);
  assert.deepEqual(summary.workLoop.objectives, [
    'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
    'improve the user-facing ingestion/update entrance for target-person materials',
    'add chat channels Feishu, Telegram, WhatsApp, and Slack',
    'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
    'report progress in small verified increments',
  ]);
});

test('repo memory, skills, soul, and voice docs stay aligned with the structured foundation sections', () => {
  assert.match(readme, /Foundation contract/i);
  assert.match(readme, /OpenClaw-like/i);
  assert.match(readme, /memory\/README\.md.*What belongs here.*Buckets/i);
  assert.match(readme, /skills\/README\.md.*What lives here.*Layout/i);
  assert.match(readme, /SOUL\.md.*Core truths.*Boundaries.*Vibe.*Continuity/i);
  assert.match(readme, /voice\/README\.md.*Tone.*Signature moves.*Avoid.*Language hints/i);
  assert.match(readme, /prompt preview surfaces the exact missing sections plus a runnable repair command/i);
  assert.match(readme, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(readme, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(readme, /foundation\.core\.soul\.readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(readme, /foundation\.core\.voice\.readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(readme, /foundation\.core\.maintenance\.recommendedArea.*recommendedAction.*recommendedCommand.*recommendedPaths/i);
  assert.match(readme, /foundation\.maintenance\.recommendedProfileId.*recommendedAction.*recommendedCommand.*recommendedPaths/i);
  assert.match(readme, /next repair.*next refresh/i);
  assert.match(architectureDoc, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.soul.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.voice.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(architectureDoc, /checked-in root `SOUL\.md` stable on `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`/i);
  assert.match(architectureDoc, /checked-in root `voice\/README\.md` stable on `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`/i);
  assert.match(ingestionDoc, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.soul.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.voice.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(ingestionDoc, /checked-in root docs stay parser-aligned: `SOUL\.md` should keep `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`, while `voice\/README\.md` should keep `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`/i);

  assert.match(memoryDoc, /## What belongs here/);
  assert.match(memoryDoc, /## Buckets/);

  assert.match(skillsDoc, /## What lives here/);
  assert.match(skillsDoc, /## Layout/);
  assert.match(skillsDoc, /- <skill>\/SKILL\.md: per-skill workflow and guidance/);
  assert.match(skillsDoc, /- <category>\/<skill>\/SKILL\.md: grouped skill families for larger registries/);
  assert.match(skillsDoc, /- README\.md: shared conventions for the repo skills layer/);

  assert.match(soulDoc, /## Core truths/);
  assert.match(soulDoc, /## Boundaries/);
  assert.match(soulDoc, /## Vibe/);
  assert.match(soulDoc, /## Continuity/);

  assert.match(voiceDoc, /## Tone/);
  assert.match(voiceDoc, /## Signature moves/);
  assert.match(voiceDoc, /## Avoid/);
  assert.match(voiceDoc, /## Language hints/);

  const summary = buildSummary(repoRoot);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, []);
  assert.deepEqual(summary.foundation.core.overview.missingAreas, []);
  assert.deepEqual(summary.foundation.core.memory.rootReadySections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, []);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.equal(summary.foundation.core.skills.count, 11);
  assert.deepEqual(summary.skills.skills.map((skill) => skill.id), [
    'channels/feishu',
    'channels/slack',
    'channels/telegram',
    'channels/whatsapp',
    'cron',
    'providers/anthropic',
    'providers/glm',
    'providers/kimi',
    'providers/minimax',
    'providers/openai',
    'providers/qwen',
  ]);
  assert.equal(summary.foundation.core.soul.readySectionCount, 4);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.match(summary.promptPreview, /Core foundation:\n- coverage: 4\/4 ready\n- queue: 4 ready, 0 thin, 0 missing\n- ready details: memory buckets 3\/3 \(daily, long-term, scratch\), root sections 2\/2; skills docs 11\/11 \(channels\/feishu, channels\/slack, channels\/telegram, channels\/whatsapp, cron\), root sections 2\/2; soul sections 4\/4; voice sections 4\/4/);
  assert.doesNotMatch(summary.promptPreview, /- memory: README yes, daily 1, long-term 1, scratch 1/);
  assert.doesNotMatch(summary.promptPreview, /- skills: 11 registered, 11 documented/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 11\n- discovered: 11\n- custom: 0\n- top skills: channels\/feishu \[discovered\]: Use when wiring or reviewing the checked-in Feishu channel runtime helper.*; channels\/slack \[discovered\]: Use when wiring or reviewing the checked-in Slack channel runtime helper.*; channels\/telegram \[discovered\]: Use when wiring or reviewing the checked-in Telegram channel runtime helper.*; \+8 more/);
});

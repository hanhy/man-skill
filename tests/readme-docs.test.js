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
  assert.match(ingestionDoc, /blocked delivery priorities keep their exact env\/bootstrap command plus `\.env\.example` path visible/);
  assert.match(ingestionDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(ingestionDoc, /shorter `sampleStarterCommand` visible as the friendly starter shortcut/);
});

test('repo memory, skills, soul, and voice docs stay aligned with the structured foundation sections', () => {
  assert.match(readme, /Foundation contract/i);
  assert.match(readme, /OpenClaw-like/i);
  assert.match(readme, /memory\/README\.md.*What belongs here.*Buckets/i);
  assert.match(readme, /skills\/README\.md.*What lives here.*Layout/i);
  assert.match(readme, /SOUL\.md.*Core truths.*Boundaries.*Vibe.*Continuity/i);
  assert.match(readme, /voice\/README\.md.*Tone.*Signature moves.*Avoid.*Language hints/i);
  assert.match(readme, /prompt preview surfaces the exact missing sections plus a runnable repair command/i);

  assert.match(memoryDoc, /## What belongs here/);
  assert.match(memoryDoc, /## Buckets/);

  assert.match(skillsDoc, /## What lives here/);
  assert.match(skillsDoc, /## Layout/);

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
  assert.equal(summary.foundation.core.soul.readySectionCount, 4);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.match(summary.promptPreview, /- memory: .* @ memory\/README\.md; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
  assert.match(summary.promptPreview, /- skills: .* @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\)/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- top skills: cron \[discovered\]: Use when scheduling a reminder or recurring task via the local system cron\/launchd setup for Op…/);
});

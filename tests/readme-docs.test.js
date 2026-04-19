import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSummary } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
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

test('repo memory, skills, soul, and voice docs stay aligned with the structured foundation sections', () => {
  assert.match(memoryDoc, /## What belongs here/);
  assert.match(memoryDoc, /## Buckets/);

  assert.match(skillsDoc, /## What lives here/);
  assert.match(skillsDoc, /## Layout/);

  assert.match(soulDoc, /## Core truths/);
  assert.match(soulDoc, /## Boundaries/);
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
  assert.equal(summary.foundation.core.soul.readySectionCount, 3);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.match(summary.promptPreview, /- memory: .*root sections 2\/2 ready \(what-belongs-here, buckets\)/);
  assert.match(summary.promptPreview, /- skills: .*root sections 2\/2 ready \(what-lives-here, layout\)/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- top skills: cron \[discovered\]: Use when scheduling a reminder or recurring task via the local system cron\/launchd setup for Op…/);
});

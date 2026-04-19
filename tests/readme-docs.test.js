import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSummary } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
const soulDoc = fs.readFileSync(path.join(repoRoot, 'SOUL.md'), 'utf8');
const voiceDoc = fs.readFileSync(path.join(repoRoot, 'voice', 'README.md'), 'utf8');

test('README documents the default delivery foundation targets and repo manifests', () => {
  assert.match(readme, /Delivery foundation/i);
  assert.match(readme, /Slack, Telegram, WhatsApp, and Feishu/);
  assert.match(readme, /OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen/);
  assert.match(readme, /manifests\/channels\.json/);
  assert.match(readme, /manifests\/providers\.json/);
});

test('repo soul and voice docs stay aligned with the structured foundation sections', () => {
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
  assert.equal(summary.foundation.core.soul.readySectionCount, 3);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
});

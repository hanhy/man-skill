import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSummary } from '../src/index.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-channel-provider-'));
}

function seedMinimalRepo(rootDir) {
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');
}

test('buildSummary exposes delivery metadata for default chat channels', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);

  const summary = buildSummary(rootDir);
  const slack = summary.channels.channels.find((channel) => channel.id === 'slack');
  const telegram = summary.channels.channels.find((channel) => channel.id === 'telegram');

  assert.deepEqual(slack.auth, {
    type: 'bot-token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
  });
  assert.deepEqual(slack.deliveryModes, ['events-api', 'web-api']);
  assert.deepEqual(telegram.auth, {
    type: 'bot-token',
    envVars: ['TELEGRAM_BOT_TOKEN'],
  });
  assert.deepEqual(telegram.deliveryModes, ['polling', 'webhook']);
});

test('buildSummary exposes capability metadata for default model providers', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);

  const summary = buildSummary(rootDir);
  const openai = summary.models.providers.find((provider) => provider.id === 'openai');
  const anthropic = summary.models.providers.find((provider) => provider.id === 'anthropic');

  assert.equal(openai.defaultModel, 'gpt-5');
  assert.equal(openai.authEnvVar, 'OPENAI_API_KEY');
  assert.deepEqual(openai.modalities, ['chat', 'reasoning', 'vision']);
  assert.equal(anthropic.defaultModel, 'claude-3.7-sonnet');
  assert.equal(anthropic.authEnvVar, 'ANTHROPIC_API_KEY');
  assert.deepEqual(anthropic.modalities, ['chat', 'long-context', 'vision']);
});

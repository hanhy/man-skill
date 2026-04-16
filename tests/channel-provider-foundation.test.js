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

test('buildSummary merges channel and provider manifests onto the default foundation metadata', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'manifests', 'channels.json'),
    JSON.stringify([
      {
        id: 'slack',
        status: 'active',
        capabilities: ['slash-commands'],
        auth: {
          type: 'bot-token',
        },
        direction: ['outbound'],
        deliveryModes: ['socket-mode'],
      },
      {
        id: 'discord',
        name: 'Discord',
        status: 'candidate',
        transport: 'chat',
        direction: ['inbound', 'outbound'],
        capabilities: ['gateway'],
        deliveryModes: ['gateway'],
      },
    ], null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'manifests', 'providers.json'),
    JSON.stringify([
      {
        id: 'openai',
        status: 'active',
        models: ['gpt-5-mini'],
        features: ['batch'],
        modalities: ['audio'],
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        status: 'candidate',
        models: ['deepseek-chat'],
        features: ['chat'],
        defaultModel: 'deepseek-chat',
        authEnvVar: 'DEEPSEEK_API_KEY',
        modalities: ['chat'],
      },
    ], null, 2),
  );

  const summary = buildSummary(rootDir);
  const slack = summary.channels.channels.find((channel) => channel.id === 'slack');
  const discord = summary.channels.channels.find((channel) => channel.id === 'discord');
  const openai = summary.models.providers.find((provider) => provider.id === 'openai');
  const deepseek = summary.models.providers.find((provider) => provider.id === 'deepseek');

  assert.equal(summary.channels.channelCount, 5);
  assert.equal(summary.models.providerCount, 7);
  assert.equal(slack.status, 'active');
  assert.deepEqual(slack.auth, {
    type: 'bot-token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
  });
  assert.deepEqual(slack.direction, ['inbound', 'outbound']);
  assert.deepEqual(slack.deliveryModes, ['events-api', 'web-api', 'socket-mode']);
  assert.deepEqual(slack.capabilities, ['threads', 'mentions', 'bot-token', 'slash-commands']);
  assert.equal(discord.status, 'candidate');
  assert.deepEqual(discord.deliveryModes, ['gateway']);
  assert.equal(openai.status, 'active');
  assert.equal(openai.authEnvVar, 'OPENAI_API_KEY');
  assert.deepEqual(openai.models, ['gpt-4.1', 'gpt-4o', 'gpt-5', 'gpt-5-mini']);
  assert.deepEqual(openai.features, ['chat', 'tools', 'reasoning', 'batch']);
  assert.deepEqual(openai.modalities, ['chat', 'reasoning', 'vision', 'audio']);
  assert.equal(deepseek.defaultModel, 'deepseek-chat');
  assert.equal(deepseek.authEnvVar, 'DEEPSEEK_API_KEY');
});

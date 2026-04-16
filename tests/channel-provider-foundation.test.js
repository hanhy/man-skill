import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSummary } from '../src/index.js';
import { ChannelRegistry as JsChannelRegistry } from '../src/core/channel-registry.js';
import { ModelRegistry as JsModelRegistry } from '../src/core/model-registry.js';

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
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=',
    'SLACK_SIGNING_SECRET=',
    'TELEGRAM_BOT_TOKEN=',
    'WHATSAPP_ACCESS_TOKEN=',
    'WHATSAPP_PHONE_NUMBER_ID=',
    'FEISHU_APP_ID=',
    'FEISHU_APP_SECRET=',
    'OPENAI_API_KEY=',
    'ANTHROPIC_API_KEY=',
    'KIMI_API_KEY=',
    'MINIMAX_API_KEY=',
    'GLM_API_KEY=',
    'QWEN_API_KEY=',
    '',
  ].join('\n'));
}

test('buildSummary exposes delivery metadata for default chat channels', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);

  const summary = buildSummary(rootDir);
  const slack = summary.channels.channels.find((channel) => channel.id === 'slack');
  const telegram = summary.channels.channels.find((channel) => channel.id === 'telegram');

  assert.equal(summary.channels.activeCount, 0);
  assert.equal(summary.channels.plannedCount, 4);
  assert.equal(summary.channels.candidateCount, 0);
  assert.deepEqual(summary.channels.authEnvVars, [
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'TELEGRAM_BOT_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ]);
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

  assert.equal(summary.models.activeCount, 0);
  assert.equal(summary.models.plannedCount, 6);
  assert.equal(summary.models.candidateCount, 0);
  assert.equal(summary.models.multimodalProviderCount, 5);
  assert.deepEqual(summary.models.authEnvVars, [
    'ANTHROPIC_API_KEY',
    'GLM_API_KEY',
    'KIMI_API_KEY',
    'MINIMAX_API_KEY',
    'OPENAI_API_KEY',
    'QWEN_API_KEY',
  ]);
  assert.equal(openai.defaultModel, 'gpt-5');
  assert.equal(openai.authEnvVar, 'OPENAI_API_KEY');
  assert.deepEqual(openai.modalities, ['chat', 'reasoning', 'vision']);
  assert.equal(anthropic.defaultModel, 'claude-3.7-sonnet');
  assert.equal(anthropic.authEnvVar, 'ANTHROPIC_API_KEY');
  assert.deepEqual(anthropic.modalities, ['chat', 'long-context', 'vision']);
});

test('buildSummary exposes a delivery setup queue and prompt preview includes setup hints', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  process.env.SLACK_SIGNING_SECRET = 'signing-secret';
  process.env.OPENAI_API_KEY = 'sk-test';

  try {
    const summary = buildSummary(rootDir);

    assert.equal(summary.delivery.pendingChannelCount, 4);
    assert.equal(summary.delivery.pendingProviderCount, 6);
    assert.equal(summary.delivery.configuredChannelCount, 1);
    assert.equal(summary.delivery.configuredProviderCount, 1);
    assert.deepEqual(summary.delivery.missingChannelEnvVars, [
      'FEISHU_APP_ID',
      'FEISHU_APP_SECRET',
      'TELEGRAM_BOT_TOKEN',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
    ]);
    assert.deepEqual(summary.delivery.missingProviderEnvVars, [
      'ANTHROPIC_API_KEY',
      'GLM_API_KEY',
      'KIMI_API_KEY',
      'MINIMAX_API_KEY',
      'QWEN_API_KEY',
    ]);
    assert.deepEqual(summary.delivery.requiredEnvVars, [
      'ANTHROPIC_API_KEY',
      'FEISHU_APP_ID',
      'FEISHU_APP_SECRET',
      'GLM_API_KEY',
      'KIMI_API_KEY',
      'MINIMAX_API_KEY',
      'OPENAI_API_KEY',
      'QWEN_API_KEY',
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET',
      'TELEGRAM_BOT_TOKEN',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
    ]);
    assert.equal(summary.delivery.channelManifestPath, 'manifests/channels.json');
    assert.equal(summary.delivery.providerManifestPath, 'manifests/providers.json');
    assert.equal(summary.delivery.envTemplatePath, '.env.example');
    assert.equal(summary.delivery.envTemplatePresent, true);
    assert.equal(summary.delivery.envTemplateCommand, 'cp .env.example .env');
    assert.deepEqual(summary.delivery.channelQueue[0], {
      id: 'slack',
      name: 'Slack',
      status: 'planned',
      authEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
      deliveryModes: ['events-api', 'web-api'],
      configured: true,
      missingEnvVars: [],
      manifestPath: 'manifests/channels.json',
      setupHint: 'credentials present',
    });
    assert.deepEqual(summary.delivery.providerQueue[0], {
      id: 'openai',
      name: 'OpenAI',
      status: 'planned',
      defaultModel: 'gpt-5',
      authEnvVar: 'OPENAI_API_KEY',
      modalities: ['chat', 'reasoning', 'vision'],
      configured: true,
      missingEnvVars: [],
      manifestPath: 'manifests/providers.json',
      setupHint: 'auth configured for gpt-5',
    });
    assert.match(summary.promptPreview, /Delivery foundation:/);
    assert.match(summary.promptPreview, /channels: 4 total \(0 active, 4 planned, 0 candidate\)/);
    assert.match(summary.promptPreview, /env template: \.env\.example \(13 vars\)/);
    assert.match(summary.promptPreview, /env bootstrap: cp \.env\.example \.env/);
    assert.match(summary.promptPreview, /auth readiness: 1\/4 channels configured, 1\/6 providers configured/);
    assert.match(summary.promptPreview, /channel queue: 4 pending via manifests\/channels\.json/);
    assert.match(summary.promptPreview, /Slack \[planned, configured\]: credentials present via events-api\/web-api/);
    assert.match(summary.promptPreview, /models: 6 total \(0 active, 6 planned, 0 candidate\)/);
    assert.match(summary.promptPreview, /provider queue: 6 pending via manifests\/providers\.json/);
    assert.match(summary.promptPreview, /OpenAI \[planned, configured\]: auth configured for gpt-5 \{chat, reasoning, vision\}/);
  } finally {
    if (originalEnv.SLACK_BOT_TOKEN === undefined) {
      delete process.env.SLACK_BOT_TOKEN;
    } else {
      process.env.SLACK_BOT_TOKEN = originalEnv.SLACK_BOT_TOKEN;
    }

    if (originalEnv.SLACK_SIGNING_SECRET === undefined) {
      delete process.env.SLACK_SIGNING_SECRET;
    } else {
      process.env.SLACK_SIGNING_SECRET = originalEnv.SLACK_SIGNING_SECRET;
    }

    if (originalEnv.OPENAI_API_KEY === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
    }
  }
});

test('buildSummary prompt preview surfaces candidate delivery integrations from manifests', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'manifests', 'channels.json'),
    JSON.stringify([
      {
        id: 'slack',
        status: 'active',
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

  assert.equal(summary.channels.manifest.status, 'loaded');
  assert.equal(summary.channels.manifest.entryCount, 2);
  assert.equal(summary.channels.manifest.path, 'manifests/channels.json');
  assert.equal(summary.models.manifest.status, 'loaded');
  assert.equal(summary.models.manifest.entryCount, 2);
  assert.equal(summary.models.manifest.path, 'manifests/providers.json');
  assert.match(summary.promptPreview, /channels: 5 total \(1 active, 3 planned, 1 candidate\)/);
  assert.match(summary.promptPreview, /channel manifest: loaded 2 entries from manifests\/channels\.json/);
  assert.match(summary.promptPreview, /models: 7 total \(1 active, 5 planned, 1 candidate\)/);
  assert.match(summary.promptPreview, /provider manifest: loaded 2 entries from manifests\/providers\.json/);
});

test('buildSummary falls back to default delivery metadata when manifests are malformed', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), '{not-json');
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), '[1, 2');

  const summary = buildSummary(rootDir);

  assert.equal(summary.channels.channelCount, 4);
  assert.equal(summary.channels.manifest.status, 'invalid');
  assert.equal(summary.channels.manifest.entryCount, 0);
  assert.equal(summary.channels.manifest.path, 'manifests/channels.json');
  assert.match(summary.channels.manifest.error, /Unexpected token|Expected property name/);
  assert.equal(summary.models.providerCount, 6);
  assert.equal(summary.models.manifest.status, 'invalid');
  assert.equal(summary.models.manifest.entryCount, 0);
  assert.equal(summary.models.manifest.path, 'manifests/providers.json');
  assert.match(summary.models.manifest.error, /Unexpected end of JSON input|Expected ',' or '\]'/);
  assert.match(summary.promptPreview, /channel manifest: invalid .*manifests\/channels\.json/);
  assert.match(summary.promptPreview, /provider manifest: invalid .*manifests\/providers\.json/);
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
  assert.equal(summary.channels.activeCount, 1);
  assert.equal(summary.channels.plannedCount, 3);
  assert.equal(summary.channels.candidateCount, 1);
  assert.deepEqual(summary.channels.authEnvVars, [
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'TELEGRAM_BOT_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ]);
  assert.equal(summary.models.providerCount, 7);
  assert.equal(summary.models.activeCount, 1);
  assert.equal(summary.models.plannedCount, 5);
  assert.equal(summary.models.candidateCount, 1);
  assert.equal(summary.models.multimodalProviderCount, 5);
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

test('JS registry shims preserve merged channel and provider defaults', () => {
  const channels = new JsChannelRegistry([
    {
      id: 'slack',
      status: 'active',
      capabilities: ['slash-commands'],
      auth: { type: 'bot-token' },
      direction: ['outbound'],
      deliveryModes: ['socket-mode'],
    },
  ]).summary().channels;
  const providers = new JsModelRegistry([
    {
      id: 'openai',
      status: 'active',
      models: ['gpt-5-mini'],
      features: ['batch'],
      modalities: ['audio'],
    },
  ]).summary().providers;

  assert.deepEqual(channels, [
    {
      id: 'slack',
      name: 'Slack',
      transport: 'chat',
      direction: ['inbound', 'outbound'],
      status: 'active',
      capabilities: ['threads', 'mentions', 'bot-token', 'slash-commands'],
      auth: {
        type: 'bot-token',
        envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
      },
      deliveryModes: ['events-api', 'web-api', 'socket-mode'],
    },
  ]);
  assert.deepEqual(providers, [
    {
      id: 'openai',
      name: 'OpenAI',
      models: ['gpt-4.1', 'gpt-4o', 'gpt-5', 'gpt-5-mini'],
      status: 'active',
      features: ['chat', 'tools', 'reasoning', 'batch'],
      defaultModel: 'gpt-5',
      authEnvVar: 'OPENAI_API_KEY',
      modalities: ['chat', 'reasoning', 'vision', 'audio'],
    },
  ]);
});

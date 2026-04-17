import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSummary } from '../src/index.js';
import { ChannelRegistry as JsChannelRegistry } from '../src/core/channel-registry.js';
import { ModelRegistry as JsModelRegistry } from '../src/core/model-registry.js';
import { slackChannelScaffold } from '../src/channels/slack.js';
import { telegramChannelScaffold } from '../src/channels/telegram.js';
import { whatsappChannelScaffold } from '../src/channels/whatsapp.js';
import { feishuChannelScaffold } from '../src/channels/feishu.js';
import { openaiProviderScaffold } from '../src/models/openai.js';
import { anthropicProviderScaffold } from '../src/models/anthropic.js';
import { kimiProviderScaffold } from '../src/models/kimi.js';
import { minimaxProviderScaffold } from '../src/models/minimax.js';
import { glmProviderScaffold } from '../src/models/glm.js';
import { qwenProviderScaffold } from '../src/models/qwen.js';
import { ManifestLoader as JsManifestLoader } from '../src/core/manifest-loader.js';
import { ManifestLoader as TsManifestLoader } from '../src/core/manifest-loader.ts';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-channel-provider-'));
}

function seedMinimalRepo(rootDir) {
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'src', 'models'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');
  ['slack', 'telegram', 'whatsapp', 'feishu'].forEach((channelId) => {
    fs.writeFileSync(path.join(rootDir, 'src', 'channels', `${channelId}.js`), `export const channelId = '${channelId}';\n`);
  });
  ['openai', 'anthropic', 'kimi', 'minimax', 'glm', 'qwen'].forEach((providerId) => {
    fs.writeFileSync(path.join(rootDir, 'src', 'models', `${providerId}.js`), `export const providerId = '${providerId}';\n`);
  });
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

test('JS manifest loader shim stays aligned with the TypeScript implementation', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), '{not-json');
  fs.writeFileSync(
    path.join(rootDir, 'manifests', 'providers.json'),
    JSON.stringify([
      {
        id: 'openai',
        status: 'active',
      },
    ], null, 2),
  );

  const jsLoader = new JsManifestLoader(rootDir);
  const tsLoader = new TsManifestLoader(rootDir);

  assert.deepEqual(jsLoader.loadChannelManifestSummary(), tsLoader.loadChannelManifestSummary());
  assert.deepEqual(jsLoader.loadProviderManifestSummary(), tsLoader.loadProviderManifestSummary());
  assert.deepEqual(jsLoader.loadChannelManifest(), tsLoader.loadChannelManifest());
  assert.deepEqual(jsLoader.loadProviderManifest(), tsLoader.loadProviderManifest());
});

test('default channel and provider scaffold modules stay aligned with registry metadata', () => {
  const channelScaffolds = [
    slackChannelScaffold,
    telegramChannelScaffold,
    whatsappChannelScaffold,
    feishuChannelScaffold,
  ];
  const providerScaffolds = [
    openaiProviderScaffold,
    anthropicProviderScaffold,
    kimiProviderScaffold,
    minimaxProviderScaffold,
    glmProviderScaffold,
    qwenProviderScaffold,
  ];
  const channels = new JsChannelRegistry().summary().channels;
  const providers = new JsModelRegistry().summary().providers;

  assert.equal(channelScaffolds.length, channels.length);
  assert.equal(providerScaffolds.length, providers.length);

  channelScaffolds.forEach((scaffold) => {
    const registryRecord = channels.find((channel) => channel.id === scaffold.id);
    assert.ok(registryRecord, `missing channel registry record for ${scaffold.id}`);
    assert.deepEqual(scaffold, {
      id: registryRecord.id,
      name: registryRecord.name,
      transport: registryRecord.transport,
      direction: registryRecord.direction,
      status: registryRecord.status,
      capabilities: registryRecord.capabilities,
      auth: registryRecord.auth,
      deliveryModes: registryRecord.deliveryModes,
      implementationPath: registryRecord.implementationPath,
      nextStep: registryRecord.nextStep,
    });
  });

  providerScaffolds.forEach((scaffold) => {
    const registryRecord = providers.find((provider) => provider.id === scaffold.id);
    assert.ok(registryRecord, `missing provider registry record for ${scaffold.id}`);
    assert.deepEqual(scaffold, {
      id: registryRecord.id,
      name: registryRecord.name,
      models: registryRecord.models,
      status: registryRecord.status,
      features: registryRecord.features,
      defaultModel: registryRecord.defaultModel,
      authEnvVar: registryRecord.authEnvVar,
      modalities: registryRecord.modalities,
      implementationPath: registryRecord.implementationPath,
      nextStep: registryRecord.nextStep,
    });
  });
});

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
  assert.equal(slack.implementationPath, 'src/channels/slack.js');
  assert.equal(slack.nextStep, 'implement inbound event handling and outbound thread replies');
  assert.deepEqual(telegram.auth, {
    type: 'bot-token',
    envVars: ['TELEGRAM_BOT_TOKEN'],
  });
  assert.deepEqual(telegram.deliveryModes, ['polling', 'webhook']);
  assert.equal(telegram.implementationPath, 'src/channels/telegram.js');
  assert.equal(telegram.nextStep, 'wire bot webhook intake and outbound chat sends');
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
  assert.equal(openai.implementationPath, 'src/models/openai.js');
  assert.equal(openai.nextStep, 'implement chat/tool request translation and response normalization');
  assert.equal(anthropic.defaultModel, 'claude-3.7-sonnet');
  assert.equal(anthropic.authEnvVar, 'ANTHROPIC_API_KEY');
  assert.deepEqual(anthropic.modalities, ['chat', 'long-context', 'vision']);
  assert.equal(anthropic.implementationPath, 'src/models/anthropic.js');
  assert.equal(anthropic.nextStep, 'implement messages api wrapper with long-context defaults');
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
    assert.deepEqual(summary.delivery.helperCommands, {
      bootstrapEnv: 'cp .env.example .env',
      scaffoldChannelManifest: "mkdir -p 'manifests' && touch 'manifests/channels.json'",
      scaffoldProviderManifest: "mkdir -p 'manifests' && touch 'manifests/providers.json'",
      scaffoldChannelImplementation: null,
      scaffoldChannelImplementationBundle: null,
      scaffoldProviderImplementation: null,
      scaffoldProviderImplementationBundle: null,
    });
    assert.deepEqual(summary.delivery.channelQueue[0], {
      id: 'slack',
      name: 'Slack',
      status: 'planned',
      authEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
      deliveryModes: ['events-api', 'web-api'],
      implementationPath: 'src/channels/slack.js',
      implementationPresent: true,
      implementationScaffoldPath: 'src/channels/slack.js',
      configured: true,
      missingEnvVars: [],
      manifestPath: 'manifests/channels.json',
      manifestPresent: false,
      manifestScaffoldPath: 'manifests/channels.json',
      setupHint: 'credentials present',
      nextStep: 'implement inbound event handling and outbound thread replies',
    });
    assert.deepEqual(summary.delivery.providerQueue[0], {
      id: 'openai',
      name: 'OpenAI',
      status: 'planned',
      defaultModel: 'gpt-5',
      authEnvVar: 'OPENAI_API_KEY',
      modalities: ['chat', 'reasoning', 'vision'],
      implementationPath: 'src/models/openai.js',
      implementationPresent: true,
      implementationScaffoldPath: 'src/models/openai.js',
      configured: true,
      missingEnvVars: [],
      manifestPath: 'manifests/providers.json',
      manifestPresent: false,
      manifestScaffoldPath: 'manifests/providers.json',
      setupHint: 'auth configured for gpt-5',
      nextStep: 'implement chat/tool request translation and response normalization',
    });
    assert.match(summary.promptPreview, /Delivery foundation:/);
    assert.match(summary.promptPreview, /channels: 4 total \(0 active, 4 planned, 0 candidate\)/);
    assert.match(summary.promptPreview, /env template: \.env\.example \(13 vars\)/);
    assert.match(summary.promptPreview, /env bootstrap: cp \.env\.example \.env/);
    assert.match(summary.promptPreview, /helpers: env cp \.env\.example \.env \| channels mkdir -p 'manifests' && touch 'manifests\/channels\.json' \| providers mkdir -p 'manifests' && touch 'manifests\/providers\.json'/);
    assert.match(summary.promptPreview, /auth readiness: 1\/4 channels configured, 1\/6 providers configured/);
    assert.match(summary.promptPreview, /channel queue: 4 pending via manifests\/channels\.json/);
    assert.match(summary.promptPreview, /Slack \[planned, configured\]: credentials present; next: implement inbound event handling and outbound thread replies via events-api\/web-api @ src\/channels\/slack\.js/);
    assert.match(summary.promptPreview, /\+3 more queued channels: Telegram, WhatsApp, Feishu/);
    assert.match(summary.promptPreview, /models: 6 total \(0 active, 6 planned, 0 candidate\)/);
    assert.match(summary.promptPreview, /provider queue: 6 pending via manifests\/providers\.json/);
    assert.match(summary.promptPreview, /OpenAI \[planned, configured\]: auth configured for gpt-5; next: implement chat\/tool request translation and response normalization \{chat, reasoning, vision\} @ src\/models\/openai\.js/);
    assert.match(summary.promptPreview, /\+5 more queued providers: Anthropic, Kimi, Minimax, GLM, Qwen/);
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

test('buildSummary exposes delivery helper commands for first missing implementation scaffolds', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([{ id: 'openai', status: 'planned' }], null, 2));
  fs.rmSync(path.join(rootDir, 'src', 'models', 'openai.js'));

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.delivery.helperCommands, {
    bootstrapEnv: 'cp .env.example .env',
    scaffoldChannelManifest: null,
    scaffoldProviderManifest: null,
    scaffoldChannelImplementation: null,
    scaffoldChannelImplementationBundle: null,
    scaffoldProviderImplementation: "mkdir -p 'src/models' && touch 'src/models/openai.js'",
    scaffoldProviderImplementationBundle: "mkdir -p 'src/models' && touch 'src/models/openai.js'",
  });
  assert.match(summary.promptPreview, /helpers: env cp \.env\.example \.env \| provider impl mkdir -p 'src\/models' && touch 'src\/models\/openai\.js'/);
});

test('buildSummary delivery helper commands skip scaffolded queue leaders and target the first missing provider implementation', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'planned' },
    { id: 'anthropic', status: 'planned' },
  ], null, 2));
  fs.rmSync(path.join(rootDir, 'src', 'models', 'anthropic.js'));

  const summary = buildSummary(rootDir);

  assert.equal(summary.delivery.providerQueue[0].implementationPresent, true);
  assert.equal(summary.delivery.providerQueue[1].implementationPresent, false);
  assert.equal(summary.delivery.helperCommands.scaffoldProviderImplementation, "mkdir -p 'src/models' && touch 'src/models/anthropic.js'");
  assert.equal(summary.delivery.helperCommands.scaffoldProviderImplementationBundle, "mkdir -p 'src/models' && touch 'src/models/anthropic.js'");
  assert.match(summary.promptPreview, /helpers: env cp \.env\.example \.env \| provider impl mkdir -p 'src\/models' && touch 'src\/models\/anthropic\.js'/);
});

test('buildSummary prompt preview surfaces delivery implementation bundles when multiple scaffolds are missing', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'planned' },
    { id: 'telegram', status: 'planned' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'planned' },
    { id: 'anthropic', status: 'planned' },
    { id: 'kimi', status: 'planned' },
  ], null, 2));
  fs.rmSync(path.join(rootDir, 'src', 'channels', 'slack.js'));
  fs.rmSync(path.join(rootDir, 'src', 'channels', 'telegram.js'));
  fs.rmSync(path.join(rootDir, 'src', 'models', 'anthropic.js'));
  fs.rmSync(path.join(rootDir, 'src', 'models', 'kimi.js'));

  const summary = buildSummary(rootDir);

  assert.equal(
    summary.delivery.helperCommands.scaffoldChannelImplementationBundle,
    "(mkdir -p 'src/channels' && touch 'src/channels/slack.js') && (mkdir -p 'src/channels' && touch 'src/channels/telegram.js')",
  );
  assert.equal(
    summary.delivery.helperCommands.scaffoldProviderImplementationBundle,
    "(mkdir -p 'src/models' && touch 'src/models/anthropic.js') && (mkdir -p 'src/models' && touch 'src/models/kimi.js')",
  );
  assert.match(summary.promptPreview, /channel impl-all \(mkdir -p 'src\/channels' && touch 'src\/channels\/slack\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/telegram\.js'\)/);
  assert.match(summary.promptPreview, /provider impl-all \(mkdir -p 'src\/models' && touch 'src\/models\/anthropic\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/kimi\.js'\)/);
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
        nextStep: 'add slash-command routing',
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
        nextStep: 'ship batch adapter',
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
  assert.equal(slack.nextStep, 'add slash-command routing');
  assert.equal(discord.status, 'candidate');
  assert.deepEqual(discord.deliveryModes, ['gateway']);
  assert.equal(openai.status, 'active');
  assert.equal(openai.authEnvVar, 'OPENAI_API_KEY');
  assert.deepEqual(openai.models, ['gpt-4.1', 'gpt-4o', 'gpt-5', 'gpt-5-mini']);
  assert.deepEqual(openai.features, ['chat', 'tools', 'reasoning', 'batch']);
  assert.deepEqual(openai.modalities, ['chat', 'reasoning', 'vision', 'audio']);
  assert.equal(openai.nextStep, 'ship batch adapter');
  assert.equal(deepseek.defaultModel, 'deepseek-chat');
  assert.equal(deepseek.authEnvVar, 'DEEPSEEK_API_KEY');
});

test('buildSummary keeps scaffold coverage global and ignores manifest implementation paths outside the repo root', () => {
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
        implementationPath: '../outside-channel.js',
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
        implementationPath: '../outside-provider.js',
      },
    ], null, 2),
  );

  const summary = buildSummary(rootDir);
  const discordQueueItem = summary.delivery.channelQueue.find((channel) => channel.id === 'discord');
  const deepseekQueueItem = summary.delivery.providerQueue.find((provider) => provider.id === 'deepseek');

  assert.equal(summary.delivery.readyChannelScaffoldCount, 4);
  assert.equal(summary.delivery.readyProviderScaffoldCount, 6);
  assert.equal(summary.delivery.missingChannelScaffoldCount, 1);
  assert.equal(summary.delivery.missingProviderScaffoldCount, 1);
  assert.equal(discordQueueItem.implementationPresent, false);
  assert.equal(discordQueueItem.implementationScaffoldPath, null);
  assert.equal(deepseekQueueItem.implementationPresent, false);
  assert.equal(deepseekQueueItem.implementationScaffoldPath, null);
  assert.match(summary.promptPreview, /code scaffolds: 4\/5 channels, 6\/7 providers present/);
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
      nextStep: 'ship slash-command routing',
    },
  ]).summary().channels;
  const providers = new JsModelRegistry([
    {
      id: 'openai',
      status: 'active',
      models: ['gpt-5-mini'],
      features: ['batch'],
      modalities: ['audio'],
      nextStep: 'ship batch adapter',
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
      implementationPath: 'src/channels/slack.js',
      nextStep: 'ship slash-command routing',
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
      implementationPath: 'src/models/openai.js',
      nextStep: 'ship batch adapter',
    },
  ]);
});

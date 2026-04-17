import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemLoader } from '../src/core/fs-loader.js';
import { buildSummary } from '../src/index.js';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { PromptAssembler } from '../src/core/prompt-assembler.ts';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-profile-summary-'));
}

test('loadProfilesIndex summarizes material types and latest material timestamp per profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  const sourceTextPath = path.join(rootDir, 'sample.txt');
  fs.writeFileSync(sourceTextPath, 'Direct writing sample.');

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

  ingestion.importTextDocument({ personId: 'Harry Han', sourceFile: sourceTextPath });
  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.importScreenshotSource({ personId: 'Harry Han', sourceFile: screenshotPath });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.id, 'harry-han');
  assert.equal(profile.profile.displayName, 'Harry Han');
  assert.equal(profile.materialCount, 3);
  assert.equal(profile.screenshotCount, 1);
  assert.deepEqual(profile.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.match(profile.latestMaterialAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(profile.latestMaterialId, /^\d{4}-\d{2}-\d{2}T.+-(message|screenshot|text)$/);
  assert.deepEqual(profile.intake, {
    ready: false,
    importsDirPresent: false,
    intakeReadmePresent: false,
    starterManifestPresent: false,
    sampleTextPresent: false,
    importsDir: 'profiles/harry-han/imports',
    intakeReadmePath: 'profiles/harry-han/imports/README.md',
    starterManifestPath: 'profiles/harry-han/imports/materials.template.json',
    sampleTextPath: 'profiles/harry-han/imports/sample.txt',
  });
  assert.deepEqual(profile.foundationDrafts, {
    memory: 'profiles/harry-han/memory/long-term/foundation.json',
    voice: 'profiles/harry-han/voice/README.md',
    soul: 'profiles/harry-han/soul/README.md',
    skills: 'profiles/harry-han/skills/README.md',
  });
  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, false);
  assert.equal(profile.foundationDraftStatus.generatedAt !== null, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.deepEqual(profile.foundationDraftStatus.refreshReasons, []);
  assert.equal(profile.foundationDraftSummaries.memory.generated, true);
  assert.equal(profile.foundationDraftSummaries.memory.generatedAt, profile.foundationDraftSummaries.voice.generatedAt);
  assert.equal(profile.foundationDraftSummaries.memory.latestMaterialAt, profile.latestMaterialAt);
  assert.equal(profile.foundationDraftSummaries.memory.latestMaterialId, profile.latestMaterialId);
  assert.equal(profile.foundationDraftSummaries.memory.sourceCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.memory.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.equal(profile.foundationDraftSummaries.memory.entryCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.memory.latestSummaries.slice().sort(), ['Direct writing sample.', 'Ship the first slice.']);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.equal(profile.foundationDraftSummaries.voice.generatedAt !== null, true);
  assert.equal(profile.foundationDraftSummaries.voice.sourceCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.voice.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.deepEqual(profile.foundationDraftSummaries.voice.highlights.slice().sort(), [
    '- [message] Ship the first slice.',
    '- [text] Direct writing sample.',
  ]);
  assert.deepEqual(profile.foundationDraftSummaries.soul, {
    generated: true,
    generatedAt: profile.foundationDraftSummaries.voice.generatedAt,
    latestMaterialAt: profile.latestMaterialAt,
    latestMaterialId: profile.latestMaterialId,
    sourceCount: 3,
    materialTypes: {
      message: 1,
      screenshot: 1,
      text: 1,
    },
    highlights: ['- [text] Direct writing sample.'],
  });
  assert.deepEqual(profile.foundationDraftSummaries.skills, {
    generated: true,
    generatedAt: profile.foundationDraftSummaries.voice.generatedAt,
    latestMaterialAt: profile.latestMaterialAt,
    latestMaterialId: profile.latestMaterialId,
    sourceCount: 3,
    materialTypes: {
      message: 1,
      screenshot: 1,
      text: 1,
    },
    highlights: [],
  });
  assert.deepEqual(profile.foundationReadiness.memory.latestTypes.slice().sort(), ['message', 'screenshot', 'text']);
  assert.equal(profile.foundationReadiness.memory.candidateCount, 3);
  assert.deepEqual(profile.foundationReadiness.memory.sampleSummaries.slice().sort(), ['Direct writing sample.', 'Ship the first slice.']);
  assert.deepEqual(profile.foundationReadiness.voice.sampleTypes.slice().sort(), ['message', 'text']);
  assert.deepEqual(profile.foundationReadiness.voice.sampleExcerpts.slice().sort(), ['Direct writing sample.', 'Ship the first slice.']);
  assert.deepEqual(profile.foundationReadiness.soul, {
    candidateCount: 1,
    sampleTypes: ['text'],
    sampleExcerpts: ['Direct writing sample.'],
  });
  assert.deepEqual(profile.foundationReadiness.skills, {
    candidateCount: 0,
    sampleTypes: [],
    sampleExcerpts: [],
  });
});

test('loadProfilesIndex marks malformed markdown foundation drafts as stale and ungenerated', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md'),
    '# Voice draft\n\nRepresentative voice excerpts:\n- [message] Ship the first slice.\n',
  );

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, false);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, ['voice']);
  assert.deepEqual(profile.foundationDraftStatus.refreshReasons, ['missing drafts']);
  assert.deepEqual(profile.foundationDraftSummaries.voice, {
    generated: false,
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
  });
  assert.equal(profile.foundationDraftSummaries.soul.generated, true);
});

test('loadProfilesIndex marks valid markdown drafts as stale when their target-person metadata drifts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const staleVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8')
    .replace('Display name: Harry Han', 'Display name: Old Harry')
    .replace('Summary: Direct operator with a bias for momentum.', 'Summary: Outdated summary.');
  fs.writeFileSync(voiceDraftPath, staleVoiceDraft);

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.deepEqual(profile.foundationDraftStatus.refreshReasons, ['draft metadata drift']);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.equal(profile.foundationDraftSummaries.voice.generatedAt !== null, true);
  assert.deepEqual(profile.foundationDraftSummaries.voice.highlights, ['- [message] Ship the first slice.']);
});

test('PromptAssembler includes compact profile foundation snapshots when provided', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [
      {
        id: 'harry-han',
        profile: {
          displayName: 'Harry Han',
          summary: 'Direct operator with a bias for momentum.',
        },
        materialCount: 3,
        materialTypes: { text: 1, message: 1, screenshot: 1 },
        latestMaterialAt: '2026-04-16T15:00:00.000Z',
        foundationReadiness: {
          memory: {
            candidateCount: 3,
            latestTypes: ['screenshot', 'message', 'text'],
            sampleSummaries: ['Ship the first slice.', 'Direct writing sample.'],
          },
          voice: { candidateCount: 2, sampleTypes: ['message', 'text'], sampleExcerpts: ['Ship the first slice.', 'Direct writing sample.'] },
          soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Direct writing sample.'] },
          skills: { candidateCount: 0, sampleTypes: [], sampleExcerpts: [] },
        },
        foundationDraftStatus: {
          generatedAt: '2026-04-16T15:00:01.000Z',
          complete: true,
          missingDrafts: [],
          needsRefresh: false,
        },
        foundationDraftSummaries: {
          memory: {
            generated: true,
            generatedAt: '2026-04-16T15:00:01.000Z',
            latestMaterialAt: '2026-04-16T15:00:00.000Z',
            latestMaterialId: '2026-04-16T15-00-00-000Z-screenshot',
            sourceCount: 3,
            materialTypes: { text: 1, message: 1, screenshot: 1 },
            entryCount: 3,
            latestSummaries: ['Ship the first slice.', 'Direct writing sample.'],
          },
          voice: { generated: true, highlights: ['- [message] Ship the first slice.'] },
          soul: { generated: true, highlights: ['- [text] Direct writing sample.'] },
          skills: { generated: false, highlights: [] },
        },
      },
      {
        id: 'jane-doe',
        materialCount: 1,
        materialTypes: { talk: 1 },
        latestMaterialAt: '2026-04-16T16:00:00.000Z',
        foundationReadiness: {
          memory: { candidateCount: 1, latestTypes: ['talk'], sampleSummaries: ['Tight loops beat big plans.'] },
          voice: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
          soul: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
          skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['execution heuristic'] },
        },
        foundationDraftStatus: {
          generatedAt: null,
          complete: false,
          missingDrafts: ['memory', 'skills', 'soul', 'voice'],
          needsRefresh: true,
        },
        foundationDraftSummaries: {
          memory: { generated: false, entryCount: 0, latestSummaries: [] },
          voice: { generated: false, highlights: [] },
          soul: { generated: false, highlights: [] },
          skills: { generated: false, highlights: [] },
        },
      },
    ],
    foundationRollup: {
      memory: {
        profileCount: 2,
        generatedProfileCount: 1,
        repoStaleProfileCount: 1,
        totalEntries: 3,
        highlights: ['Ship the first slice.', 'Direct writing sample.'],
      },
      voice: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        highlights: ['[message] Ship the first slice.', 'Tight loops beat big plans.'],
      },
      soul: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        highlights: ['[text] Direct writing sample.', 'Tight loops beat big plans.'],
      },
      skills: {
        profileCount: 2,
        generatedProfileCount: 0,
        candidateCount: 1,
        highlights: ['execution heuristic'],
      },
    },
  }).buildSystemPrompt();

  assert.match(prompt, /Foundation rollup:/);
  assert.match(prompt, /memory: 1\/2 generated, 1 repo-stale profiles, 3 entries/);
  assert.match(prompt, /voice: 1\/2 generated, 2 candidate profiles/);
  assert.match(prompt, /Profiles:/);
  assert.match(prompt, /"jane-doe"/);
  assert.match(prompt, /Profile foundation snapshots:/);
  assert.match(prompt, /- Harry Han \(harry-han\): 3 materials \(message:1, screenshot:1, text:1\)/);
  assert.match(prompt, /profile summary: Direct operator with a bias for momentum\./);
  assert.match(prompt, /drafts: fresh, complete, generated 2026-04-16T15:00:01.000Z/);
  assert.match(prompt, /memory candidates: 3 \| voice: 2 \| soul: 1 \| skills: 0/);
  assert.match(prompt, /voice highlights: \[message\] Ship the first slice\./);
  assert.match(prompt, /- jane-doe: 1 material \(talk:1\)/);
  assert.match(prompt, /drafts: stale, missing memory\/skills\/soul\/voice/);
  assert.match(prompt, /memory highlights: Tight loops beat big plans\./);
  assert.match(prompt, /skills signals: execution heuristic/);
  assert.match(prompt, /Ship the first slice\./);
});

test('PromptAssembler includes delivery foundation snapshots in the system prompt', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    ingestion: {
      profileCount: 2,
      importedProfileCount: 2,
      metadataOnlyProfileCount: 0,
      readyProfileCount: 1,
      refreshProfileCount: 1,
      incompleteProfileCount: 1,
      supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
      bootstrapProfileCommand: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"',
      sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
      importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
      sampleManifestProfileIds: ['harry-han'],
      sampleTextPath: 'samples/harry-post.txt',
      sampleTextPresent: true,
      sampleTextPersonId: 'harry-han',
      sampleTextCommand: 'node src/index.js import text --person harry-han --file samples/harry-post.txt --refresh-foundation',
      staleRefreshCommand: 'node src/index.js update foundation --stale',
      profileCommands: [
        {
          personId: 'jane-doe',
          label: 'Jane Doe (jane-doe)',
          materialCount: 1,
          materialTypes: { talk: 1 },
          latestMaterialAt: '2026-04-16T16:00:00.000Z',
          refreshFoundationCommand: 'node src/index.js update foundation --person jane-doe',
          updateProfileCommand: 'node src/index.js update profile --person jane-doe',
          importCommands: {
            text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
            message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
            talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
            screenshot: 'node src/index.js import screenshot --person jane-doe --file <image.png> --refresh-foundation',
          },
          importMaterialCommand: null,
        },
        {
          personId: 'metadata-only',
          label: 'Metadata Only (metadata-only)',
          materialCount: 0,
          materialTypes: {},
          latestMaterialAt: null,
          refreshFoundationCommand: null,
          updateProfileCommand: 'node src/index.js update profile --person metadata-only',
          updateIntakeCommand: 'node src/index.js update intake --person \'metadata-only\' --display-name \'Metadata Only\'',
          intakeReady: false,
          intakePaths: [
            'profiles/metadata-only/imports',
            'profiles/metadata-only/imports/README.md',
            'profiles/metadata-only/imports/materials.template.json',
            'profiles/metadata-only/imports/sample.txt',
          ],
          importCommands: {
            text: 'node src/index.js import text --person metadata-only --file <sample.txt> --refresh-foundation',
            message: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
            talk: 'node src/index.js import talk --person metadata-only --text <snippet> --refresh-foundation',
            screenshot: 'node src/index.js import screenshot --person metadata-only --file <image.png> --refresh-foundation',
          },
          importMaterialCommand: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
        },
      ],
    },
    channels: {
      channelCount: 2,
      channels: [
        {
          id: 'slack',
          name: 'Slack',
          status: 'planned',
          deliveryModes: ['events-api', 'web-api'],
          auth: { type: 'bot-token', envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'] },
        },
        {
          id: 'telegram',
          name: 'Telegram',
          status: 'active',
          deliveryModes: ['polling', 'webhook'],
          auth: { type: 'bot-token', envVars: ['TELEGRAM_BOT_TOKEN'] },
        },
      ],
    },
    models: {
      providerCount: 2,
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          status: 'planned',
          defaultModel: 'gpt-5',
          authEnvVar: 'OPENAI_API_KEY',
          modalities: ['chat', 'reasoning', 'vision'],
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          status: 'active',
          defaultModel: 'claude-3.7-sonnet',
          authEnvVar: 'ANTHROPIC_API_KEY',
          modalities: ['chat', 'long-context', 'vision'],
        },
      ],
    },
  }).buildSystemPrompt();

  assert.match(prompt, /Ingestion entrance:/);
  assert.match(prompt, /profiles: 2 total \(2 imported, 0 metadata-only\)/);
  assert.match(prompt, /imports: message, screenshot, talk, text/);
  assert.match(prompt, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>"/);
  assert.match(prompt, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js update foundation --stale/);
  assert.match(prompt, /sample import: node src\/index\.js import text --person <person-id> --file <sample\.txt> --refresh-foundation/);
  assert.match(prompt, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file samples\/harry-post\.txt --refresh-foundation/);
  assert.match(prompt, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest 2026-04-16T16:00:00\.000Z \| refresh node src\/index\.js update foundation --person jane-doe \| update node src\/index\.js update profile --person jane-doe/);
  assert.match(prompt, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\); scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' \| import node src\/index\.js import message --person metadata-only --text <message> --refresh-foundation \| update node src\/index\.js update profile --person metadata-only/);
  assert.match(prompt, /Delivery foundation:/);
  assert.match(prompt, /channels: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Slack via events-api\/web-api \[bot-token: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET\]/);
  assert.match(prompt, /models: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Anthropic default claude-3.7-sonnet \[ANTHROPIC_API_KEY\] \{chat, long-context, vision\}/);
  assert.match(prompt, /channel queue: 1 pending via manifests\/channels\.json/);
  assert.match(prompt, /Slack \[planned\]: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET via events-api\/web-api/);
  assert.match(prompt, /provider queue: 1 pending via manifests\/providers\.json/);
  assert.match(prompt, /OpenAI \[planned\]: set OPENAI_API_KEY for gpt-5 \{chat, reasoning, vision\}/);
});

test('PromptAssembler includes work-loop guidance in the system prompt', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    workLoop: {
      intervalMinutes: 10,
      objectiveCount: 5,
      objectives: [
        'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
        'improve the user-facing ingestion/update entrance for target-person materials',
        'add chat channels Feishu, Telegram, WhatsApp, and Slack',
        'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
        'report progress in small verified increments',
      ],
      priorityCount: 4,
      readyPriorityCount: 1,
      queuedPriorityCount: 3,
      currentPriority: {
        id: 'ingestion',
        label: 'Ingestion',
        status: 'queued',
        summary: '0 imported, 0 metadata-only, 0 ready, 0 queued for refresh',
        nextAction: 'bootstrap a target profile',
        command: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"',
        paths: [],
      },
      priorities: [
        {
          id: 'foundation',
          label: 'Foundation',
          status: 'ready',
          summary: 'core 4/4 ready; profiles 0 queued for refresh, 0 incomplete',
          nextAction: null,
          command: null,
          paths: [],
        },
        {
          id: 'ingestion',
          label: 'Ingestion',
          status: 'queued',
          summary: '0 imported, 0 metadata-only, 0 ready, 0 queued for refresh',
          nextAction: 'bootstrap a target profile',
          command: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"',
          paths: [],
        },
        {
          id: 'channels',
          label: 'Channels',
          status: 'queued',
          summary: '4 pending, 0 configured',
          nextAction: 'set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET',
          command: null,
          paths: ['src/channels/slack.js'],
        },
        {
          id: 'providers',
          label: 'Providers',
          status: 'queued',
          summary: '6 pending, 0 configured',
          nextAction: 'set OPENAI_API_KEY for gpt-5',
          command: null,
          paths: ['src/models/openai.js'],
        },
      ],
    },
  }).buildSystemPrompt();

  assert.match(prompt, /Work loop:/);
  assert.match(prompt, /priorities: 4 total \(1 ready, 3 queued\)/);
  assert.match(prompt, /cadence: every 10 minutes/);
  assert.match(prompt, /current: Ingestion \[queued\] — 0 imported, 0 metadata-only, 0 ready, 0 queued for refresh/);
  assert.match(prompt, /next action: bootstrap a target profile/);
  assert.match(prompt, /command: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>"/);
  assert.match(prompt, /order: foundation:ready \| ingestion:queued \| channels:queued \| providers:queued/);
});

test('PromptAssembler falls back to readiness highlights for stale voice, soul, and skills snapshots', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [
      {
        id: 'jane-doe',
        materialCount: 1,
        materialTypes: { talk: 1 },
        latestMaterialAt: '2026-04-16T16:00:00.000Z',
        foundationReadiness: {
          memory: { candidateCount: 1, latestTypes: ['talk'], sampleSummaries: ['Tight loops beat big plans.'] },
          voice: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
          soul: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
          skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['feedback-loop heuristic'] },
        },
        foundationDraftStatus: {
          generatedAt: null,
          complete: false,
          missingDrafts: ['memory', 'skills', 'soul', 'voice'],
          needsRefresh: true,
        },
        foundationDraftSummaries: {
          memory: { generated: false, entryCount: 0, latestSummaries: [] },
          voice: { generated: false, highlights: [] },
          soul: { generated: false, highlights: [] },
          skills: { generated: false, highlights: [] },
        },
      },
    ],
  }).buildSystemPrompt();

  assert.match(prompt, /voice highlights: Tight loops beat big plans\./);
  assert.match(prompt, /soul highlights: Tight loops beat big plans\./);
  assert.match(prompt, /skills signals: feedback-loop heuristic/);
});

test('PromptAssembler omits empty profile foundation snapshot blocks', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [],
    foundationRollup: null,
  }).buildSystemPrompt();

  assert.doesNotMatch(prompt, /Profile foundation snapshots:/);
});

test('PromptAssembler prefers distilled generated skill highlights over sample lines', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [
      {
        id: 'jane-doe',
        materialCount: 1,
        materialTypes: { talk: 1 },
        foundationReadiness: {
          memory: { candidateCount: 1, latestTypes: ['talk'], sampleSummaries: ['Tight loops beat big plans.'] },
          voice: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
          soul: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
          skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['fallback skill signal'] },
        },
        foundationDraftStatus: {
          generatedAt: '2026-04-16T16:00:01.000Z',
          complete: true,
          missingDrafts: [],
          needsRefresh: false,
        },
        foundationDraftSummaries: {
          memory: { generated: true, entryCount: 1, latestSummaries: ['Tight loops beat big plans.'] },
          voice: { generated: false, highlights: [] },
          soul: { generated: false, highlights: [] },
          skills: {
            generated: true,
            highlights: ['- execution heuristic', '- sample: Tight loops beat big plans.'],
          },
        },
      },
    ],
  }).buildSystemPrompt();

  assert.match(prompt, /skills signals: execution heuristic/);
  assert.doesNotMatch(prompt, /skills signals: .*sample:/);
  assert.doesNotMatch(prompt, /skills signals: fallback skill signal/);
  assert.doesNotMatch(prompt, /"sample: Tight loops beat big plans\."/);
});

test('loadProfilesIndex marks draft status as stale when new materials arrive after generation', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  await new Promise((resolve) => setTimeout(resolve, 15));
  ingestion.importTalkSnippet({
    personId: 'Harry Han',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.equal(profile.latestMaterialAt > profile.foundationDraftStatus.generatedAt, true);
});

test('loadProfilesIndex marks draft status as stale when a new material lands in the same timestamp window', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);
  const RealDate = Date;
  const fixedIso = '2026-04-16T15:00:00.000Z';

  const MockDate = class extends RealDate {
    constructor(value?: string | number | Date) {
      super(value ?? fixedIso);
    }

    static now() {
      return new RealDate(fixedIso).valueOf();
    }

    static parse(value: string) {
      return RealDate.parse(value);
    }

    static UTC(...args: number[]) {
      return (RealDate.UTC as (...values: number[]) => number)(...args);
    }
  } as unknown as DateConstructor;

  global.Date = MockDate;

  try {
    ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
    ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });
    ingestion.importTalkSnippet({
      personId: 'Harry Han',
      text: 'Keep the feedback loop short.',
      notes: 'execution heuristic',
    });
  } finally {
    global.Date = RealDate;
  }

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.latestMaterialAt, '2026-04-16T15:00:00.000Z');
  assert.equal(profile.foundationDraftStatus.generatedAt, '2026-04-16T15:00:00.000Z');
  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
});

test('loadProfilesIndex marks draft status as missing before foundation generation runs', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.generatedAt, null);
  assert.equal(profile.foundationDraftStatus.complete, false);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, ['memory', 'skills', 'soul', 'voice']);
});

test('loadProfilesIndex marks foundation status stale when memory draft metadata is unreadable', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json'), '{not-json');

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.generatedAt, null);
  assert.equal(profile.foundationDraftStatus.complete, false);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, ['memory']);
});

test('loadProfilesIndex backfills memory draft provenance from legacy foundation drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.importTalkSnippet({
    personId: 'Harry Han',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const memoryDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json');
  const legacyMemoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  delete legacyMemoryDraft.materialTypes;
  delete legacyMemoryDraft.latestMaterialAt;
  delete legacyMemoryDraft.latestMaterialId;
  fs.writeFileSync(memoryDraftPath, JSON.stringify(legacyMemoryDraft, null, 2));

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftSummaries.memory.generated, true);
  assert.equal(profile.foundationDraftSummaries.memory.generatedAt, legacyMemoryDraft.generatedAt);
  assert.equal(profile.foundationDraftSummaries.memory.sourceCount, 2);
  assert.deepEqual(profile.foundationDraftSummaries.memory.materialTypes, {
    message: 1,
    talk: 1,
  });
  assert.deepEqual(profile.foundationDraftSummaries.memory.latestSummaries.slice().sort(), [
    'Keep the feedback loop short.',
    'Ship the first slice.',
  ]);
});

test('loadProfilesIndex skips malformed material records while keeping valid summaries', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });

  const brokenRecordPath = path.join(rootDir, 'profiles', 'harry-han', 'materials', 'broken.json');
  fs.writeFileSync(brokenRecordPath, '{not-json');

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.id, 'harry-han');
  assert.equal(profile.materialCount, 2);
  assert.deepEqual(profile.materialTypes, { message: 1 });
  assert.equal(profile.foundationReadiness.memory.candidateCount, 1);
});

test('buildSummary exposes an ingestion entrance rollup with actionable commands', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-post.txt'), 'Direct writing sample.');
  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'harry-han',
      displayName: 'Harry Han',
      summary: 'Direct operator with a bias for momentum.',
      entries: [
        { type: 'message', text: 'Ship the thin slice first.' },
        { type: 'text', file: './harry-post.txt', notes: 'blog fragment' },
      ],
    }, null, 2),
  );

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });
  ingestion.importTalkSnippet({
    personId: 'Jane Doe',
    text: 'Tight loops beat big plans.',
    notes: 'execution heuristic',
  });
  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);
  const janeCommand = summary.ingestion.profileCommands[0];
  const metadataOnlyCommand = summary.ingestion.profileCommands[1];
  const allProfileCommandLabels = summary.ingestion.allProfileCommands.map((profile: { label: string }) => profile.label);
  const readyProfileCommand = summary.ingestion.allProfileCommands.find((profile: { personId: string }) => profile.personId === 'harry-han');
  const metadataOnlyProfileCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(summary.ingestion.profileCount, 3);
  assert.equal(summary.ingestion.importedProfileCount, 2);
  assert.equal(summary.ingestion.metadataOnlyProfileCount, 1);
  assert.equal(summary.ingestion.readyProfileCount, 1);
  assert.equal(summary.ingestion.refreshProfileCount, 1);
  assert.equal(summary.ingestion.incompleteProfileCount, 1);
  assert.deepEqual(summary.ingestion.supportedImportTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.equal(summary.ingestion.bootstrapProfileCommand, 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"');
  assert.equal(summary.ingestion.sampleImportCommand, 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation');
  assert.equal(summary.ingestion.importManifestCommand, 'node src/index.js import manifest --file <manifest.json>');
  assert.equal(summary.ingestion.sampleManifestPath, 'samples/harry-materials.json');
  assert.equal(summary.ingestion.sampleManifestPresent, true);
  assert.equal(summary.ingestion.sampleManifestStatus, 'loaded');
  assert.equal(summary.ingestion.sampleManifestEntryCount, 2);
  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, ['harry-han']);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['Harry Han (harry-han)']);
  assert.deepEqual(summary.ingestion.sampleManifestMaterialTypes, { message: 1, text: 1 });
  assert.equal(summary.ingestion.sampleManifestError, null);
  assert.equal(summary.ingestion.sampleStarterCommand, 'node src/index.js import sample');
  assert.equal(summary.ingestion.sampleStarterSource, 'manifest');
  assert.equal(summary.ingestion.sampleStarterLabel, 'Harry Han (harry-han)');
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/harry-materials.json' --refresh-foundation");
  assert.equal(summary.ingestion.sampleTextPath, 'samples/harry-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'harry-han');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.equal(summary.ingestion.staleRefreshCommand, 'node src/index.js update foundation --stale');
  assert.deepEqual(allProfileCommandLabels, [
    'Jane Doe (jane-doe)',
    'Metadata Only (metadata-only)',
    'Harry Han (harry-han)',
  ]);
  assert.equal(readyProfileCommand?.materialCount, 1);
  assert.equal(readyProfileCommand?.needsRefresh, false);
  assert.equal(readyProfileCommand?.refreshFoundationCommand, 'node src/index.js update foundation --person harry-han');

  assert.deepEqual(janeCommand.materialTypes, { talk: 1 });
  assert.equal(janeCommand.personId, 'jane-doe');
  assert.equal(janeCommand.displayName, 'Jane Doe');
  assert.equal(janeCommand.label, 'Jane Doe (jane-doe)');
  assert.equal(janeCommand.materialCount, 1);
  assert.equal(janeCommand.needsRefresh, true);
  assert.deepEqual(janeCommand.missingDrafts, ['memory', 'skills', 'soul', 'voice']);
  assert.equal(janeCommand.latestMaterialAt, summary.profiles.find((profile) => profile.id === 'jane-doe')?.latestMaterialAt ?? null);
  assert.match(janeCommand.latestMaterialAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(janeCommand.updateProfileCommand, 'node src/index.js update profile --person jane-doe');
  assert.equal(janeCommand.refreshFoundationCommand, 'node src/index.js update foundation --person jane-doe');
  assert.equal(janeCommand.importMaterialCommand, null);
  assert.deepEqual(janeCommand.importCommands, {
    text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
    message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
    talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
    screenshot: 'node src/index.js import screenshot --person jane-doe --file <image.png> --refresh-foundation',
  });

  assert.deepEqual(metadataOnlyCommand, {
    personId: 'metadata-only',
    displayName: 'Metadata Only',
    label: 'Metadata Only (metadata-only)',
    materialCount: 0,
    materialTypes: {},
    latestMaterialAt: null,
    needsRefresh: false,
    missingDrafts: [],
    updateProfileCommand: 'node src/index.js update profile --person metadata-only',
    updateIntakeCommand: "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    intakeReady: false,
    intakePaths: [
      'profiles/metadata-only/imports',
      'profiles/metadata-only/imports/README.md',
      'profiles/metadata-only/imports/materials.template.json',
      'profiles/metadata-only/imports/sample.txt',
    ],
    refreshFoundationCommand: null,
    importCommands: {
      text: 'node src/index.js import text --person metadata-only --file <sample.txt> --refresh-foundation',
      message: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
      talk: 'node src/index.js import talk --person metadata-only --text <snippet> --refresh-foundation',
      screenshot: 'node src/index.js import screenshot --person metadata-only --file <image.png> --refresh-foundation',
    },
    importMaterialCommand: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
  });
  assert.deepEqual(metadataOnlyProfileCommand, metadataOnlyCommand);

  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /profiles: 3 total \(2 imported, 1 metadata-only\)/);
  assert.match(summary.promptPreview, /drafts: 1 ready, 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /imports: message, screenshot, talk, text/);
  assert.match(summary.promptPreview, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>"/);
  assert.match(summary.promptPreview, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js update foundation --stale/);
  assert.match(summary.promptPreview, /sample import: node src\/index\.js import text --person <person-id> --file <sample\.txt> --refresh-foundation/);
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[manifest\] for Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /sample manifest: 2 entries for Harry Han \(harry-han\) \(message:1, text:1\) -> node src\/index\.js import manifest --file 'samples\/harry-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest \d{4}-\d{2}-\d{2}T[^|]+\| refresh node src\/index\.js update foundation --person jane-doe/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\); scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.' \| import node src\/index\.js import message --person metadata-only --text <message> --refresh-foundation \| update node src\/index\.js update profile --person metadata-only/);
});

test('buildSummary keeps the ingestion entrance visible for empty repos', () => {
  const rootDir = makeTempRepo();

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.ingestion, {
    profileCount: 0,
    importedProfileCount: 0,
    metadataOnlyProfileCount: 0,
    readyProfileCount: 0,
    refreshProfileCount: 0,
    incompleteProfileCount: 0,
    supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
    bootstrapProfileCommand: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"',
    sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
    importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
    sampleManifestPath: null,
    sampleManifestPresent: false,
    sampleManifestStatus: 'missing',
    sampleManifestEntryCount: 0,
    sampleManifestProfileIds: [],
    sampleManifestProfileLabels: [],
    sampleManifestMaterialTypes: {},
    sampleManifestError: null,
    sampleStarterCommand: null,
    sampleStarterSource: null,
    sampleStarterLabel: null,
    sampleManifestCommand: null,
    sampleTextPath: null,
    sampleTextPresent: false,
    sampleTextPersonId: null,
    sampleTextCommand: null,
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    profileCommands: [],
    allProfileCommands: [],
    metadataProfileCommands: [],
  });

  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /profiles: 0 total \(0 imported, 0 metadata-only\)/);
  assert.match(summary.promptPreview, /imports: message, screenshot, talk, text/);
  assert.match(summary.promptPreview, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>"/);
  assert.match(summary.promptPreview, /sample import: node src\/index\.js import text --person <person-id> --file <sample\.txt> --refresh-foundation/);
});

test('buildSummary reports invalid sample manifests without advertising a broken sample import command', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-materials.json'), '{not valid json');

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestPath, 'samples/harry-materials.json');
  assert.equal(summary.ingestion.sampleManifestPresent, true);
  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleManifestEntryCount, 0);
  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, []);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, []);
  assert.deepEqual(summary.ingestion.sampleManifestMaterialTypes, {});
  assert.equal(typeof summary.ingestion.sampleManifestError, 'string');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleStarterSource, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.equal(summary.ingestion.sampleTextPath, null);
  assert.equal(summary.ingestion.sampleTextPresent, false);
  assert.equal(summary.ingestion.sampleTextPersonId, null);
  assert.equal(summary.ingestion.sampleTextCommand, null);
  assert.match(summary.promptPreview, /sample manifest invalid: .* @ samples\/harry-materials\.json/);
  assert.doesNotMatch(summary.promptPreview, /sample manifest: 0 entries/);
});

test('buildSummary falls back to another valid sample manifest when the canonical sample manifest is invalid', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-materials.json'), '{not valid json');
  fs.writeFileSync(path.join(sampleDir, 'starter-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(sampleDir, 'starter-materials.json'),
    JSON.stringify({
      personId: 'Starter Person',
      entries: [
        {
          type: 'text',
          file: 'starter-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestPath, 'samples/starter-materials.json');
  assert.equal(summary.ingestion.sampleManifestPresent, true);
  assert.equal(summary.ingestion.sampleManifestStatus, 'loaded');
  assert.equal(summary.ingestion.sampleManifestEntryCount, 1);
  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, ['starter-person']);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['starter-person']);
  assert.equal(summary.ingestion.sampleManifestError, null);
  assert.equal(summary.ingestion.sampleStarterCommand, 'node src/index.js import sample');
  assert.equal(summary.ingestion.sampleStarterLabel, 'starter-person');
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.deepEqual(summary.ingestion.sampleManifestMaterialTypes, { text: 1 });
  assert.equal(summary.ingestion.sampleTextPath, 'samples/starter-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'starter-person');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person starter-person --file 'samples/starter-post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[manifest\] for starter-person/);
  assert.match(summary.promptPreview, /sample manifest: 1 entry for starter-person \(text:1\) -> node src\/index\.js import manifest --file 'samples\/starter-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /sample text: starter-person -> node src\/index\.js import text --person starter-person --file 'samples\/starter-post\.txt' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /sample manifest invalid: .*harry-materials\.json/);
});

test('buildSummary derives the sample text command from the matching manifest text entry instead of the first profile id', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      profiles: [
        { personId: 'Anna Ace' },
        { personId: 'Harry Han' },
      ],
      entries: [
        {
          personId: 'Harry Han',
          type: 'text',
          file: 'harry-post.txt',
        },
        {
          personId: 'Anna Ace',
          type: 'message',
          text: 'Use the manifest for grouped imports.',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleStarterCommand, 'node src/index.js import sample');
  assert.equal(summary.ingestion.sampleStarterSource, 'manifest');
  assert.equal(summary.ingestion.sampleTextPath, 'samples/harry-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'harry-han');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /sample text: anna-ace/);
});

test('buildSummary ignores the canonical sample text path when it does not belong to the selected sample manifest', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-post.txt'), 'Canonical but unrelated.\n');
  fs.writeFileSync(path.join(sampleDir, 'starter-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(sampleDir, 'starter-materials.json'),
    JSON.stringify({
      personId: 'Starter Person',
      entries: [
        {
          type: 'text',
          file: 'starter-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestPath, 'samples/starter-materials.json');
  assert.equal(summary.ingestion.sampleTextPath, 'samples/starter-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'starter-person');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person starter-person --file 'samples/starter-post.txt' --refresh-foundation");
  assert.doesNotMatch(summary.promptPreview, /sample text: .*harry-post\.txt/);
  assert.match(summary.promptPreview, /sample text: starter-person -> node src\/index\.js import text --person starter-person --file 'samples\/starter-post\.txt' --refresh-foundation/);
});

test('buildSummary prefers manifest display labels in the sample manifest entrance line when they are available', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      profiles: [
        {
          personId: 'Harry Han',
          displayName: 'Harry Han',
        },
        {
          personId: 'Jane Doe',
          displayName: 'Jane Doe',
        },
      ],
      entries: [
        {
          personId: 'Harry Han',
          type: 'text',
          file: 'harry-post.txt',
        },
        {
          personId: 'Jane Doe',
          type: 'message',
          text: 'Keep the feedback loop short.',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, ['harry-han', 'jane-doe']);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['Harry Han (harry-han)', 'Jane Doe (jane-doe)']);
  assert.match(summary.promptPreview, /sample manifest: 2 entries for Harry Han \(harry-han\), Jane Doe \(jane-doe\) \(message:1, text:1\) -> node src\/index\.js import manifest --file 'samples\/harry-materials\.json' --refresh-foundation/);
});

test('buildSummary shell-quotes sample ingestion commands when discovered sample paths contain spaces', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry sample post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(sampleDir, 'harry sample materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'harry sample post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestPath, 'samples/harry sample materials.json');
  assert.equal(summary.ingestion.sampleTextPath, 'samples/harry sample post.txt');
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/harry sample materials.json' --refresh-foundation");
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry sample post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /sample manifest: 1 entry for harry-han \(text:1\) -> node src\/index\.js import manifest --file 'samples\/harry sample materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file 'samples\/harry sample post\.txt' --refresh-foundation/);
});

test('buildSummary treats parseable but semantically invalid sample manifests as invalid', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      profiles: [{ personId: 'Harry Han' }],
      entries: [{ type: 'message', text: 'Ship the thin slice first.' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleManifestEntryCount, 0);
  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, []);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, []);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 is missing personId/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 is missing personId @ samples\/harry-materials\.json/);
});

test('buildSummary treats sample manifests with missing referenced files as invalid and hides broken starter commands', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      displayName: 'Harry Han',
      entries: [{ type: 'text', file: 'missing-post.txt' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.equal(summary.ingestion.sampleTextPersonId, null);
  assert.equal(summary.ingestion.sampleTextCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 references a missing file: missing-post\.txt/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 references a missing file: missing-post\.txt @ samples\/harry-materials\.json/);
  assert.doesNotMatch(summary.promptPreview, /starter: node src\/index\.js import sample/);
});

test('buildSummary treats sample manifests with directory-backed file entries as invalid', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(path.join(sampleDir, 'nested-source'), { recursive: true });

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [{ type: 'text', file: 'nested-source' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 references a non-file path: nested-source/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 references a non-file path: nested-source @ samples\/harry-materials\.json/);
});

test('buildSummary treats sample manifests with symlinked outside-repo files as invalid', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  const outsideFile = path.join(os.tmpdir(), `man-skill-outside-${Date.now()}.txt`);
  fs.writeFileSync(outsideFile, 'outside content');
  fs.symlinkSync(outsideFile, path.join(sampleDir, 'linked-post.txt'));

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [{ type: 'text', file: 'linked-post.txt' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 references a file outside the repo: linked-post\.txt/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 references a file outside the repo: linked-post\.txt @ samples\/harry-materials\.json/);
});

test('buildSummary treats sample manifests with missing text payloads as invalid', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [{ type: 'message' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 is missing text for message import/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 is missing text for message import @ samples\/harry-materials\.json/);
});

test('buildSummary falls back to another valid sample manifest when the canonical manifest references a missing file', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [{ type: 'text', file: 'missing-post.txt' }],
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(sampleDir, 'starter-materials.json'),
    JSON.stringify({
      personId: 'Starter Person',
      displayName: 'Starter Person',
      entries: [{ type: 'text', file: 'starter-post.txt' }],
    }, null, 2),
  );
  fs.writeFileSync(path.join(sampleDir, 'starter-post.txt'), 'Starter profile draft.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestPath, 'samples/starter-materials.json');
  assert.equal(summary.ingestion.sampleManifestStatus, 'loaded');
  assert.equal(summary.ingestion.sampleStarterCommand, 'node src/index.js import sample');
  assert.equal(summary.ingestion.sampleStarterLabel, 'Starter Person (starter-person)');
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.equal(summary.ingestion.sampleTextPersonId, 'starter-person');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person starter-person --file 'samples/starter-post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /sample manifest: 1 entry for Starter Person \(starter-person\) \(text:1\) -> node src\/index\.js import manifest --file 'samples\/starter-materials\.json' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /sample manifest invalid: .*missing-post\.txt/);
});

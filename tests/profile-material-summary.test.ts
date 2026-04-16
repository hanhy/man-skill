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
      importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
      staleRefreshCommand: 'node src/index.js update foundation --stale',
      profileCommands: [
        {
          personId: 'jane-doe',
          label: 'Jane Doe (jane-doe)',
          refreshFoundationCommand: 'node src/index.js update foundation --person jane-doe',
          updateProfileCommand: 'node src/index.js update profile --person jane-doe',
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
  assert.match(prompt, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js update foundation --stale/);
  assert.match(prompt, /Jane Doe \(jane-doe\): refresh node src\/index\.js update foundation --person jane-doe \| update node src\/index\.js update profile --person jane-doe/);
  assert.match(prompt, /Delivery foundation:/);
  assert.match(prompt, /channels: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Slack via events-api\/web-api \[bot-token: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET\]/);
  assert.match(prompt, /models: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Anthropic default claude-3.7-sonnet \[ANTHROPIC_API_KEY\] \{chat, long-context, vision\}/);
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

  assert.deepEqual(summary.ingestion, {
    profileCount: 3,
    importedProfileCount: 2,
    metadataOnlyProfileCount: 1,
    readyProfileCount: 1,
    refreshProfileCount: 1,
    incompleteProfileCount: 1,
    importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    profileCommands: [
      {
        personId: 'jane-doe',
        displayName: 'Jane Doe',
        label: 'Jane Doe (jane-doe)',
        materialCount: 1,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        updateProfileCommand: 'node src/index.js update profile --person jane-doe',
        refreshFoundationCommand: 'node src/index.js update foundation --person jane-doe',
      },
      {
        personId: 'harry-han',
        displayName: 'Harry Han',
        label: 'Harry Han (harry-han)',
        materialCount: 1,
        needsRefresh: false,
        missingDrafts: [],
        updateProfileCommand: 'node src/index.js update profile --person harry-han',
        refreshFoundationCommand: 'node src/index.js update foundation --person harry-han',
      },
    ],
  });

  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /profiles: 3 total \(2 imported, 1 metadata-only\)/);
  assert.match(summary.promptPreview, /drafts: 1 ready, 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js update foundation --stale/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): refresh node src\/index\.js update foundation --person jane-doe/);
});

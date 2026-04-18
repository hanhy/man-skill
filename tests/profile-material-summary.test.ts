import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemLoader } from '../src/core/fs-loader.js';
import { buildSummary, runUpdateCommand } from '../src/index.js';
import { buildIngestionSummary as buildJsIngestionSummary } from '../src/core/ingestion-summary.js';
import { buildIngestionSummary as buildTsIngestionSummary } from '../src/core/ingestion-summary.ts';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { PromptAssembler } from '../src/core/prompt-assembler.ts';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-profile-summary-'));
}

test('JS ingestion summary shim stays aligned with the TypeScript implementation', () => {
  const profiles = [
    {
      id: 'alpha-ready',
      materialCount: 0,
      materialTypes: {},
      profile: {
        displayName: 'Alpha Ready',
        summary: 'Starter intake is ready to import.',
      },
      intake: {
        ready: true,
        completion: 'ready',
        importsDir: 'profiles/alpha-ready/imports',
        intakeReadmePath: 'profiles/alpha-ready/imports/README.md',
        starterManifestPath: 'profiles/alpha-ready/imports/materials.template.json',
        sampleTextPath: 'profiles/alpha-ready/imports/sample.txt',
        missingPaths: [],
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: false,
        missingDrafts: [],
      },
    },
    {
      id: 'beta-imported',
      materialCount: 2,
      materialTypes: {
        message: 1,
        talk: 1,
      },
      latestMaterialAt: '2026-04-17T00:00:00.000Z',
      profile: {
        displayName: 'Beta Imported',
        summary: 'Imported materials waiting on a refresh.',
      },
      intake: {
        ready: false,
        completion: 'missing',
        importsDir: 'profiles/beta-imported/imports',
        intakeReadmePath: 'profiles/beta-imported/imports/README.md',
        starterManifestPath: 'profiles/beta-imported/imports/materials.template.json',
        sampleTextPath: 'profiles/beta-imported/imports/sample.txt',
        missingPaths: [
          'profiles/beta-imported/imports',
          'profiles/beta-imported/imports/README.md',
          'profiles/beta-imported/imports/materials.template.json',
          'profiles/beta-imported/imports/sample.txt',
        ],
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills'],
      },
    },
  ];
  const options = {
    sampleManifestPath: 'samples/starter.json',
    sampleManifest: {
      status: 'loaded',
      entryCount: 1,
      profileIds: ['alpha-ready'],
      profileLabels: ['Alpha Ready (alpha-ready)'],
      filePaths: ['samples/alpha-ready.txt'],
      materialTypes: { text: 1 },
      textFilePersonIds: {
        'samples/alpha-ready.txt': 'alpha-ready',
      },
      fileEntries: [
        {
          type: 'text',
          filePath: 'samples/alpha-ready.txt',
          personId: 'alpha-ready',
        },
      ],
      error: null,
    },
    sampleTextPath: 'samples/alpha-ready.txt',
  };

  assert.deepEqual(buildJsIngestionSummary(profiles, options), buildTsIngestionSummary(profiles, options));
});

test('buildIngestionSummary exposes a per-profile foundation refresh bundle for imported stale profiles', () => {
  const summary = buildTsIngestionSummary([
    {
      id: 'jane-doe',
      materialCount: 1,
      materialTypes: { talk: 1 },
      latestMaterialAt: '2026-04-16T16:00:00.000Z',
      profile: {
        displayName: 'Jane Doe',
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      },
    },
    {
      id: 'harry-han',
      materialCount: 2,
      materialTypes: { message: 1, text: 1 },
      latestMaterialAt: '2026-04-16T15:00:00.000Z',
      profile: {
        displayName: 'Harry Han',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
      },
    },
  ]);

  assert.equal(
    summary.helperCommands.refreshFoundationBundle,
    "(node src/index.js update foundation --person jane-doe) && (node src/index.js update foundation --person harry-han)",
  );
});

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
    ready: true,
    completion: 'ready',
    importsDirPresent: true,
    intakeReadmePresent: true,
    starterManifestPresent: true,
    sampleTextPresent: true,
    missingPaths: [],
    importsDir: 'profiles/harry-han/imports',
    intakeReadmePath: 'profiles/harry-han/imports/README.md',
    starterManifestPath: 'profiles/harry-han/imports/materials.template.json',
    sampleTextPath: 'profiles/harry-han/imports/sample.txt',
  });
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'imports', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'imports', 'sample.txt')), true);
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
      bootstrapProfileCommand: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
      sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
      importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
      sampleManifestProfileIds: ['harry-han'],
      sampleTextPath: 'samples/harry-post.txt',
      sampleTextPresent: true,
      sampleTextPersonId: 'harry-han',
      sampleTextCommand: 'node src/index.js import text --person harry-han --file samples/harry-post.txt --refresh-foundation',
      sampleFileCommands: [
        {
          type: 'text',
          path: 'samples/harry-post.txt',
          personId: 'harry-han',
          command: 'node src/index.js import text --person harry-han --file samples/harry-post.txt --refresh-foundation',
        },
        {
          type: 'screenshot',
          path: 'samples/harry-chat.png',
          personId: 'harry-han',
          command: 'node src/index.js import screenshot --person harry-han --file samples/harry-chat.png --refresh-foundation',
        },
      ],
      sampleInlineCommands: [],
      staleRefreshCommand: 'node src/index.js update foundation --stale',
      helperCommands: {
        updateProfileBundle: "(node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe') && (node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.')",
        updateProfileAndRefreshBundle: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
      },
      profileCommands: [
        {
          personId: 'jane-doe',
          label: 'Jane Doe (jane-doe)',
          materialCount: 1,
          materialTypes: { talk: 1 },
          latestMaterialAt: '2026-04-16T16:00:00.000Z',
          refreshFoundationCommand: 'node src/index.js update foundation --person jane-doe',
          updateProfileCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'",
          updateProfileAndRefreshCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
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
          updateProfileCommand: "node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
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
        {
          personId: 'harry-han',
          label: 'Harry Han (harry-han)',
          materialCount: 0,
          materialTypes: {},
          latestMaterialAt: null,
          refreshFoundationCommand: null,
          updateProfileCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Ready intake bundle for screenshots and notes.'",
          updateIntakeCommand: null,
          intakeReady: true,
          importIntakeCommand: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
          intakePaths: [
            'profiles/harry-han/imports/README.md',
            'profiles/harry-han/imports/materials.template.json',
            'profiles/harry-han/imports/sample.txt',
          ],
          importCommands: {
            text: 'node src/index.js import text --person harry-han --file <sample.txt> --refresh-foundation',
            message: 'node src/index.js import message --person harry-han --text <message> --refresh-foundation',
            talk: 'node src/index.js import talk --person harry-han --text <snippet> --refresh-foundation',
            screenshot: 'node src/index.js import screenshot --person harry-han --file <image.png> --refresh-foundation',
          },
          importMaterialCommand: "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation",
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
          inboundPath: '/hooks/slack/events',
          outboundMode: 'thread-reply',
          auth: { type: 'bot-token', envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'] },
        },
        {
          id: 'telegram',
          name: 'Telegram',
          status: 'active',
          deliveryModes: ['polling', 'webhook'],
          inboundPath: '/hooks/telegram',
          outboundMode: 'chat-send',
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
  assert.match(prompt, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(prompt, /helpers: .*update-bundle \(node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe'\) && \(node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'\).*sync-bundle node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation/);
  assert.match(prompt, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js update foundation --stale/);
  assert.match(prompt, /sample import: node src\/index\.js import text --person <person-id> --file <sample\.txt> --refresh-foundation/);
  assert.match(prompt, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file samples\/harry-post\.txt --refresh-foundation/);
  assert.match(prompt, /sample screenshot: harry-han -> node src\/index\.js import screenshot --person harry-han --file samples\/harry-chat\.png --refresh-foundation/);
  assert.match(prompt, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest 2026-04-16T16:00:00\.000Z \| refresh node src\/index\.js update foundation --person jane-doe \| sync node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation/);
  assert.match(prompt, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\); scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' \| import node src\/index\.js import message --person metadata-only --text <message> --refresh-foundation \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(prompt, /\+1 more profile: Harry Han \(harry-han\)/);
  assert.match(prompt, /Delivery foundation:/);
  assert.match(prompt, /channels: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Slack via events-api\/web-api -> thread-reply @ \/hooks\/slack\/events \[bot-token: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET\]/);
  assert.match(prompt, /models: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Anthropic default claude-3.7-sonnet \[ANTHROPIC_API_KEY\] \{chat, long-context, vision\}/);
  assert.match(prompt, /channel queue: 1 pending, manifest missing, scaffolds 0\/1 present, implementations 0\/1 ready via manifests\/channels\.json/);
  assert.match(prompt, /Slack \[planned\]: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET via events-api\/web-api -> thread-reply @ \/hooks\/slack\/events/);
  assert.match(prompt, /provider queue: 1 pending, manifest missing, scaffolds 0\/1 present, implementations 0\/1 ready via manifests\/providers\.json/);
  assert.match(prompt, /OpenAI \[planned\]: set OPENAI_API_KEY for gpt-5 \{chat, reasoning, vision\}/);
});

test('PromptAssembler falls back to ingestion helperCommands for sample helper lines', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    ingestion: {
      profileCount: 0,
      importedProfileCount: 0,
      metadataOnlyProfileCount: 0,
      readyProfileCount: 0,
      refreshProfileCount: 0,
      incompleteProfileCount: 0,
      intakeReadyProfileCount: 0,
      intakePartialProfileCount: 0,
      intakeMissingProfileCount: 0,
      supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
      helperCommands: {
        sampleText: "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation",
        sampleMessage: "node src/index.js import message --person harry-han --text 'Ship the thin slice first.' --refresh-foundation",
        sampleTalk: "node src/index.js import talk --person harry-han --text 'Keep the loop tight.' --refresh-foundation",
        sampleScreenshot: "node src/index.js import screenshot --person harry-han --file 'samples/harry-chat.png' --refresh-foundation",
      },
      sampleFileCommands: [],
      sampleInlineCommands: [],
    },
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
  }).buildSystemPrompt();

  assert.match(prompt, /helpers: .*sample-text node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation/);
  assert.match(prompt, /helpers: .*sample-message node src\/index\.js import message --person harry-han --text 'Ship the thin slice first\.' --refresh-foundation/);
  assert.match(prompt, /helpers: .*sample-talk node src\/index\.js import talk --person harry-han --text 'Keep the loop tight\.' --refresh-foundation/);
  assert.match(prompt, /helpers: .*sample-screenshot node src\/index\.js import screenshot --person harry-han --file 'samples\/harry-chat\.png' --refresh-foundation/);
});

test('PromptAssembler keeps the ingestion entrance visible when only the manifest refresh shortcut is available', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    ingestion: {
      profileCount: 0,
      importedProfileCount: 0,
      metadataOnlyProfileCount: 0,
      readyProfileCount: 0,
      refreshProfileCount: 0,
      incompleteProfileCount: 0,
      intakeReadyProfileCount: 0,
      intakePartialProfileCount: 0,
      intakeMissingProfileCount: 0,
      importManifestAndRefreshCommand: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
      helperCommands: {
        importManifestAndRefresh: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
      },
      sampleFileCommands: [],
      sampleInlineCommands: [],
    },
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
  }).buildSystemPrompt();

  assert.match(prompt, /Ingestion entrance:/);
  assert.match(prompt, /helpers: .*manifest\+refresh node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation/);
  assert.match(prompt, /commands: node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation/);
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
        command: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
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
          command: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
          paths: [],
        },
        {
          id: 'channels',
          label: 'Channels',
          status: 'queued',
          summary: '4 pending, 0 configured, manifest missing, scaffolds 1/4 present',
          nextAction: 'set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET',
          command: null,
          paths: ['src/channels/slack.js'],
        },
        {
          id: 'providers',
          label: 'Providers',
          status: 'queued',
          summary: '6 pending, 0 configured, manifest missing, scaffolds 1/6 present',
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
  assert.match(prompt, /command: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
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
  const actionableProfileCommandLabels = summary.ingestion.profileCommands.map((profile: { label: string }) => profile.label);
  const allProfileCommandLabels = summary.ingestion.allProfileCommands.map((profile: { label: string }) => profile.label);
  const readyProfileCommand = summary.ingestion.allProfileCommands.find((profile: { personId: string }) => profile.personId === 'harry-han');
  const metadataOnlyProfileCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(summary.ingestion.profileCount, 3);
  assert.equal(summary.ingestion.importedProfileCount, 2);
  assert.equal(summary.ingestion.metadataOnlyProfileCount, 1);
  assert.equal(summary.ingestion.readyProfileCount, 1);
  assert.equal(summary.ingestion.refreshProfileCount, 1);
  assert.equal(summary.ingestion.incompleteProfileCount, 1);
  assert.equal(summary.ingestion.intakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.intakePartialProfileCount, 0);
  assert.equal(summary.ingestion.intakeMissingProfileCount, 1);
  assert.equal(summary.ingestion.intakeScaffoldProfileCount, 1);
  assert.equal(summary.ingestion.intakeImportAllCommand, 'node src/index.js import intake --all --refresh-foundation');
  assert.deepEqual(summary.ingestion.supportedImportTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.equal(summary.ingestion.bootstrapProfileCommand, 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"');
  assert.equal(summary.ingestion.intakeImportedCommand, 'node src/index.js update intake --imported');
  assert.equal(summary.ingestion.sampleImportCommand, 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation');
  assert.equal(summary.ingestion.importManifestCommand, 'node src/index.js import manifest --file <manifest.json>');
  assert.equal(summary.ingestion.importManifestAndRefreshCommand, 'node src/index.js import manifest --file <manifest.json> --refresh-foundation');
  assert.equal(summary.ingestion.sampleManifestPath, 'samples/harry-materials.json');
  assert.equal(summary.ingestion.sampleManifestPresent, true);
  assert.equal(summary.ingestion.sampleManifestStatus, 'loaded');
  assert.equal(summary.ingestion.sampleManifestEntryCount, 2);
  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, ['harry-han']);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['Harry Han (harry-han)']);
  assert.deepEqual(summary.ingestion.sampleManifestFilePaths, ['samples/harry-post.txt']);
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
  assert.equal(summary.ingestion.refreshAllFoundationCommand, 'node src/index.js update foundation --all');
  assert.equal(summary.ingestion.staleRefreshCommand, 'node src/index.js update foundation --stale');
  assert.equal(summary.ingestion.refreshFoundationBundleCommand, 'node src/index.js update foundation --person jane-doe');
  assert.deepEqual(summary.ingestion.helperCommands, {
    bootstrap: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
    scaffoldAll: 'node src/index.js update intake --all',
    scaffoldStale: 'node src/index.js update intake --stale',
    scaffoldImported: 'node src/index.js update intake --imported',
    scaffoldBundle: "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    scaffoldImportedBundle: null,
    importManifest: 'node src/index.js import manifest --file <manifest.json>',
    importManifestAndRefresh: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
    importIntakeAll: 'node src/index.js import intake --all --refresh-foundation',
    importIntakeStale: 'node src/index.js import intake --stale --refresh-foundation',
    importIntakeBundle: null,
    updateProfileBundle: "(node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe') && (node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.')",
    updateProfileAndRefreshBundle: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
    refreshAllFoundation: 'node src/index.js update foundation --all',
    refreshStaleFoundation: 'node src/index.js update foundation --stale',
    refreshFoundationBundle: 'node src/index.js update foundation --person jane-doe',
    sampleStarter: 'node src/index.js import sample',
    sampleManifest: "node src/index.js import manifest --file 'samples/harry-materials.json' --refresh-foundation",
    sampleText: "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation",
    sampleMessage: "node src/index.js import message --person harry-han --text 'Ship the thin slice first.' --refresh-foundation",
    sampleTalk: null,
    sampleScreenshot: null,
  });
  assert.deepEqual(actionableProfileCommandLabels, [
    'Jane Doe (jane-doe)',
    'Metadata Only (metadata-only)',
  ]);
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
  assert.equal(janeCommand.updateProfileCommand, "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'");
  assert.equal(janeCommand.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation");
  assert.equal(janeCommand.refreshFoundationCommand, 'node src/index.js update foundation --person jane-doe');
  assert.equal(janeCommand.importMaterialCommand, null);
  assert.deepEqual(janeCommand.importCommands, {
    text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
    message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
    talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
    screenshot: 'node src/index.js import screenshot --person jane-doe --file <image.png> --refresh-foundation',
  });
  assert.deepEqual(janeCommand.helperCommands, {
    scaffold: "node src/index.js update intake --person 'jane-doe' --display-name 'Jane Doe'",
    importIntake: null,
    importManifest: null,
    updateProfile: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
    refreshFoundation: 'node src/index.js update foundation --person jane-doe',
    directImports: {
      text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
      message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
      talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
      screenshot: 'node src/index.js import screenshot --person jane-doe --file <image.png> --refresh-foundation',
    },
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
    updateProfileCommand: "node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    updateProfileAndRefreshCommand: null,
    updateIntakeCommand: "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    importIntakeCommand: "node src/index.js import intake --person 'metadata-only' --refresh-foundation",
    intakeReady: false,
    intakeCompletion: 'missing',
    intakeStatusSummary: 'missing — create imports, README.md, materials.template.json, sample.txt',
    intakeManifestStatus: 'missing',
    intakeManifestPath: 'profiles/metadata-only/imports/materials.template.json',
    intakeManifestError: null,
    intakePaths: [
      'profiles/metadata-only/imports',
      'profiles/metadata-only/imports/README.md',
      'profiles/metadata-only/imports/materials.template.json',
      'profiles/metadata-only/imports/sample.txt',
    ],
    intakeMissingPaths: [
      'profiles/metadata-only/imports',
      'profiles/metadata-only/imports/README.md',
      'profiles/metadata-only/imports/materials.template.json',
      'profiles/metadata-only/imports/sample.txt',
    ],
    importManifestCommand: null,
    refreshFoundationCommand: null,
    importCommands: {
      text: 'node src/index.js import text --person metadata-only --file <sample.txt> --refresh-foundation',
      message: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
      talk: 'node src/index.js import talk --person metadata-only --text <snippet> --refresh-foundation',
      screenshot: 'node src/index.js import screenshot --person metadata-only --file <image.png> --refresh-foundation',
    },
    helperCommands: {
      scaffold: "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
      importIntake: "node src/index.js import intake --person 'metadata-only' --refresh-foundation",
      importManifest: null,
      updateProfile: "node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
      updateProfileAndRefresh: null,
      refreshFoundation: null,
      directImports: {
        text: 'node src/index.js import text --person metadata-only --file <sample.txt> --refresh-foundation',
        message: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
        talk: 'node src/index.js import talk --person metadata-only --text <snippet> --refresh-foundation',
        screenshot: 'node src/index.js import screenshot --person metadata-only --file <image.png> --refresh-foundation',
      },
    },
    importMaterialCommand: 'node src/index.js import message --person metadata-only --text <message> --refresh-foundation',
  });
  assert.deepEqual(metadataOnlyProfileCommand, metadataOnlyCommand);

  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /profiles: 3 total \(2 imported, 1 metadata-only\)/);
  assert.match(summary.promptPreview, /drafts: 1 ready, 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /intake scaffolds: 0 ready, 0 partial, 1 missing/);
  assert.match(summary.promptPreview, /imports: message, screenshot, talk, text/);
  assert.match(summary.promptPreview, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-all node src\/index\.js update intake --all.*scaffold-stale node src\/index\.js update intake --stale.*scaffold-bundle node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.promptPreview, /helpers: .*update-bundle \(node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe'\) && \(node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'\).*sync-bundle node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation/);
  assert.match(summary.promptPreview, /helpers: .*manifest\+refresh node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation.*refresh-bundle node src\/index\.js update foundation --person jane-doe.*sample-message node src\/index\.js import message --person harry-han --text 'Ship the thin slice first\.' --refresh-foundation/);
  assert.match(summary.promptPreview, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation \| node src\/index\.js update foundation --all \| node src\/index\.js update foundation --stale/);
  assert.match(summary.promptPreview, /sample import: node src\/index\.js import text --person <person-id> --file <sample\.txt> --refresh-foundation/);
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[manifest\] for Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /sample manifest: 2 entries for Harry Han \(harry-han\) \(message:1, text:1\) -> node src\/index\.js import manifest --file 'samples\/harry-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest \d{4}-\d{2}-\d{2}T[^|]+\| refresh node src\/index\.js update foundation --person jane-doe \| sync node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake missing — create imports, README\.md, materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.' \| import node src\/index\.js import message --person metadata-only --text <message> --refresh-foundation \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.promptPreview, /\+1 more profile: Harry Han \(harry-han\)/);
});

test('buildSummary keeps imported profiles free of missing-intake warnings after first material import', () => {
  const rootDir = makeTempRepo();

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  const ingestion = new MaterialIngestion(rootDir);
  ingestion.importMessage({
    personId: 'harry-han',
    text: 'Ship the first slice before polishing the plan.',
  });

  const summary = buildSummary(rootDir);

  assert.doesNotMatch(summary.promptPreview, /intake missing — create imports/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^|]+\| refresh node src\/index\.js update foundation --person harry-han \| sync node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.' --refresh-foundation/);
});

test('buildSummary surfaces imported profiles that still need intake backfill after legacy imports', () => {
  const rootDir = makeTempRepo();

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  const ingestion = new MaterialIngestion(rootDir);
  ingestion.importMessage({
    personId: 'harry-han',
    text: 'Ship the first slice before polishing the plan.',
  });
  fs.rmSync(path.join(rootDir, 'profiles', 'harry-han', 'imports'), { recursive: true, force: true });

  const summary = buildSummary(rootDir);
  const harry = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');

  assert.equal(summary.ingestion.importedIntakeBackfillProfileCount, 1);
  assert.equal(summary.ingestion.helperCommands?.scaffoldImported, 'node src/index.js update intake --imported');
  assert.equal(summary.ingestion.helperCommands?.scaffoldImportedBundle, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(harry?.intakeReady, false);
  assert.equal(harry?.intakeStatusSummary, 'missing — create imports, README.md, materials.template.json, sample.txt');
  assert.equal(harry?.helperCommands?.scaffold, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.match(summary.promptPreview, /- intake backfill: 1 imported profile queued/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-imported-bundle node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^|]+, intake missing — create imports, README\.md, materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
});


test('buildSummary labels imported intake backfill bundles separately from the generic imported scaffold helper', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  runUpdateCommand(rootDir, 'profile', {
    person: 'jane-doe',
    'display-name': 'Jane Doe',
    summary: 'Fast feedback beats polished drift.',
  });

  ingestion.importMessage({
    personId: 'harry-han',
    text: 'Ship the first slice before polishing the plan.',
  });
  ingestion.importMessage({
    personId: 'jane-doe',
    text: 'Prefer a working loop over a perfect spec.',
  });

  fs.rmSync(path.join(rootDir, 'profiles', 'harry-han', 'imports'), { recursive: true, force: true });
  fs.rmSync(path.join(rootDir, 'profiles', 'jane-doe', 'imports'), { recursive: true, force: true });

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.importedIntakeBackfillProfileCount, 2);
  assert.equal(summary.ingestion.helperCommands?.scaffoldImported, 'node src/index.js update intake --imported');
  assert.match(summary.ingestion.helperCommands?.scaffoldImportedBundle ?? '', /node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.ingestion.helperCommands?.scaffoldImportedBundle ?? '', /node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe' --summary 'Fast feedback beats polished drift\.'/);
  assert.match(summary.promptPreview, /- intake backfill: 2 imported profiles queued/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-imported node src\/index\.js update intake --imported/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-imported-bundle /);
  assert.match(summary.promptPreview, /helpers: .*node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.promptPreview, /helpers: .*node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe' --summary 'Fast feedback beats polished drift\.'/);
});

test('buildSummary uses matching sample screenshot imports in ingestion profile commands when available', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'metadata-only-chat.png'), 'fake image bytes');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'screenshot',
          file: 'metadata-only-chat.png',
        },
      ],
    }, null, 2),
  );

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands.find((profile) => profile.personId === 'metadata-only');

  assert.equal(summary.ingestion.sampleTextPath, null);
  assert.deepEqual(summary.ingestion.sampleFileCommands, [
    {
      type: 'screenshot',
      path: 'samples/metadata-only-chat.png',
      personId: 'metadata-only',
      sourcePath: 'samples/metadata-only-materials.json',
      command: "node src/index.js import screenshot --person metadata-only --file 'samples/metadata-only-chat.png' --refresh-foundation",
    },
  ]);
  assert.equal(metadataOnlyCommand?.importCommands?.screenshot, "node src/index.js import screenshot --person metadata-only --file 'samples/metadata-only-chat.png' --refresh-foundation");
  assert.equal(metadataOnlyCommand?.helperCommands?.directImports?.screenshot, "node src/index.js import screenshot --person metadata-only --file 'samples/metadata-only-chat.png' --refresh-foundation");
  assert.equal(metadataOnlyCommand?.importMaterialCommand, "node src/index.js import screenshot --person metadata-only --file 'samples/metadata-only-chat.png' --refresh-foundation");
});

test('buildSummary uses matching sample talk imports in ingestion profile commands when available', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'talk',
          text: 'Ship the first slice from the sample manifest.',
        },
      ],
    }, null, 2),
  );

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands.find((profile) => profile.personId === 'metadata-only');

  assert.deepEqual(summary.ingestion.sampleInlineCommands, [
    {
      type: 'talk',
      text: 'Ship the first slice from the sample manifest.',
      personId: 'metadata-only',
      sourcePath: 'samples/metadata-only-materials.json',
      command: "node src/index.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest.' --refresh-foundation",
    },
  ]);
  assert.equal(summary.ingestion.helperCommands?.sampleMessage ?? null, null);
  assert.equal(summary.ingestion.helperCommands?.sampleTalk, "node src/index.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest.' --refresh-foundation");
  assert.equal(summary.ingestion.helperCommands?.sampleScreenshot ?? null, null);
  assert.equal(metadataOnlyCommand?.importCommands?.talk, "node src/index.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest.' --refresh-foundation");
  assert.equal(metadataOnlyCommand?.helperCommands?.directImports?.talk, "node src/index.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest.' --refresh-foundation");
  assert.equal(metadataOnlyCommand?.importMaterialCommand, "node src/index.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest.' --refresh-foundation");
  assert.match(summary.promptPreview, /sample talk: metadata-only -> node src\/index\.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest\.' --refresh-foundation @ samples\/metadata-only-materials\.json/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake missing — create imports, README\.md, materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.' \| import node src\/index\.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest\.' --refresh-foundation/);
});

test('buildSummary prefers a profile-local starter manifest once intake scaffolding is ready', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(summary.ingestion.intakeReadyProfileCount, 1);
  assert.equal(summary.ingestion.intakeImportAllCommand, 'node src/index.js import intake --all --refresh-foundation');
  assert.equal(metadataOnlyCommand.personId, 'metadata-only');
  assert.equal(metadataOnlyCommand.intakeReady, true);
  assert.equal(metadataOnlyCommand.intakeCompletion, 'ready');
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'ready');
  assert.equal(metadataOnlyCommand.importIntakeCommand, "node src/index.js import intake --person 'metadata-only' --refresh-foundation");
  assert.equal(metadataOnlyCommand.importManifestCommand, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.equal(metadataOnlyCommand.importMaterialCommand, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(metadataOnlyCommand.intakePaths, [
    'profiles/metadata-only/imports',
    'profiles/metadata-only/imports/README.md',
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\) \| shortcut node src\/index\.js import intake --person 'metadata-only' --refresh-foundation \| import node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
});

test('buildSummary summarizes partially scaffolded intake status for metadata-only profiles', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'README.md'),
    '# Partial intake scaffold\n',
  );

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(metadataOnlyCommand.intakeReady, false);
  assert.equal(metadataOnlyCommand.intakeCompletion, 'partial');
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'partial — missing materials.template.json, sample.txt');
  assert.match(
    summary.promptPreview,
    /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake partial — missing materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/,
  );
});

test('buildSummary suppresses broken intake import shortcuts when a profile-local starter manifest is invalid', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(metadataOnlyCommand.intakeReady, true);
  assert.equal(metadataOnlyCommand.intakeManifestStatus, 'invalid');
  assert.match(metadataOnlyCommand.intakeManifestError, /missing file/);
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'invalid manifest — repair materials.template.json');
  assert.equal(metadataOnlyCommand.importIntakeCommand, null);
  assert.equal(metadataOnlyCommand.importManifestCommand, null);
  assert.equal(metadataOnlyCommand.importMaterialCommand, null);
  assert.equal(metadataOnlyCommand.helperCommands.importIntake, null);
  assert.equal(metadataOnlyCommand.helperCommands.importManifest, null);
  assert.equal(summary.ingestion.helperCommands.importIntakeBundle, null);
  assert.match(
    summary.promptPreview,
    /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake invalid manifest — repair materials\.template\.json \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/,
  );
  assert.doesNotMatch(summary.promptPreview, /shortcut node src\/index\.js import intake --person 'metadata-only' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /import node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
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
    importedIntakeBackfillProfileCount: 0,
    intakeReadyProfileCount: 0,
    intakePartialProfileCount: 0,
    intakeMissingProfileCount: 0,
    intakeScaffoldProfileCount: 0,
    intakeStaleProfileCount: 0,
    intakeImportAllCommand: 'node src/index.js import intake --all --refresh-foundation',
    intakeImportStaleCommand: 'node src/index.js import intake --stale --refresh-foundation',
    supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
    bootstrapProfileCommand: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
    intakeAllCommand: 'node src/index.js update intake --all',
    intakeStaleCommand: 'node src/index.js update intake --stale',
    intakeImportedCommand: 'node src/index.js update intake --imported',
    sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
    importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
    importManifestAndRefreshCommand: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
    refreshAllFoundationCommand: 'node src/index.js update foundation --all',
    sampleManifestPath: null,
    sampleManifestPresent: false,
    sampleManifestStatus: 'missing',
    sampleManifestEntryCount: 0,
    sampleManifestProfileIds: [],
    sampleManifestProfileLabels: [],
    sampleManifestFilePaths: [],
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
    sampleFileCommands: [],
    sampleInlineCommands: [],
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    refreshFoundationBundleCommand: null,
    helperCommands: {
      bootstrap: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
      scaffoldAll: 'node src/index.js update intake --all',
      scaffoldStale: 'node src/index.js update intake --stale',
      scaffoldImported: 'node src/index.js update intake --imported',
      scaffoldBundle: null,
      scaffoldImportedBundle: null,
      importManifest: 'node src/index.js import manifest --file <manifest.json>',
      importManifestAndRefresh: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
      importIntakeAll: 'node src/index.js import intake --all --refresh-foundation',
      importIntakeStale: 'node src/index.js import intake --stale --refresh-foundation',
      importIntakeBundle: null,
      updateProfileBundle: null,
      updateProfileAndRefreshBundle: null,
      refreshAllFoundation: 'node src/index.js update foundation --all',
      refreshStaleFoundation: 'node src/index.js update foundation --stale',
      refreshFoundationBundle: null,
      sampleStarter: null,
      sampleManifest: null,
      sampleText: null,
      sampleMessage: null,
      sampleTalk: null,
      sampleScreenshot: null,
    },
    profileCommands: [],
    allProfileCommands: [],
    metadataProfileCommands: [],
  });

  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /profiles: 0 total \(0 imported, 0 metadata-only\)/);
  assert.match(summary.promptPreview, /intake scaffolds: 0 ready, 0 partial, 0 missing/);
  assert.match(summary.promptPreview, /imports: message, screenshot, talk, text/);
  assert.match(summary.promptPreview, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(summary.promptPreview, /helpers: scaffold-all node src\/index\.js update intake --all \| scaffold-stale node src\/index\.js update intake --stale \| scaffold-imported node src\/index\.js update intake --imported \| manifest node src\/index\.js import manifest --file <manifest\.json> \| manifest\+refresh node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation \| import-all node src\/index\.js import intake --all --refresh-foundation \| import-stale node src\/index\.js import intake --stale --refresh-foundation \| refresh-all node src\/index\.js update foundation --all \| refresh node src\/index\.js update foundation --stale/);
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
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['Starter Person (starter-person)']);
  assert.deepEqual(summary.ingestion.sampleManifestFilePaths, ['samples/starter-post.txt']);
  assert.equal(summary.ingestion.sampleManifestError, null);
  assert.equal(summary.ingestion.sampleStarterCommand, 'node src/index.js import sample');
  assert.equal(summary.ingestion.sampleStarterLabel, 'Starter Person (starter-person)');
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.deepEqual(summary.ingestion.sampleManifestMaterialTypes, { text: 1 });
  assert.equal(summary.ingestion.sampleTextPath, 'samples/starter-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'starter-person');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person starter-person --file 'samples/starter-post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[manifest\] for Starter Person \(starter-person\)/);
  assert.match(summary.promptPreview, /sample manifest: 1 entry for Starter Person \(starter-person\) \(text:1\) -> node src\/index\.js import manifest --file 'samples\/starter-materials\.json' --refresh-foundation/);
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

test('buildSummary surfaces additional file-backed sample commands from the selected manifest', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });
  fs.writeFileSync(path.join(sampleDir, 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(path.join(sampleDir, 'harry-chat.png'), 'fake image bytes');
  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'harry-post.txt',
        },
        {
          type: 'screenshot',
          file: 'harry-chat.png',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.ingestion.sampleFileCommands, [
    {
      type: 'text',
      path: 'samples/harry-post.txt',
      personId: 'harry-han',
      sourcePath: 'samples/harry-materials.json',
      command: "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation",
    },
    {
      type: 'screenshot',
      path: 'samples/harry-chat.png',
      personId: 'harry-han',
      sourcePath: 'samples/harry-materials.json',
      command: "node src/index.js import screenshot --person harry-han --file 'samples/harry-chat.png' --refresh-foundation",
    },
  ]);
  assert.equal(summary.ingestion.helperCommands?.sampleText, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.equal(summary.ingestion.helperCommands?.sampleMessage ?? null, null);
  assert.equal(summary.ingestion.helperCommands?.sampleTalk ?? null, null);
  assert.equal(summary.ingestion.helperCommands?.sampleScreenshot, "node src/index.js import screenshot --person harry-han --file 'samples/harry-chat.png' --refresh-foundation");
  assert.match(summary.promptPreview, /helpers: .*sample-text node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation/);
  assert.match(summary.promptPreview, /helpers: .*sample-screenshot node src\/index\.js import screenshot --person harry-han --file 'samples\/harry-chat\.png' --refresh-foundation/);
  assert.match(summary.promptPreview, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation @ samples\/harry-materials\.json/);
  assert.match(summary.promptPreview, /sample screenshot: harry-han -> node src\/index\.js import screenshot --person harry-han --file 'samples\/harry-chat\.png' --refresh-foundation @ samples\/harry-materials\.json/);
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
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['Harry Han (harry-han)']);
  assert.equal(summary.ingestion.sampleStarterLabel, 'Harry Han (harry-han)');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry sample post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[manifest\] for Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /sample manifest: 1 entry for Harry Han \(harry-han\) \(text:1\) -> node src\/index\.js import manifest --file 'samples\/harry sample materials\.json' --refresh-foundation/);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSummary, runImportCommand, runUpdateCommand } from '../src/index.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-work-loop-'));
}

function seedReadyFoundationRepo(rootDir: string) {
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });

  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nRepo memory guidance.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Daily note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'repo.md'), 'Long-term note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'next.md'), 'Scratch note.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\nUse cron carefully.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nStable soul guidance.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nStable voice guidance.\n');
}

test('buildSummary work loop advances to ingestion when the base foundation is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.priorityCount, 4);
  assert.equal(summary.workLoop.readyPriorityCount, 1);
  assert.equal(summary.workLoop.queuedPriorityCount, 3);
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"');
  assert.match(summary.workLoop.currentPriority.summary, /0 imported/);
  assert.deepEqual(
    summary.workLoop.priorities.map((priority: { id: string }) => priority.id),
    ['foundation', 'ingestion', 'channels', 'providers'],
  );
  assert.equal(summary.workLoop.priorities[0].status, 'ready');
  assert.match(summary.workLoop.priorities[2].summary, /4 pending/);
  assert.deepEqual(summary.workLoop.priorities[2].paths, ['manifests/channels.json', 'src/channels/slack.js']);
  assert.match(summary.workLoop.priorities[3].summary, /6 pending/);
  assert.deepEqual(summary.workLoop.priorities[3].paths, ['manifests/providers.json', 'src/models/openai.js']);
  assert.match(summary.promptPreview, /Work loop:/);
  assert.match(summary.promptPreview, /priorities: 4 total \(1 ready, 3 queued\)/);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 0 imported, 0 metadata-only, 0 ready, 0 queued for refresh/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>"/);
  assert.match(summary.promptPreview, /order: foundation:ready \| ingestion:queued \| channels:queued \| providers:queued/);
});

test('buildSummary work loop keeps foundation first when repo-core coverage is still thin', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Only one bucket seeded.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.match(summary.workLoop.currentPriority.summary, /core .* ready/i);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold missing or thin core foundation areas — starting with create memory/README.md | add at least one entry under memory/long-term and memory/scratch');
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.core.maintenance.helperCommands.scaffoldAll);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['memory/README.md', 'memory/long-term', 'memory/scratch', 'skills/', 'SOUL.md', 'voice/README.md']);
  assert.equal(summary.workLoop.priorities[1].status, 'queued');
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 0\/4 ready; profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /paths: memory\/README\.md, memory\/long-term, memory\/scratch/);
});

test('buildSummary work loop prefers the checked-in sample manifest when the repo is otherwise ready for first imports', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'harry-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import the checked-in sample target profile for harry-han');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js import sample');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json', 'samples/harry-post.txt']);
  assert.match(summary.promptPreview, /next action: import the checked-in sample target profile for harry-han/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import sample/);
  assert.match(summary.promptPreview, /paths: samples\/harry-materials\.json, samples\/harry-post\.txt/);
});

test('buildSummary work loop uses plural wording when the checked-in sample manifest spans multiple starter profiles', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(path.join(rootDir, 'samples', 'jane-post.txt'), 'Refine tomorrow after we ship today.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      profiles: [
        { personId: 'Harry Han', displayName: 'Harry Han' },
        { personId: 'Jane Doe', displayName: 'Jane Doe' },
      ],
      entries: [
        {
          personId: 'Harry Han',
          type: 'text',
          file: 'harry-post.txt',
        },
        {
          personId: 'Jane Doe',
          type: 'text',
          file: 'jane-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleStarterLabel, 'Harry Han (harry-han), Jane Doe (jane-doe)');
  assert.deepEqual(summary.ingestion.sampleManifestFilePaths, ['samples/harry-post.txt', 'samples/jane-post.txt']);
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import the checked-in sample target profiles for Harry Han (harry-han), Jane Doe (jane-doe)');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js import sample');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json', 'samples/harry-post.txt', 'samples/jane-post.txt']);
  assert.match(summary.promptPreview, /next action: import the checked-in sample target profiles for Harry Han \(harry-han\), Jane Doe \(jane-doe\)/);
});

test('buildSummary work loop points first-run ingestion at an invalid checked-in sample manifest before generic bootstrap', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'fix the checked-in sample manifest for first imports');
  assert.equal(summary.workLoop.currentPriority.command, null);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json']);
  assert.match(summary.promptPreview, /next action: fix the checked-in sample manifest for first imports/);
  assert.match(summary.promptPreview, /paths: samples\/harry-materials\.json/);
  assert.match(summary.promptPreview, /sample manifest invalid: .* @ samples\/harry-materials\.json/);
});

test('buildSummary work loop scaffolds intake before suggesting imports for metadata-only profiles', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold the intake landing zone for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports',
    'profiles/metadata-only/imports/README.md',
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: scaffold the intake landing zone for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports, profiles\/metadata-only\/imports\/README\.md, profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop completes partially scaffolded intake landing zones before suggesting imports', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'README.md'),
    '# Partial intake scaffold\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'complete the intake landing zone for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: complete the intake landing zone for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop prioritizes partially scaffolded intake profiles over fully missing ones', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'alpha-missing'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'alpha-missing', 'profile.json'),
    JSON.stringify({
      personId: 'alpha-missing',
      displayName: 'Alpha Missing',
      summary: 'No intake scaffold yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );

  fs.mkdirSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'zeta-partial', 'profile.json'),
    JSON.stringify({
      personId: 'zeta-partial',
      displayName: 'Zeta Partial',
      summary: 'Needs the intake scaffold completed.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'zeta-partial', 'imports', 'README.md'),
    '# Partial intake scaffold\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'complete incomplete intake landing zones — starting with Zeta Partial (zeta-partial)');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js update intake --stale');
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/zeta-partial/imports/materials.template.json',
    'profiles/zeta-partial/imports/sample.txt',
    'profiles/alpha-missing/imports',
    'profiles/alpha-missing/imports/README.md',
    'profiles/alpha-missing/imports/materials.template.json',
    'profiles/alpha-missing/imports/sample.txt',
  ]);
});

test('buildSummary work loop targets metadata-only profiles with their direct import command when one is runnable', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'metadata-only.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'metadata-only.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import text --person metadata-only --file 'samples/metadata-only.txt' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/metadata-only.txt']);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 0 imported, 1 metadata-only, 0 ready, 0 queued for refresh/);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import text --person metadata-only --file 'samples\/metadata-only\.txt' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/metadata-only\.txt/);
});

test('buildSummary work loop prefers a matching sample screenshot import when no direct sample text is available', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
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
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import screenshot --person metadata-only --file 'samples/metadata-only-chat.png' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/metadata-only-chat.png']);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import screenshot --person metadata-only --file 'samples\/metadata-only-chat\.png' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/metadata-only-chat\.png/);
});

test('buildSummary work loop still scaffolds intake before inline sample talk imports become runnable', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
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
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold the intake landing zone for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.match(summary.promptPreview, /sample talk: metadata-only -> node src\/index\.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest\.' --refresh-foundation/);
});

test('buildSummary work loop prefers the profile-local starter manifest over fallback sample manifests for metadata-only profiles', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'starter-post.txt'), 'Starter profile draft.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'starter-materials.json'),
    JSON.stringify({
      personId: 'starter-person',
      entries: [
        {
          type: 'text',
          file: 'starter-post.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop prefers the profile-local starter manifest once intake scaffolding is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop ignores broken sample manifests when a profile-local starter manifest is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /paths: samples\/harry-materials\.json/);
});

test('buildSummary work loop includes manifest-backed file assets when a ready intake manifest is the next import step', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const intakeDir = path.join(rootDir, 'profiles', 'metadata-only', 'imports');
  fs.writeFileSync(path.join(intakeDir, 'metadata-shot.png'), 'fake screenshot bytes\n');
  fs.writeFileSync(
    path.join(intakeDir, 'materials.template.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      entries: [
        { type: 'text', file: 'sample.txt' },
        { type: 'screenshot', file: 'metadata-shot.png' },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
    'profiles/metadata-only/imports/metadata-shot.png',
  ]);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt, profiles\/metadata-only\/imports\/metadata-shot\.png/);
});

test('buildSummary work loop bundles ready intake manifest imports when multiple metadata-only profiles are ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  ['Alpha Ready', 'Beta Ready'].forEach((personId) => {
    const personSlug = personId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const profileDir = path.join(rootDir, 'profiles', personSlug);
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, 'profile.json'),
      JSON.stringify({
        personId,
        displayName: personId,
        summary: `${personId} profile scaffold without imported materials yet.`,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      }, null, 2),
    );
    runUpdateCommand(rootDir, 'intake', {
      person: personId,
      'display-name': personId,
      summary: `${personId} profile scaffold without imported materials yet.`,
    });

    if (personSlug === 'beta-ready') {
      const intakeDir = path.join(profileDir, 'imports');
      fs.writeFileSync(path.join(intakeDir, 'beta-shot.png'), 'fake screenshot bytes\n');
      fs.writeFileSync(
        path.join(intakeDir, 'materials.template.json'),
        JSON.stringify({
          personId,
          entries: [
            { type: 'text', file: 'sample.txt' },
            { type: 'screenshot', file: 'beta-shot.png' },
          ],
        }, null, 2),
      );
    }
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for ready intake profiles — starting with Alpha Ready (alpha-ready)');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js import intake --stale');
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/alpha-ready/imports/materials.template.json',
    'profiles/alpha-ready/imports/sample.txt',
    'profiles/beta-ready/imports/materials.template.json',
    'profiles/beta-ready/imports/sample.txt',
    'profiles/beta-ready/imports/beta-shot.png',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for ready intake profiles — starting with Alpha Ready \(alpha-ready\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import intake --stale/);
  assert.match(summary.promptPreview, /paths: profiles\/alpha-ready\/imports\/materials\.template\.json, profiles\/alpha-ready\/imports\/sample\.txt, profiles\/beta-ready\/imports\/materials\.template\.json, profiles\/beta-ready\/imports\/sample\.txt, profiles\/beta-ready\/imports\/beta-shot\.png/);
});

test('buildSummary work loop points delivery setup at the env template once foundation and ingestion are ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'SLACK_BOT_TOKEN=\nOPENAI_API_KEY=\n');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.equal(summary.workLoop.currentPriority.command, 'cp .env.example .env');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example', 'manifests/channels.json', 'src/channels/slack.js']);
  assert.match(summary.promptPreview, /current: Channels \[queued\] — 4 pending, 0 configured/);
  assert.match(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /command: cp \.env\.example \.env/);
  assert.match(summary.promptPreview, /paths: \.env\.example, manifests\/channels\.json, src\/channels\/slack\.js/);
});

test('buildSummary work loop scaffolds the channel manifest once the queue leader is already configured', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'SLACK_BOT_TOKEN=\nSLACK_SIGNING_SECRET=\n');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  };

  process.env.SLACK_BOT_TOKEN = 'token';
  process.env.SLACK_SIGNING_SECRET = 'secret';

  try {
    runImportCommand(rootDir, 'text', {
      person: 'harry-han',
      file: 'samples/harry-post.txt',
      'refresh-foundation': true,
    });

    const summary = buildSummary(rootDir);

    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.nextAction, 'create manifests/channels.json; credentials present; next: implement inbound event handling and outbound thread replies');
    assert.equal(summary.workLoop.currentPriority.command, "mkdir -p 'manifests' && touch 'manifests/channels.json'");
    assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example', 'manifests/channels.json', 'src/channels/slack.js']);
    assert.match(summary.promptPreview, /next action: create manifests\/channels\.json; credentials present; next: implement inbound event handling and outbound thread replies/);
    assert.match(summary.promptPreview, /command: mkdir -p 'manifests' && touch 'manifests\/channels\.json'/);
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
  }
});

test('buildSummary work loop scaffolds the channel manifest when delivery setup lacks an env template', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create manifests/channels.json; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.equal(summary.workLoop.currentPriority.command, "mkdir -p 'manifests' && touch 'manifests/channels.json'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/slack.js']);
  assert.match(summary.promptPreview, /next action: create manifests\/channels\.json; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /command: mkdir -p 'manifests' && touch 'manifests\/channels\.json'/);
});

test('buildSummary work loop bundles missing channel implementations once the channel manifest exists and credentials are configured', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([{ id: 'slack', status: 'planned' }], null, 2));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
  };

  process.env.SLACK_BOT_TOKEN='***';
  process.env.SLACK_SIGNING_SECRET='***';
  process.env.TELEGRAM_BOT_TOKEN='***';
  process.env.WHATSAPP_ACCESS_TOKEN='***';
  process.env.WHATSAPP_PHONE_NUMBER_ID='***';
  process.env.FEISHU_APP_ID='***';
  process.env.FEISHU_APP_SECRET='***';

  try {
    runImportCommand(rootDir, 'text', {
      person: 'harry-han',
      file: 'samples/harry-post.txt',
      'refresh-foundation': true,
    });

    const summary = buildSummary(rootDir);

    assert.equal(summary.delivery.helperCommands.scaffoldChannelImplementationBundle, "(mkdir -p 'src/channels' && touch 'src/channels/slack.js') && (mkdir -p 'src/channels' && touch 'src/channels/telegram.js') && (mkdir -p 'src/channels' && touch 'src/channels/whatsapp.js') && (mkdir -p 'src/channels' && touch 'src/channels/feishu.js')");
    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.nextAction, 'create pending channel implementations — starting with src/channels/slack.js; credentials present; next: implement inbound event handling and outbound thread replies');
    assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.scaffoldChannelImplementationBundle);
    assert.deepEqual(summary.workLoop.currentPriority.paths, [
      'manifests/channels.json',
      'src/channels/slack.js',
      'src/channels/telegram.js',
      'src/channels/whatsapp.js',
      'src/channels/feishu.js',
    ]);
    assert.match(summary.promptPreview, /current: Channels \[queued\] — 4 pending, 4 configured/);
    assert.match(summary.promptPreview, /next action: create pending channel implementations — starting with src\/channels\/slack\.js; credentials present; next: implement inbound event handling and outbound thread replies/);
    assert.match(summary.promptPreview, /command: \(mkdir -p 'src\/channels' && touch 'src\/channels\/slack\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/telegram\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/whatsapp\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/feishu\.js'\)/);
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
    if (originalEnv.TELEGRAM_BOT_TOKEN === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalEnv.TELEGRAM_BOT_TOKEN;
    }
    if (originalEnv.WHATSAPP_ACCESS_TOKEN === undefined) {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_ACCESS_TOKEN = originalEnv.WHATSAPP_ACCESS_TOKEN;
    }
    if (originalEnv.WHATSAPP_PHONE_NUMBER_ID === undefined) {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    } else {
      process.env.WHATSAPP_PHONE_NUMBER_ID = originalEnv.WHATSAPP_PHONE_NUMBER_ID;
    }
    if (originalEnv.FEISHU_APP_ID === undefined) {
      delete process.env.FEISHU_APP_ID;
    } else {
      process.env.FEISHU_APP_ID = originalEnv.FEISHU_APP_ID;
    }
    if (originalEnv.FEISHU_APP_SECRET === undefined) {
      delete process.env.FEISHU_APP_SECRET;
    } else {
      process.env.FEISHU_APP_SECRET = originalEnv.FEISHU_APP_SECRET;
    }
  }
});

test('buildSummary work loop bundles missing provider implementations once the provider manifest exists', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([{ id: 'openai', status: 'planned' }], null, 2));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.delivery.helperCommands.scaffoldProviderImplementationBundle, "(mkdir -p 'src/models' && touch 'src/models/openai.js') && (mkdir -p 'src/models' && touch 'src/models/anthropic.js') && (mkdir -p 'src/models' && touch 'src/models/kimi.js') && (mkdir -p 'src/models' && touch 'src/models/minimax.js') && (mkdir -p 'src/models' && touch 'src/models/glm.js') && (mkdir -p 'src/models' && touch 'src/models/qwen.js')");
  assert.equal(summary.workLoop.currentPriority.id, 'providers');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create pending provider implementations — starting with src/models/openai.js; set OPENAI_API_KEY for gpt-5; next: implement chat/tool request translation and response normalization');
  assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.scaffoldProviderImplementationBundle);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/providers.json', 'src/models/openai.js', 'src/models/anthropic.js', 'src/models/kimi.js', 'src/models/minimax.js', 'src/models/glm.js', 'src/models/qwen.js']);
  assert.match(summary.promptPreview, /current: Providers \[queued\] — 6 pending, 0 configured/);
  assert.match(summary.promptPreview, /next action: create pending provider implementations — starting with src\/models\/openai\.js; set OPENAI_API_KEY for gpt-5; next: implement chat\/tool request translation and response normalization/);
  assert.match(summary.promptPreview, /command: \(mkdir -p 'src\/models' && touch 'src\/models\/openai\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/anthropic\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/kimi\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/minimax\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/glm\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/qwen\.js'\)/);
});

test('buildSummary work loop refuses to scaffold outside-repo provider implementation paths', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'active' },
    { id: 'anthropic', status: 'active' },
    { id: 'kimi', status: 'active' },
    { id: 'minimax', status: 'active' },
    { id: 'glm', status: 'active' },
    { id: 'qwen', status: 'active' },
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
      nextStep: 'implement deepseek transport adapter',
    },
  ], null, 2));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'providers');
  assert.equal(summary.workLoop.currentPriority.command, null);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'set DEEPSEEK_API_KEY for deepseek-chat; next: implement deepseek transport adapter');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/providers.json', '../outside-provider.js']);
  assert.doesNotMatch(summary.promptPreview, /outside-provider\.js'.*touch/);
});

test('buildSummary work loop points foundation refreshes at the stale profile draft paths', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });
  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Updated profile metadata without refreshing foundation drafts.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'refresh Harry Han (harry-han) — reasons profile metadata drift + draft metadata drift');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js update foundation --person harry-han');
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/harry-han/memory/long-term/foundation.json',
    'profiles/harry-han/skills/README.md',
    'profiles/harry-han/soul/README.md',
    'profiles/harry-han/voice/README.md',
  ]);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 4\/4 ready; profiles 1 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /next action: refresh Harry Han \(harry-han\) — reasons profile metadata drift \+ draft metadata drift/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update foundation --person harry-han/);
  assert.match(summary.promptPreview, /paths: profiles\/harry-han\/memory\/long-term\/foundation\.json, profiles\/harry-han\/skills\/README\.md, profiles\/harry-han\/soul\/README\.md, profiles\/harry-han\/voice\/README\.md/);
});

test('buildSummary work loop prioritizes the most incomplete stale foundation profile first', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });
  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Metadata drift without refreshing drafts yet.',
  });

  runImportCommand(rootDir, 'message', {
    person: 'jane-doe',
    text: 'Tight loops beat big plans.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js update foundation --stale');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'refresh stale or incomplete target profiles — starting with jane-doe (missing drafts + new materials)');
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/jane-doe/memory/long-term/foundation.json',
    'profiles/jane-doe/skills/README.md',
    'profiles/jane-doe/soul/README.md',
    'profiles/jane-doe/voice/README.md',
    'profiles/harry-han/memory/long-term/foundation.json',
    'profiles/harry-han/skills/README.md',
    'profiles/harry-han/soul/README.md',
    'profiles/harry-han/voice/README.md',
  ]);
  assert.match(summary.promptPreview, /next action: refresh stale or incomplete target profiles — starting with jane-doe \(missing drafts \+ new materials\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update foundation --stale/);
  assert.match(summary.promptPreview, /paths: profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md, profiles\/harry-han\/memory\/long-term\/foundation\.json, profiles\/harry-han\/skills\/README\.md, profiles\/harry-han\/soul\/README\.md, profiles\/harry-han\/voice\/README\.md/);
  assert.equal(summary.foundation.maintenance.queuedProfiles[0].id, 'jane-doe');
  assert.equal(summary.foundation.maintenance.queuedProfiles[0].generatedDraftCount, 0);
  assert.equal(summary.foundation.maintenance.queuedProfiles[1].id, 'harry-han');
  assert.equal(summary.foundation.maintenance.queuedProfiles[1].generatedDraftCount, 4);
});

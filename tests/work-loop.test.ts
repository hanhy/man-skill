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
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create memory/README.md | add at least one entry under memory/long-term and memory/scratch');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['memory/README.md', 'memory/long-term', 'memory/scratch']);
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
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import the checked-in sample target profiles for Harry Han (harry-han), Jane Doe (jane-doe)');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js import sample');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json', 'samples/harry-post.txt']);
  assert.match(summary.promptPreview, /next action: import the checked-in sample target profiles for Harry Han \(harry-han\), Jane Doe \(jane-doe\)/);
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

test('buildSummary work loop keeps sample manifest paths when metadata-only profiles need the fallback batch import', () => {
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

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for metadata-only profiles');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/starter-materials.json', 'samples/starter-post.txt']);
  assert.match(summary.promptPreview, /next action: import source materials for metadata-only profiles/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'samples\/starter-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/starter-materials\.json, samples\/starter-post\.txt/);
});

test('buildSummary work loop avoids broken sample paths when metadata-only profiles fall back to the generic manifest command', () => {
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

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for metadata-only profiles');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js import manifest --file <manifest.json>');
  assert.deepEqual(summary.workLoop.currentPriority.paths, []);
  assert.match(summary.promptPreview, /next action: import source materials for metadata-only profiles/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file <manifest\.json>/);
  assert.doesNotMatch(summary.promptPreview, /paths: samples\/harry-materials\.json/);
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

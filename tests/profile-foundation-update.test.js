import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { MaterialIngestion } from '../src/core/material-ingestion.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-foundation-update-'));
}

const cliEntrypoint = fileURLToPath(new URL('../src/index.js', import.meta.url));

test('refreshFoundationDrafts derives memory, voice, soul, and skills drafts for a profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const sourceTextPath = path.join(rootDir, 'sample.txt');
  fs.writeFileSync(sourceTextPath, 'Harry prefers blunt execution over long debate.');

  ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  ingestion.importTextDocument({
    personId: 'Harry Han',
    sourceFile: sourceTextPath,
    notes: 'blog fragment',
  });
  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
    notes: 'short chat sample',
  });
  ingestion.importTalkSnippet({
    personId: 'Harry Han',
    text: 'Cut the scope, keep the momentum, and fix the rough edges tomorrow.',
    notes: 'product execution heuristic',
  });

  const result = ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  assert.equal(result.personId, 'harry-han');

  const memoryDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json');
  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'skills', 'README.md');

  assert.equal(fs.existsSync(memoryDraftPath), true);
  assert.equal(fs.existsSync(voiceDraftPath), true);
  assert.equal(fs.existsSync(soulDraftPath), true);
  assert.equal(fs.existsSync(skillsDraftPath), true);

  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  assert.equal(memoryDraft.personId, 'harry-han');
  assert.equal(memoryDraft.displayName, 'Harry Han');
  assert.equal(memoryDraft.summary, 'Direct operator with a bias for momentum.');
  assert.equal(memoryDraft.entryCount, 3);
  assert.deepEqual(memoryDraft.materialTypes, {
    message: 1,
    talk: 1,
    text: 1,
  });
  assert.deepEqual(memoryDraft.entries.map((entry) => entry.type).sort(), ['message', 'talk', 'text']);
  assert.equal(memoryDraft.entries.some((entry) => /Cut the scope, keep the momentum/.test(entry.summary)), true);

  const voiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  assert.match(voiceDraft, /Generated at: /);
  assert.match(voiceDraft, /Latest material: .*\(.+\)/);
  assert.match(voiceDraft, /Source materials: 3 \(message:1, talk:1, text:1\)/);
  assert.match(voiceDraft, /Display name: Harry Han/);
  assert.match(voiceDraft, /Summary: Direct operator with a bias for momentum\./);
  assert.match(voiceDraft, /Representative voice excerpts/);
  assert.match(voiceDraft, /Ship the thin slice first\./);
  assert.match(voiceDraft, /Cut the scope, keep the momentum/);

  const soulDraft = fs.readFileSync(soulDraftPath, 'utf8');
  assert.match(soulDraft, /Candidate soul signals/);
  assert.match(soulDraft, /Harry prefers blunt execution over long debate\./);

  const skillsDraft = fs.readFileSync(skillsDraftPath, 'utf8');
  assert.match(skillsDraft, /Candidate procedural skills/);
  assert.match(skillsDraft, /product execution heuristic/);
});

test('CLI update foundation command writes derived profile drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
    notes: 'short chat sample',
  });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'foundation', '--person', 'Harry Han'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.personId, 'harry-han');
  assert.match(result.voiceDraftPath, /profiles\/harry-han\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, result.voiceDraftPath)), true);
});

test('refreshFoundationDrafts rejects empty profiles without imported materials', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  assert.throws(
    () => ingestion.refreshFoundationDrafts({ personId: 'Harry Han' }),
    /No imported materials found for profile harry-han/,
  );
});

test('refreshAllFoundationDrafts updates every profile with imported materials', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  ingestion.importTalkSnippet({
    personId: 'Jane Doe',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });

  const result = ingestion.refreshAllFoundationDrafts();

  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId).sort(), ['harry-han', 'jane-doe']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'jane-doe', 'skills', 'README.md')), true);
});

test('CLI update foundation --all writes derived drafts for every profile with imported materials', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  const janeSourcePath = path.join(rootDir, 'jane.txt');
  fs.writeFileSync(janeSourcePath, 'Write the brief, then tighten the edges.');
  ingestion.importTextDocument({
    personId: 'Jane Doe',
    sourceFile: janeSourcePath,
  });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'foundation', '--all'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId).sort(), ['harry-han', 'jane-doe']);
  assert.equal(result.results.every((entry) => /profiles\/.+\/voice\/README\.md$/.test(entry.voiceDraftPath)), true);
});

test('refreshStaleFoundationDrafts updates only profiles with stale or missing drafts', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Fresh Person',
    text: 'Keep it steady.',
  });
  const freshResult = ingestion.refreshFoundationDrafts({ personId: 'Fresh Person' });

  ingestion.importMessage({
    personId: 'Missing Drafts',
    text: 'Draft this next.',
  });

  ingestion.importMessage({
    personId: 'Stale Person',
    text: 'Ship the first slice.',
  });
  const staleInitial = ingestion.refreshFoundationDrafts({ personId: 'Stale Person' });
  await new Promise((resolve) => setTimeout(resolve, 15));
  ingestion.importTalkSnippet({
    personId: 'Stale Person',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId).sort(), ['missing-drafts', 'stale-person']);

  const refreshedStale = result.results.find((entry) => entry.personId === 'stale-person');
  assert.equal(refreshedStale.generatedAt > staleInitial.generatedAt, true);

  const staleMemoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'stale-person', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(staleMemoryDraft.entryCount, 2);

  const freshMemoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'fresh-person', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(freshMemoryDraft.generatedAt, freshResult.generatedAt);
});

test('refreshStaleFoundationDrafts still catches same-timestamp stale materials via latest material metadata', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const RealDate = Date;
  const fixedIso = '2026-04-16T15:00:00.000Z';

  global.Date = class extends RealDate {
    constructor(value) {
      super(value ?? fixedIso);
    }

    static now() {
      return new RealDate(fixedIso).valueOf();
    }

    static parse(value) {
      return RealDate.parse(value);
    }

    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  };

  try {
    ingestion.importMessage({
      personId: 'Stale Person',
      text: 'Ship the first slice.',
    });
    ingestion.refreshFoundationDrafts({ personId: 'Stale Person' });
    ingestion.importTalkSnippet({
      personId: 'Stale Person',
      text: 'Keep the feedback loop short.',
      notes: 'execution heuristic',
    });
  } finally {
    global.Date = RealDate;
  }

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['stale-person']);

  const staleMemoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'stale-person', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(staleMemoryDraft.entryCount, 2);
  assert.equal(staleMemoryDraft.latestMaterialId.endsWith('-talk'), true);
});

test('CLI update foundation --stale refreshes only profiles that need draft updates', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Fresh Person',
    text: 'Keep it steady.',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Fresh Person' });

  ingestion.importMessage({
    personId: 'Missing Drafts',
    text: 'Draft this next.',
  });

  ingestion.importMessage({
    personId: 'Stale Person',
    text: 'Ship the first slice.',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Stale Person' });
  await new Promise((resolve) => setTimeout(resolve, 15));
  ingestion.importTalkSnippet({
    personId: 'Stale Person',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'foundation', '--stale'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId).sort(), ['missing-drafts', 'stale-person']);
  assert.equal(result.results.every((entry) => /profiles\/.+\/memory\/long-term\/foundation\.json$/.test(entry.memoryDraftPath)), true);
});

test('refreshStaleFoundationDrafts refreshes profiles when target metadata changes after draft generation', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  const initial = ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  await new Promise((resolve) => setTimeout(resolve, 15));
  ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for fast feedback loops.',
  });

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['harry-han']);
  assert.equal(result.results[0].generatedAt > initial.generatedAt, true);

  const memoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(memoryDraft.summary, 'Direct operator with a bias for fast feedback loops.');
});

test('CLI import manifest ingests entries and can refresh foundation drafts in one step', () => {
  const rootDir = makeTempRepo();

  const textSourcePath = path.join(rootDir, 'post.txt');
  fs.writeFileSync(textSourcePath, 'Move fast, but keep the edges clean.');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        entries: [
          {
            personId: 'Harry Han',
            type: 'message',
            text: 'Ship the thin slice first.',
            notes: 'chat sample',
          },
          {
            personId: 'Harry Han',
            type: 'text',
            file: './post.txt',
            notes: 'blog fragment',
          },
        ],
      },
      null,
      2,
    ),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'manifest', '--file', './materials.json', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['harry-han']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.match(result.foundationRefresh.results[0].memoryDraftPath, /profiles\/harry-han\/memory\/long-term\/foundation\.json$/);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md')), true);
});

test('CLI update profile writes target-person metadata into profile.json', () => {
  const rootDir = makeTempRepo();

  const output = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'profile',
      '--person',
      'Harry Han',
      '--display-name',
      'Harry Han',
      '--summary',
      'Direct operator with a bias for momentum.',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.personId, 'harry-han');
  assert.equal(result.profile.displayName, 'Harry Han');
  assert.equal(result.profile.summary, 'Direct operator with a bias for momentum.');

  const profilePath = path.join(rootDir, 'profiles', 'harry-han', 'profile.json');
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  assert.equal(profile.id, 'harry-han');
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');
  assert.match(profile.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('CLI update profile can refresh foundation drafts after metadata changes', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  await new Promise((resolve) => setTimeout(resolve, 15));

  const output = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'profile',
      '--person',
      'Harry Han',
      '--display-name',
      'Harry Han',
      '--summary',
      'Direct operator with a bias for fast feedback loops.',
      '--refresh-foundation',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.personId, 'harry-han');
  assert.equal(result.profile.summary, 'Direct operator with a bias for fast feedback loops.');
  assert.match(result.foundationRefresh.memoryDraftPath, /profiles\/harry-han\/memory\/long-term\/foundation\.json$/);

  const memoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(memoryDraft.summary, 'Direct operator with a bias for fast feedback loops.');
  assert.equal(memoryDraft.generatedAt >= result.profile.updatedAt, true);
});

test('CLI import manifest can seed profile metadata before importing materials', () => {
  const rootDir = makeTempRepo();

  const textSourcePath = path.join(rootDir, 'post.txt');
  fs.writeFileSync(textSourcePath, 'Move fast, but keep the edges clean.');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        profiles: [
          {
            personId: 'Harry Han',
            displayName: 'Harry Han',
            summary: 'Direct operator with a bias for momentum.',
          },
        ],
        entries: [
          {
            personId: 'Harry Han',
            type: 'text',
            file: './post.txt',
            notes: 'blog fragment',
          },
        ],
      },
      null,
      2,
    ),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'manifest', '--file', './materials.json'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.entryCount, 1);
  assert.deepEqual(result.profileIds, ['harry-han']);

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json'), 'utf8'));
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');
});

test('CLI import manifest supports single-target shorthand metadata and inherited personId entries', () => {
  const rootDir = makeTempRepo();

  const textSourcePath = path.join(rootDir, 'post.txt');
  fs.writeFileSync(textSourcePath, 'Move fast, but keep the edges clean.');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        personId: 'Harry Han',
        displayName: 'Harry Han',
        summary: 'Direct operator with a bias for momentum.',
        entries: [
          {
            type: 'message',
            text: 'Ship the thin slice first.',
          },
          {
            type: 'text',
            file: './post.txt',
          },
        ],
      },
      null,
      2,
    ),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'manifest', '--file', './materials.json', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['harry-han']);
  assert.equal(result.foundationRefresh.profileCount, 1);

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json'), 'utf8'));
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');

  const memoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(memoryDraft.displayName, 'Harry Han');
  assert.equal(memoryDraft.entryCount, 2);
});

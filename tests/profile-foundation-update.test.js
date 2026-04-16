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
  assert.equal(memoryDraft.entryCount, 3);
  assert.deepEqual(memoryDraft.entries.map((entry) => entry.type).sort(), ['message', 'talk', 'text']);
  assert.equal(memoryDraft.entries.some((entry) => /Cut the scope, keep the momentum/.test(entry.summary)), true);

  const voiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
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

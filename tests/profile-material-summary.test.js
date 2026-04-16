import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemLoader } from '../src/core/fs-loader.js';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { PromptAssembler } from '../src/core/prompt-assembler.js';

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
  assert.equal(profile.materialCount, 3);
  assert.equal(profile.screenshotCount, 1);
  assert.deepEqual(profile.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.match(profile.latestMaterialAt, /^\d{4}-\d{2}-\d{2}T/);
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
  assert.equal(profile.foundationDraftSummaries.memory.entryCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.memory.latestSummaries.slice().sort(), ['Direct writing sample.', 'Ship the first slice.']);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.deepEqual(profile.foundationDraftSummaries.voice.highlights.slice().sort(), [
    '- [message] Ship the first slice.',
    '- [text] Direct writing sample.',
  ]);
  assert.deepEqual(profile.foundationDraftSummaries.soul, {
    generated: true,
    highlights: ['- [text] Direct writing sample.'],
  });
  assert.deepEqual(profile.foundationDraftSummaries.skills, {
    generated: true,
    highlights: [],
  });
  assert.deepEqual(profile.foundationReadiness.memory.latestTypes.slice().sort(), ['message', 'screenshot', 'text']);
  assert.equal(profile.foundationReadiness.memory.candidateCount, 3);
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
    channels: [],
    models: [],
    profiles: [
      {
        id: 'harry-han',
        materialCount: 3,
        materialTypes: { text: 1, message: 1, screenshot: 1 },
        latestMaterialAt: '2026-04-16T15:00:00.000Z',
        foundationReadiness: {
          memory: { candidateCount: 3, latestTypes: ['screenshot', 'message', 'text'] },
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
          memory: { generated: true, entryCount: 3, latestSummaries: ['Ship the first slice.', 'Direct writing sample.'] },
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
          memory: { candidateCount: 1, latestTypes: ['talk'] },
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
  }).buildSystemPrompt();

  assert.match(prompt, /Profiles:/);
  assert.match(prompt, /"jane-doe"/);
  assert.match(prompt, /Profile foundation snapshots:/);
  assert.match(prompt, /- harry-han: 3 materials \(message:1, screenshot:1, text:1\)/);
  assert.match(prompt, /drafts: fresh, complete, generated 2026-04-16T15:00:01.000Z/);
  assert.match(prompt, /memory candidates: 3 \| voice: 2 \| soul: 1 \| skills: 0/);
  assert.match(prompt, /voice highlights: \[message\] Ship the first slice\./);
  assert.match(prompt, /- jane-doe: 1 material \(talk:1\)/);
  assert.match(prompt, /drafts: stale, missing memory\/skills\/soul\/voice/);
  assert.match(prompt, /skills signals: execution heuristic/);
  assert.match(prompt, /Ship the first slice\./);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFoundationRollup } from '../src/core/foundation-rollup.js';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { buildSummary } from '../src/index.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-foundation-rollup-'));
}

test('buildFoundationRollup aggregates generated, stale, and candidate foundation signals across profiles', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'harry-han',
      materialCount: 2,
      foundationDraftStatus: { needsRefresh: false },
      foundationDraftSummaries: {
        memory: { generated: true, entryCount: 2, latestSummaries: ['Ship the first slice.', 'Keep the scope tight.'] },
        voice: { generated: true, highlights: ['- [message] Ship the first slice.'] },
        soul: { generated: true, highlights: ['- [text] Keep the scope tight.'] },
        skills: { generated: true, highlights: ['- execution heuristic'] },
      },
      foundationReadiness: {
        memory: { candidateCount: 2, sampleSummaries: ['Ship the first slice.', 'Keep the scope tight.'] },
        voice: { candidateCount: 2, sampleExcerpts: ['Ship the first slice.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Keep the scope tight.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
    },
    {
      id: 'jane-doe',
      materialCount: 1,
      foundationDraftStatus: { needsRefresh: true },
      foundationDraftSummaries: {
        memory: { generated: false, entryCount: 0, latestSummaries: [] },
        voice: { generated: false, highlights: [] },
        soul: { generated: false, highlights: [] },
        skills: { generated: false, highlights: [] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Tight loops beat big plans.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Tight loops beat big plans.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Tight loops beat big plans.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['feedback-loop heuristic'] },
      },
    },
  ]);

  assert.deepEqual(rollup.memory, {
    profileCount: 2,
    generatedProfileCount: 1,
    repoStaleProfileCount: 1,
    totalEntries: 2,
    highlights: ['Ship the first slice.', 'Keep the scope tight.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(rollup.voice, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    highlights: ['[message] Ship the first slice.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(rollup.soul, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    highlights: ['[text] Keep the scope tight.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(rollup.skills, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateCount: 2,
    highlights: ['execution heuristic', 'feedback-loop heuristic'],
  });
});

test('buildSummary exposes a repository foundation rollup and prompt preview mentions it', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    Array.from({ length: 80 }, (_, index) => `Voice line ${index + 1}: keep it sharp.`).join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  ingestion.importTalkSnippet({
    personId: 'Harry Han',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  ingestion.importTalkSnippet({
    personId: 'Jane Doe',
    text: 'Tight loops beat big plans.',
    notes: 'feedback-loop heuristic',
  });

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.memory, {
    profileCount: 2,
    generatedProfileCount: 1,
    repoStaleProfileCount: 1,
    totalEntries: 2,
    highlights: ['Keep the feedback loop short.', 'Ship the thin slice first.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(summary.foundation.skills, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateCount: 2,
    highlights: ['execution heuristic', 'feedback-loop heuristic'],
  });
  assert.match(summary.promptPreview, /Foundation rollup:/);
});

test('buildSummary omits the foundation rollup block from prompt previews when there are no imported profiles', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile exists, but no materials were imported.',
  });

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.memory, {
    profileCount: 0,
    generatedProfileCount: 0,
    repoStaleProfileCount: 0,
    totalEntries: 0,
    highlights: [],
  });
  assert.doesNotMatch(summary.promptPreview, /Foundation rollup:/);
});

test('buildSummary exposes core foundation diagnostics for repo memory, skills, soul, and voice', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'obsidian'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'obsidian', 'SKILL.md'), '# Obsidian skill');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.\n- Prefer momentum over hedging.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.\nPreserve clear priorities.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    dailyCount: 1,
    longTermCount: 1,
    scratchCount: 1,
    totalEntries: 3,
  });
  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 2,
    undocumentedCount: 0,
    sample: ['obsidian', 'telegram'],
    undocumentedSample: [],
  });
  assert.deepEqual(summary.foundation.core.soul, {
    present: true,
    lineCount: 2,
    excerpt: 'Build a faithful operator core.',
  });
  assert.deepEqual(summary.foundation.core.voice, {
    present: true,
    lineCount: 2,
    excerpt: 'Keep replies direct.',
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 4,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: [],
    recommendedActions: [],
  });
  assert.match(summary.promptPreview, /Core foundation:/);
  assert.match(summary.promptPreview, /coverage: 4\/4 ready/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1/);
  assert.match(summary.promptPreview, /skills: 2 registered, 2 documented \(obsidian, telegram\)/);
  assert.match(summary.promptPreview, /soul: present, 2 lines, Build a faithful operator core\./);
  assert.match(summary.promptPreview, /voice: present, 2 lines, Keep replies direct\./);
});

test('buildSummary flags missing and thin core foundation areas in the prompt preview', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 0,
    totalAreaCount: 4,
    missingAreas: ['skills', 'voice'],
    thinAreas: ['memory', 'soul'],
    recommendedActions: [
      'add at least one entry under memory/daily, memory/long-term, or memory/scratch',
      'create skills/<name>/SKILL.md for at least one repo skill',
      'add non-heading guidance to SOUL.md',
      'create voice/README.md',
    ],
  });
  assert.match(summary.promptPreview, /coverage: 0\/4 ready; missing skills, voice; thin memory, soul/);
  assert.match(summary.promptPreview, /next actions: add at least one entry under memory\/daily, memory\/long-term, or memory\/scratch \| create skills\/\<name\>\/SKILL\.md for at least one repo skill \| add non-heading guidance to SOUL\.md \| create voice\/README\.md/);
});

test('buildSummary treats placeholder skill directories as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 0,
    undocumentedCount: 2,
    sample: ['slack', 'telegram'],
    undocumentedSample: ['slack', 'telegram'],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['document placeholder skill folders with SKILL.md'],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills: 2 registered, 0 documented \(slack, telegram\); placeholders: slack, telegram/);
});

test('buildSummary keeps mixed documented and placeholder skills thin until all skill folders carry SKILL docs', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 1,
    undocumentedCount: 1,
    sample: ['slack', 'telegram'],
    undocumentedSample: ['slack'],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['document placeholder skill folders with SKILL.md'],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(slack, telegram\); placeholders: slack/);
});

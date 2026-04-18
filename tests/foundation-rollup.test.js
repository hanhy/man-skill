import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFoundationRollup } from '../src/core/foundation-rollup.js';
import { buildFoundationRollup as buildFoundationRollupTs } from '../src/core/foundation-rollup.ts';
import { buildCoreFoundationCommand } from '../src/core/foundation-core-commands.ts';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { buildSummary } from '../src/index.js';

const VOICE_STARTER_TEMPLATE = '# Voice\n\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n';
const VOICE_GUIDANCE_SENTINEL = '- Describe the target cadence, directness, and emotional texture here.';
const SOUL_GUIDANCE_SENTINEL = '- Describe the durable values and goals that should survive across tasks.';
const SOUL_SECTIONS = [
  {
    heading: '## Core values',
    sentinel: '- Describe the durable values and goals that should survive across tasks.',
    missingSectionAppend: '\n## Core values\n- Describe the durable values and goals that should survive across tasks.\n',
    existingBulletAppend: '- Describe the durable values and goals that should survive across tasks.\n',
  },
  {
    heading: '## Boundaries',
    sentinel: '- Capture what the agent should protect or refuse to compromise.',
    missingSectionAppend: '\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n',
    existingBulletAppend: '- Capture what the agent should protect or refuse to compromise.\n',
  },
  {
    heading: '## Decision rules',
    sentinel: '- Note the principles to use when tradeoffs appear.',
    missingSectionAppend: '\n## Decision rules\n- Note the principles to use when tradeoffs appear.\n',
    existingBulletAppend: '- Note the principles to use when tradeoffs appear.\n',
  },
];

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function buildDocumentRepairCommand(filePath, _sentinel, sections) {
  const file = shellSingleQuote(filePath);
  const buildSectionHasContentCommand = (heading) => [
    'awk',
    `-v heading=${shellSingleQuote(heading)}`,
    shellSingleQuote("BEGIN { in_section = 0; has_content = 0 } $0 == heading { in_section = 1; next } /^## / { if (in_section) exit } in_section && $0 !~ /^[[:space:]]*$/ { has_content = 1 } END { exit has_content ? 0 : 1 }"),
    file,
  ].join(' ');
  const sectionCommands = sections.map((section) =>
    `if grep -Fqx -- ${shellSingleQuote(section.heading)} ${file}; then ${buildSectionHasContentCommand(section.heading)} || printf %s ${shellSingleQuote(section.existingBulletAppend)} >> ${file}; else printf %s ${shellSingleQuote(section.missingSectionAppend)} >> ${file}; fi`,
  );

  return `{ ${sectionCommands.join('; ')}; }`;
}

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-foundation-rollup-'));
}

test('JS foundation rollup shim stays aligned with the TypeScript implementation', () => {
  const profiles = [
    {
      id: 'harry-han',
      materialCount: 2,
      profile: { displayName: 'Harry Han', summary: 'Keeps loops short.' },
      latestMaterialAt: '2026-04-19T01:00:00.000Z',
      foundationDraftStatus: { needsRefresh: false, complete: true, missingDrafts: [], refreshReasons: [] },
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
      profile: { displayName: 'Jane Doe', summary: 'Tight loops beat big plans.' },
      latestMaterialAt: '2026-04-19T01:05:00.000Z',
      foundationDraftStatus: { needsRefresh: true, complete: false, missingDrafts: ['memory', 'skills', 'soul', 'voice'], refreshReasons: ['missing drafts', 'new materials'] },
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
  ];

  assert.deepEqual(buildFoundationRollup(profiles), buildFoundationRollupTs(profiles));
});

test('buildFoundationRollup aggregates generated, stale, and candidate foundation signals across profiles', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'harry-han',
      materialCount: 2,
      foundationDraftStatus: { needsRefresh: false, complete: true, missingDrafts: [], refreshReasons: [] },
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
      foundationDraftStatus: { needsRefresh: true, complete: false, missingDrafts: ['memory', 'skills', 'soul', 'voice'], refreshReasons: ['missing drafts'] },
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
  assert.deepEqual(rollup.maintenance, {
    profileCount: 2,
    readyProfileCount: 1,
    refreshProfileCount: 1,
    incompleteProfileCount: 1,
    missingDraftCounts: {
      memory: 1,
      skills: 1,
      soul: 1,
      voice: 1,
    },
    refreshReasonCounts: {
      'missing drafts': 1,
    },
    refreshAllCommand: 'node src/index.js update foundation --all',
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    refreshBundleCommand: 'node src/index.js update foundation --person jane-doe',
    helperCommands: {
      refreshAll: 'node src/index.js update foundation --all',
      refreshStale: 'node src/index.js update foundation --stale',
      refreshBundle: 'node src/index.js update foundation --person jane-doe',
    },
    queuedProfiles: [
      {
        id: 'jane-doe',
        displayName: null,
        summary: null,
        label: 'jane-doe',
        status: 'stale',
        generatedDraftCount: 0,
        expectedDraftCount: 4,
        candidateDraftCount: 4,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts'],
        latestMaterialAt: null,
        refreshCommand: 'node src/index.js update foundation --person jane-doe',
      },
    ],
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
  assert.deepEqual(summary.foundation.maintenance, {
    profileCount: 2,
    readyProfileCount: 1,
    refreshProfileCount: 1,
    incompleteProfileCount: 1,
    missingDraftCounts: {
      memory: 1,
      skills: 1,
      soul: 1,
      voice: 1,
    },
    refreshReasonCounts: {
      'missing drafts': 1,
      'new materials': 1,
    },
    refreshAllCommand: 'node src/index.js update foundation --all',
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    refreshBundleCommand: 'node src/index.js update foundation --person jane-doe',
    helperCommands: {
      refreshAll: 'node src/index.js update foundation --all',
      refreshStale: 'node src/index.js update foundation --stale',
      refreshBundle: 'node src/index.js update foundation --person jane-doe',
    },
    queuedProfiles: [
      {
        id: 'jane-doe',
        displayName: 'Jane Doe',
        summary: null,
        label: 'Jane Doe (jane-doe)',
        status: 'stale',
        generatedDraftCount: 0,
        expectedDraftCount: 4,
        candidateDraftCount: 4,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
        latestMaterialAt: summary.foundation.maintenance.queuedProfiles[0].latestMaterialAt,
        refreshCommand: 'node src/index.js update foundation --person jane-doe',
      },
    ],
  });
  assert.match(summary.foundation.maintenance.queuedProfiles[0].latestMaterialAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /drafts: 1 ready, 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /helpers: .*refresh-all node src\/index\.js update foundation --all .* refresh-bundle node src\/index\.js update foundation --person jane-doe/);
  assert.match(summary.promptPreview, /Ingestion entrance:[\s\S]*drafts: 1 ready, 1 queued for refresh, 1 incomplete[\s\S]*refresh-bundle node src\/index\.js update foundation --person jane-doe/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest .* \| refresh node src\/index\.js update foundation --person jane-doe/);
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

test('buildSummary keeps ready core foundation areas visible in the prompt preview', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'obsidian'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'obsidian', 'SKILL.md'), '# Obsidian skill\n\nCapture durable operator notes.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.\n- Prefer momentum over hedging.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.\nPreserve clear priorities.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    rootPath: 'memory/README.md',
    rootExcerpt: 'Keep durable notes here.',
    dailyCount: 1,
    longTermCount: 1,
    scratchCount: 1,
    totalEntries: 3,
    readyBucketCount: 3,
    totalBucketCount: 3,
    populatedBuckets: ['daily', 'long-term', 'scratch'],
    emptyBuckets: [],
    sampleEntries: ['daily/2026-04-16.md', 'long-term/operator.json', 'scratch/draft.txt'],
  });
  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 2,
    undocumentedCount: 0,
    thinCount: 0,
    sample: ['obsidian', 'telegram'],
    samplePaths: ['skills/obsidian/SKILL.md', 'skills/telegram/SKILL.md'],
    sampleExcerpts: ['obsidian: Capture durable operator notes.', 'telegram: Deliver concise thread updates.'],
    undocumentedSample: [],
    undocumentedPaths: [],
    thinSample: [],
    thinPaths: [],
  });
  assert.deepEqual(summary.foundation.core.soul, {
    present: true,
    path: 'SOUL.md',
    lineCount: 2,
    excerpt: 'Build a faithful operator core.',
    structured: false,
    readySectionCount: 3,
    totalSectionCount: 3,
    missingSections: [],
  });
  assert.deepEqual(summary.foundation.core.voice, {
    present: true,
    path: 'voice/README.md',
    lineCount: 2,
    excerpt: 'Keep replies direct.',
    structured: false,
    readySectionCount: 4,
    totalSectionCount: 4,
    missingSections: [],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 4,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: [],
    recommendedActions: [],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 4,
    missingAreaCount: 0,
    thinAreaCount: 0,
    helperCommands: {
      scaffoldAll: null,
      scaffoldMissing: null,
      scaffoldThin: null,
      memory: null,
      skills: null,
      soul: null,
      voice: null,
    },
    queuedAreas: [],
  });
  assert.match(summary.promptPreview, /Core foundation:/);
  assert.match(summary.promptPreview, /coverage: 4\/4 ready/);
  assert.match(summary.promptPreview, /queue: 4 ready, 0 thin, 0 missing/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; samples: daily\/2026-04-16\.md, long-term\/operator\.json, scratch\/draft\.txt; root: Keep durable notes here\./);
  assert.match(summary.promptPreview, /skills: 2 registered, 2 documented \(obsidian, telegram\); docs: skills\/obsidian\/SKILL\.md, skills\/telegram\/SKILL\.md; excerpts: obsidian: Capture durable operator notes\. \| telegram: Deliver concise thread updates\./);
  assert.match(summary.promptPreview, /soul: present, 2 lines, Build a faithful operator core\. @ SOUL\.md/);
  assert.match(summary.promptPreview, /voice: present, 2 lines, Keep replies direct\. @ voice\/README\.md/);
});

test('buildSummary prefers skill frontmatter descriptions over raw yaml keys in core foundation excerpts', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    ['---', 'name: cron', 'description: Keep scheduled follow-ups reliable.', '---', '', '# Cron', '', 'Use this skill when a schedule needs setup.'].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills, {
    count: 1,
    documentedCount: 1,
    undocumentedCount: 0,
    thinCount: 0,
    sample: ['cron'],
    samplePaths: ['skills/cron/SKILL.md'],
    sampleExcerpts: ['cron: Keep scheduled follow-ups reliable.'],
    undocumentedSample: [],
    undocumentedPaths: [],
    thinSample: [],
    thinPaths: [],
  });
  assert.deepEqual(summary.skills.skills, [
    {
      id: 'cron',
      name: 'cron',
      description: 'Keep scheduled follow-ups reliable.',
      status: 'discovered',
    },
  ]);
  assert.match(summary.promptPreview, /skills: 1 registered, 1 documented \(cron\); docs: skills\/cron\/SKILL\.md; excerpts: cron: Keep scheduled follow-ups reliable\./);
  assert.doesNotMatch(summary.promptPreview, /cron: name: cron/);
});

test('buildSummary prefers multiline skill frontmatter descriptions over raw yaml markers in core foundation excerpts', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    [
      '---',
      'name: cron',
      'description: >',
      '  Keep scheduled follow-ups reliable',
      '  across recurring operator loops.',
      '---',
      '',
      '# Cron',
      '',
      'Use this skill when a schedule needs setup.',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, [
    'cron: Keep scheduled follow-ups reliable across recurring operator loops.',
  ]);
  assert.match(summary.promptPreview, /cron: Keep scheduled follow-ups reliable across recurring operator loops\./);
  assert.doesNotMatch(summary.promptPreview, /cron: >/);
});

test('buildSummary handles multiline skill frontmatter descriptions with indentation indicators', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    [
      '---',
      'name: cron',
      'description: >2',
      '    Keep scheduled follow-ups reliable',
      '    across recurring operator loops.',
      '---',
      '',
      '# Cron',
      '',
      'Use this skill when a schedule needs setup.',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, [
    'cron: Keep scheduled follow-ups reliable across recurring operator loops.',
  ]);
  assert.doesNotMatch(summary.promptPreview, /cron: >2/);
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
      'add at least one entry under memory/daily, memory/long-term, and memory/scratch',
      'create skills/<name>/SKILL.md for at least one repo skill',
      'add non-heading guidance to SOUL.md',
      'create voice/README.md',
    ],
  });

  const memoryCommand = buildCoreFoundationCommand({ area: 'memory', status: 'thin', paths: ['memory/daily', 'memory/long-term', 'memory/scratch'] });
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'missing', paths: ['skills/'] });
  const soulCommand = buildCoreFoundationCommand({ area: 'soul', status: 'thin', paths: ['SOUL.md'] });
  const voiceCommand = buildCoreFoundationCommand({ area: 'voice', status: 'missing', paths: ['voice/README.md'] });
  const scaffoldAllCommand = [memoryCommand, skillsCommand, soulCommand, voiceCommand]
    .map((command) => `(${command})`)
    .join(' && ');

  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 0,
    missingAreaCount: 2,
    thinAreaCount: 2,
    helperCommands: {
      scaffoldAll: scaffoldAllCommand,
      scaffoldMissing: [skillsCommand, voiceCommand].map((command) => `(${command})`).join(' && '),
      scaffoldThin: [memoryCommand, soulCommand].map((command) => `(${command})`).join(' && '),
      memory: memoryCommand,
      skills: skillsCommand,
      soul: soulCommand,
      voice: voiceCommand,
    },
    queuedAreas: [
      {
        area: 'memory',
        status: 'thin',
        summary: 'README yes, daily 0, long-term 0, scratch 0',
        action: 'add at least one entry under memory/daily, memory/long-term, and memory/scratch',
        paths: ['memory/daily', 'memory/long-term', 'memory/scratch'],
        command: memoryCommand,
      },
      {
        area: 'skills',
        status: 'missing',
        summary: '0 registered, 0 documented',
        action: 'create skills/<name>/SKILL.md for at least one repo skill',
        paths: ['skills/'],
        command: skillsCommand,
      },
      {
        area: 'soul',
        status: 'thin',
        summary: 'present, 0 lines',
        action: 'add non-heading guidance to SOUL.md',
        paths: ['SOUL.md'],
        command: soulCommand,
      },
      {
        area: 'voice',
        status: 'missing',
        summary: 'missing, 0 lines',
        action: 'create voice/README.md',
        paths: ['voice/README.md'],
        command: voiceCommand,
      },
    ],
  });

  assert.match(summary.promptPreview, /queue: 0 ready, 2 thin, 2 missing/);
  assert.match(summary.promptPreview, /helpers: scaffold-all /);
  assert.match(summary.promptPreview, /\| scaffold-missing \(mkdir -p skills\/starter && printf %s '# Starter skill/);
  assert.match(summary.promptPreview, /\| scaffold-thin \(mkdir -p 'memory\/daily' 'memory\/long-term' 'memory\/scratch' && touch "memory\/daily\/\$\(date \+%F\)\.md" 'memory\/long-term\/notes\.md' 'memory\/scratch\/draft\.md'\) && \(\{ if grep -Fqx -- '## Core values' 'SOUL\.md'; then awk -v heading='## Core values'/);
  assert.match(summary.promptPreview, /\| skills mkdir -p skills\/starter && printf %s '# Starter skill/);
  assert.match(summary.promptPreview, /\| soul /);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 0\/4 ready \(2 thin, 2 missing\); profiles 0 queued for refresh, 0 incomplete/);
});

test('buildSummary keeps memory foundation thin until daily, long-term, and scratch buckets are all seeded', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    rootPath: 'memory/README.md',
    rootExcerpt: 'Keep durable notes here.',
    dailyCount: 1,
    longTermCount: 0,
    scratchCount: 0,
    totalEntries: 1,
    readyBucketCount: 1,
    totalBucketCount: 3,
    populatedBuckets: ['daily'],
    emptyBuckets: ['long-term', 'scratch'],
    sampleEntries: ['daily/2026-04-16.md'],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['memory'],
    recommendedActions: ['add at least one entry under memory/long-term and memory/scratch'],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin memory/);
  assert.match(summary.promptPreview, /memory \[thin\]: add at least one entry under memory\/long-term and memory\/scratch @ memory\/long-term, memory\/scratch; command mkdir -p 'memory\/long-term' 'memory\/scratch' && touch 'memory\/long-term\/notes\.md' 'memory\/scratch\/draft\.md'/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 0, scratch 0; empty buckets: long-term, scratch; samples: daily\/2026-04-16\.md; root: Keep durable notes here\./);
  assert.match(summary.promptPreview, /next actions: add at least one entry under memory\/long-term and memory\/scratch/);
});

test('buildSummary work loop surfaces a bundled scaffold command when multiple core foundation areas are queued', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');

  const summary = buildSummary(rootDir);
  const memoryCommand = buildCoreFoundationCommand({ area: 'memory', status: 'thin', paths: ['memory/daily', 'memory/long-term', 'memory/scratch'] });
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'missing', paths: ['skills/'] });
  const soulCommand = buildCoreFoundationCommand({ area: 'soul', status: 'thin', paths: ['SOUL.md'] });
  const voiceCommand = buildCoreFoundationCommand({ area: 'voice', status: 'missing', paths: ['voice/README.md'] });
  const scaffoldAllCommand = [memoryCommand, skillsCommand, soulCommand, voiceCommand]
    .map((command) => `(${command})`)
    .join(' && ');

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'scaffold missing or thin core foundation areas — starting with add at least one entry under memory/daily, memory/long-term, and memory/scratch');
  assert.equal(summary.workLoop.currentPriority?.command, scaffoldAllCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['memory/daily', 'memory/long-term', 'memory/scratch', 'skills/', 'SOUL.md', 'voice/README.md']);

  assert.match(summary.promptPreview, /helpers: scaffold-all \(mkdir -p 'memory\/daily' 'memory\/long-term' 'memory\/scratch' && touch "memory\/daily\/\$\(date \+%F\)\.md" 'memory\/long-term\/notes\.md' 'memory\/scratch\/draft\.md'\)[\s\S]*voice\/README\.md\)/);
});

test('buildSummary work loop surfaces runnable commands for thin soul and missing voice scaffolds', () => {
  const voiceRootDir = makeTempRepo();

  fs.mkdirSync(path.join(voiceRootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(voiceRootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(voiceRootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(voiceRootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(voiceRootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(voiceRootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const voiceSummary = buildSummary(voiceRootDir);

  assert.equal(voiceSummary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(voiceSummary.workLoop.currentPriority?.nextAction, 'create voice/README.md');
  assert.equal(voiceSummary.workLoop.currentPriority?.command, `mkdir -p voice && printf %s '${VOICE_STARTER_TEMPLATE}' > voice/README.md`);
  assert.deepEqual(voiceSummary.workLoop.currentPriority?.paths, ['voice/README.md']);
  assert.match(voiceSummary.promptPreview, /voice \[missing\]: create voice\/README\.md @ voice\/README\.md; command mkdir -p voice && printf %s '# Voice\n\n## Tone/);

  const soulRootDir = makeTempRepo();

  fs.mkdirSync(path.join(soulRootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(soulRootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(soulRootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(soulRootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(soulRootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(soulRootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(soulRootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(soulRootDir, 'SOUL.md'), '# Soul');

  const soulSummary = buildSummary(soulRootDir);

  assert.equal(soulSummary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(soulSummary.workLoop.currentPriority?.nextAction, 'add non-heading guidance to SOUL.md');
  assert.equal(soulSummary.workLoop.currentPriority?.command, buildDocumentRepairCommand('SOUL.md', SOUL_GUIDANCE_SENTINEL, SOUL_SECTIONS));
  assert.deepEqual(soulSummary.workLoop.currentPriority?.paths, ['SOUL.md']);
  assert.match(soulSummary.promptPreview, /soul \[thin\]: add non-heading guidance to SOUL\.md @ SOUL\.md; command \{ if grep -Fqx -- '## Core values' 'SOUL\.md'; then awk -v heading='## Core values'/);
});

test('buildSummary keeps thin memory queue actionable when bucket files exist but memory README is missing', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    helperCommands: {
      scaffoldAll: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md'",
      scaffoldMissing: null,
      scaffoldThin: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md'",
      memory: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md'",
      skills: null,
      soul: null,
      voice: null,
    },
    queuedAreas: [
      {
        area: 'memory',
        status: 'thin',
        summary: 'README no, daily 1, long-term 1, scratch 1',
        action: 'create memory/README.md',
        paths: ['memory/README.md'],
        command: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md'",
      },
    ],
  });
  assert.match(summary.promptPreview, /queue: 3 ready, 1 thin, 0 missing/);
  assert.match(summary.promptPreview, /memory \[thin\]: create memory\/README\.md @ memory\/README\.md; command mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context\.\n\n## Buckets\n- daily\/: short-lived run notes\n- long-term\/: durable facts and conventions\n- scratch\/: in-flight ideas to refine or promote\n' > 'memory\/README\.md'/);
});

test('buildSummary work loop scaffolds a starter repo skill when the skills area is missing entirely', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'create skills/<name>/SKILL.md for at least one repo skill');
  assert.equal(summary.workLoop.currentPriority?.command, "mkdir -p skills/starter && printf %s '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n' > 'skills/starter/SKILL.md'");
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/']);
  assert.match(summary.promptPreview, /command: mkdir -p skills\/starter && printf %s '# Starter skill[\s\S]*' > 'skills\/starter\/SKILL\.md'/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'thin', paths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'] });

  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 0,
    undocumentedCount: 2,
    thinCount: 0,
    sample: ['slack', 'telegram'],
    samplePaths: [],
    sampleExcerpts: [],
    undocumentedSample: ['slack', 'telegram'],
    undocumentedPaths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
    thinSample: [],
    thinPaths: [],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['create skills/slack/SKILL.md and skills/telegram/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    helperCommands: {
      scaffoldAll: skillsCommand,
      scaffoldMissing: null,
      scaffoldThin: skillsCommand,
      memory: null,
      skills: skillsCommand,
      soul: null,
      voice: null,
    },
    queuedAreas: [
      {
        area: 'skills',
        status: 'thin',
        summary: '2 registered, 0 documented',
        action: 'create skills/slack/SKILL.md and skills/telegram/SKILL.md',
        paths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
        missingPaths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
        command: skillsCommand,
      },
    ],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/slack\/SKILL\.md and skills\/telegram\/SKILL\.md @ skills\/slack\/SKILL\.md, skills\/telegram\/SKILL\.md; command mkdir -p 'skills\/slack' 'skills\/telegram' && for file in 'skills\/slack\/SKILL\.md' 'skills\/telegram\/SKILL\.md'; do \[ -f "\$file" \] \|\| printf %s '# Starter skill/);
  assert.match(summary.promptPreview, /skills: 2 registered, 0 documented \(slack, telegram\); missing docs: slack, telegram @ skills\/slack\/SKILL\.md, skills\/telegram\/SKILL\.md/);
});

test('buildSummary keeps mixed documented and placeholder skills thin until all skill folders carry SKILL docs', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'thin', paths: ['skills/slack/SKILL.md'] });

  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 1,
    undocumentedCount: 1,
    thinCount: 0,
    sample: ['slack', 'telegram'],
    samplePaths: ['skills/telegram/SKILL.md'],
    sampleExcerpts: ['telegram: Deliver concise thread updates.'],
    undocumentedSample: ['slack'],
    undocumentedPaths: ['skills/slack/SKILL.md'],
    thinSample: [],
    thinPaths: [],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['create skills/slack/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    helperCommands: {
      scaffoldAll: skillsCommand,
      scaffoldMissing: null,
      scaffoldThin: skillsCommand,
      memory: null,
      skills: skillsCommand,
      soul: null,
      voice: null,
    },
    queuedAreas: [
      {
        area: 'skills',
        status: 'thin',
        summary: '2 registered, 1 documented',
        action: 'create skills/slack/SKILL.md',
        paths: ['skills/slack/SKILL.md'],
        missingPaths: ['skills/slack/SKILL.md'],
        command: skillsCommand,
      },
    ],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/slack\/SKILL\.md/);
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(slack, telegram\); docs: skills\/telegram\/SKILL\.md; excerpts: telegram: Deliver concise thread updates\.\; missing docs: slack @ skills\/slack\/SKILL\.md/);
});

test('buildSummary treats heading-only SKILL docs as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/delivery/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    count: 1,
    documentedCount: 0,
    undocumentedCount: 0,
    thinCount: 1,
    sample: ['delivery'],
    samplePaths: [],
    sampleExcerpts: [],
    undocumentedSample: [],
    undocumentedPaths: [],
    thinSample: ['delivery'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['add non-heading guidance to skills/delivery/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    helperCommands: {
      scaffoldAll: skillsCommand,
      scaffoldMissing: null,
      scaffoldThin: skillsCommand,
      memory: null,
      skills: skillsCommand,
      soul: null,
      voice: null,
    },
    queuedAreas: [
      {
        area: 'skills',
        status: 'thin',
        summary: '1 registered, 0 documented',
        action: 'add non-heading guidance to skills/delivery/SKILL.md',
        paths: ['skills/delivery/SKILL.md'],
        thinPaths: ['skills/delivery/SKILL.md'],
        command: skillsCommand,
      },
    ],
  });
  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'add non-heading guidance to skills/delivery/SKILL.md');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/delivery/SKILL.md']);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: add non-heading guidance to skills\/delivery\/SKILL\.md @ skills\/delivery\/SKILL\.md/);
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(delivery\); thin docs: delivery @ skills\/delivery\/SKILL\.md/);
  assert.match(summary.promptPreview, /grep -Fqx -- '- Describe when to use this skill\.' 'skills\/delivery\/SKILL\.md' \|\| printf %s '/);
  assert.match(summary.workLoop.currentPriority.summary, /core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /next action: add non-heading guidance to skills\/delivery\/SKILL\.md/);
});

test('buildSummary keeps mixed documented and heading-only SKILL docs queued as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'slack', 'SKILL.md'), '# Slack\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/slack/SKILL.md'],
    thinPaths: ['skills/slack/SKILL.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    count: 2,
    documentedCount: 1,
    undocumentedCount: 0,
    thinCount: 1,
    sample: ['delivery', 'slack'],
    samplePaths: ['skills/delivery/SKILL.md'],
    sampleExcerpts: ['delivery: Deliver concise handoffs.'],
    undocumentedSample: [],
    undocumentedPaths: [],
    thinSample: ['slack'],
    thinPaths: ['skills/slack/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['add non-heading guidance to skills/slack/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    helperCommands: {
      scaffoldAll: skillsCommand,
      scaffoldMissing: null,
      scaffoldThin: skillsCommand,
      memory: null,
      skills: skillsCommand,
      soul: null,
      voice: null,
    },
    queuedAreas: [
      {
        area: 'skills',
        status: 'thin',
        summary: '2 registered, 1 documented',
        action: 'add non-heading guidance to skills/slack/SKILL.md',
        paths: ['skills/slack/SKILL.md'],
        thinPaths: ['skills/slack/SKILL.md'],
        command: skillsCommand,
      },
    ],
  });
  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'add non-heading guidance to skills/slack/SKILL.md');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/slack/SKILL.md']);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: add non-heading guidance to skills\/slack\/SKILL\.md @ skills\/slack\/SKILL\.md/);
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(delivery, slack\); docs: skills\/delivery\/SKILL\.md; excerpts: delivery: Deliver concise handoffs\.\; thin docs: slack @ skills\/slack\/SKILL\.md/);
});

test('buildSummary lists every missing SKILL doc in maintenance actions even when placeholder samples are truncated', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  for (const skillName of ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']) {
    fs.mkdirSync(path.join(rootDir, 'skills', skillName), { recursive: true });
  }
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: [
      'skills/alpha/SKILL.md',
      'skills/beta/SKILL.md',
      'skills/delta/SKILL.md',
      'skills/epsilon/SKILL.md',
      'skills/gamma/SKILL.md',
      'skills/zeta/SKILL.md',
    ],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    count: 6,
    documentedCount: 0,
    undocumentedCount: 6,
    thinCount: 0,
    sample: ['alpha', 'beta', 'delta', 'epsilon', 'gamma'],
    samplePaths: [],
    sampleExcerpts: [],
    undocumentedSample: ['alpha', 'beta', 'delta', 'epsilon', 'gamma'],
    undocumentedPaths: ['skills/alpha/SKILL.md', 'skills/beta/SKILL.md', 'skills/delta/SKILL.md', 'skills/epsilon/SKILL.md', 'skills/gamma/SKILL.md'],
    thinSample: [],
    thinPaths: [],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: [
      'create skills/alpha/SKILL.md, skills/beta/SKILL.md, skills/delta/SKILL.md, skills/epsilon/SKILL.md, skills/gamma/SKILL.md, and skills/zeta/SKILL.md',
    ],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'skills',
      status: 'thin',
      summary: '6 registered, 0 documented',
      action: 'create skills/alpha/SKILL.md, skills/beta/SKILL.md, skills/delta/SKILL.md, skills/epsilon/SKILL.md, skills/gamma/SKILL.md, and skills/zeta/SKILL.md',
      paths: [
        'skills/alpha/SKILL.md',
        'skills/beta/SKILL.md',
        'skills/delta/SKILL.md',
        'skills/epsilon/SKILL.md',
        'skills/gamma/SKILL.md',
        'skills/zeta/SKILL.md',
      ],
      missingPaths: [
        'skills/alpha/SKILL.md',
        'skills/beta/SKILL.md',
        'skills/delta/SKILL.md',
        'skills/epsilon/SKILL.md',
        'skills/gamma/SKILL.md',
        'skills/zeta/SKILL.md',
      ],
      command: skillsCommand,
    },
  ]);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/alpha\/SKILL\.md, skills\/beta\/SKILL\.md, skills\/delta\/SKILL\.md, skills\/epsilon\/SKILL\.md, skills\/gamma\/SKILL\.md, and skills\/zeta\/SKILL\.md/);
});

test('buildSummary work loop surfaces a runnable command for thin core skills coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'thin', paths: ['skills/slack/SKILL.md'] });

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'create skills/slack/SKILL.md');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/slack/SKILL.md']);
  assert.match(summary.promptPreview, /Work loop:/);
  assert.match(summary.promptPreview, /command: mkdir -p 'skills\/slack' && for file in 'skills\/slack\/SKILL\.md'; do \[ -f "\$file" \] \|\| printf %s '# Starter skill/);
});

test('buildSummary work loop includes all stale intake paths when bulk intake scaffolding is the next step', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable notes here.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'slack', 'SKILL.md'), '# Slack skill\n\nDeliver concise thread updates.');

  ingestion.updateProfile({
    personId: 'Alpha Missing',
    displayName: 'Alpha Missing',
    summary: 'Needs a fresh intake scaffold.',
  });
  ingestion.updateProfile({
    personId: 'Beta Partial',
    displayName: 'Beta Partial',
    summary: 'Needs the intake scaffold completed.',
  });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'beta-partial', 'imports'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'beta-partial', 'imports', 'README.md'), '# Partial intake scaffold\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority?.id, 'ingestion');
  assert.equal(
    summary.workLoop.currentPriority?.command,
    "(node src/index.js update intake --person 'beta-partial' --display-name 'Beta Partial' --summary 'Needs the intake scaffold completed.') && (node src/index.js update intake --person 'alpha-missing' --display-name 'Alpha Missing' --summary 'Needs a fresh intake scaffold.')",
  );
  assert.deepEqual(summary.workLoop.currentPriority?.paths, [
    'profiles/beta-partial/imports/materials.template.json',
    'profiles/beta-partial/imports/sample.txt',
    'profiles/alpha-missing/imports',
    'profiles/alpha-missing/imports/README.md',
    'profiles/alpha-missing/imports/materials.template.json',
    'profiles/alpha-missing/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /command: \(node src\/index\.js update intake --person 'beta-partial' --display-name 'Beta Partial' --summary 'Needs the intake scaffold completed\.'\) && \(node src\/index\.js update intake --person 'alpha-missing' --display-name 'Alpha Missing' --summary 'Needs a fresh intake scaffold\.'\)/);
  assert.match(summary.promptPreview, /paths: profiles\/beta-partial\/imports\/materials\.template\.json, profiles\/beta-partial\/imports\/sample\.txt, profiles\/alpha-missing\/imports, profiles\/alpha-missing\/imports\/README\.md, profiles\/alpha-missing\/imports\/materials\.template\.json, profiles\/alpha-missing\/imports\/sample\.txt/);
});

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
        voice: {
          generated: false,
          highlights: [],
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['tone'],
          missingSections: ['signature-moves', 'avoid', 'language-hints'],
        },
        soul: {
          generated: false,
          highlights: [],
          readySectionCount: 1,
          totalSectionCount: 3,
          readySections: ['core-truths'],
          missingSections: ['boundaries', 'continuity'],
        },
        skills: {
          generated: false,
          highlights: [],
          readySectionCount: 1,
          totalSectionCount: 3,
          readySections: ['candidate-skills'],
          missingSections: ['evidence', 'gaps-to-validate'],
        },
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
    candidateProfileCount: 2,
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
    recommendedProfileId: 'jane-doe',
    recommendedLabel: 'jane-doe',
    recommendedAction: 'refresh jane-doe — reasons missing drafts',
    recommendedCommand: 'node src/index.js update foundation --person jane-doe',
    recommendedPaths: [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
    recommendedDraftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.) | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints | soul 1/3 ready (core-truths), missing boundaries/continuity | skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate',
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
        draftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.) | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints | soul 1/3 ready (core-truths), missing boundaries/continuity | skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate',
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
    candidateProfileCount: 2,
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
    recommendedProfileId: 'jane-doe',
    recommendedLabel: 'Jane Doe (jane-doe)',
    recommendedAction: 'refresh Jane Doe (jane-doe) — reasons missing drafts + new materials',
    recommendedCommand: 'node src/index.js update foundation --person jane-doe',
    recommendedPaths: [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
    recommendedDraftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.)',
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
        draftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.)',
        refreshCommand: 'node src/index.js update foundation --person jane-doe',
      },
    ],
  });
  assert.match(summary.foundation.maintenance.queuedProfiles[0].latestMaterialAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /drafts: 1 ready, 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /helpers: .*refresh-all node src\/index\.js update foundation --all .* refresh-bundle node src\/index\.js update foundation --person jane-doe/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest .*; gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| shortcut node src\/index\.js import intake --person 'jane-doe' \| refresh node src\/index\.js update foundation --person jane-doe/);
  assert.match(summary.promptPreview, /Ingestion entrance:[\s\S]*drafts: 1 ready, 1 queued for refresh, 1 incomplete[\s\S]*refresh-bundle node src\/index\.js update foundation --person jane-doe/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest .* \| shortcut node src\/index\.js import intake --person 'jane-doe' \| refresh node src\/index\.js update foundation --person jane-doe/);
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
    candidateProfileCount: 0,
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
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'obsidian', 'SKILL.md'), '# Obsidian skill\n\n## What this skill is for\n- Capture durable operator notes.\n\n## Suggested workflow\n- Sync the durable notes before updating summaries.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
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
    rootMissingSections: [],
    rootReadySections: ['what-belongs-here', 'buckets'],
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
    hasRootDocument: true,
    rootPath: 'skills/README.md',
    rootExcerpt: 'Keep reusable operator procedures here.',
    rootMissingSections: [],
    rootReadySections: ['what-lives-here', 'layout'],
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
    rootPath: 'SOUL.md',
    lineCount: 2,
    excerpt: 'Build a faithful operator core.',
    rootExcerpt: 'Build a faithful operator core.',
    structured: false,
    readySectionCount: 4,
    totalSectionCount: 4,
    readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
    missingSections: [],
  });
  assert.deepEqual(summary.foundation.core.voice, {
    present: true,
    path: 'voice/README.md',
    rootPath: 'voice/README.md',
    lineCount: 2,
    excerpt: 'Keep replies direct.',
    rootExcerpt: 'Keep replies direct.',
    structured: false,
    readySectionCount: 4,
    totalSectionCount: 4,
    readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
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
    recommendedArea: null,
    recommendedAction: null,
    recommendedCommand: null,
    recommendedPaths: [],
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
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; buckets 3\/3 ready \(daily, long-term, scratch\); samples: daily\/2026-04-16\.md, long-term\/operator\.json, scratch\/draft\.txt; root: Keep durable notes here\. @ memory\/README\.md; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
  assert.match(summary.promptPreview, /skills: 2 registered, 2 documented \(obsidian, telegram\); root: Keep reusable operator procedures here\. @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\); docs: skills\/obsidian\/SKILL\.md, skills\/telegram\/SKILL\.md; excerpts: obsidian: Capture durable operator notes\. \| telegram: Deliver concise thread updates\./);
  assert.match(summary.promptPreview, /soul: present, 2 lines, Build a faithful operator core\. @ SOUL\.md, sections 4\/4 ready \(core-truths, boundaries, vibe, continuity\)/);
  assert.match(summary.promptPreview, /voice: present, 2 lines, Keep replies direct\. @ voice\/README\.md, sections 4\/4 ready \(tone, signature-moves, avoid, language-hints\)/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: false,
    rootPath: 'skills/README.md',
    rootExcerpt: null,
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
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['create skills/README.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'skills',
    recommendedAction: 'create skills/README.md',
    recommendedCommand: "mkdir -p 'skills' && printf %s '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n' > 'skills/README.md'",
    recommendedPaths: ['skills/README.md'],
    helperCommands: {
      scaffoldAll: "mkdir -p 'skills' && printf %s '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n' > 'skills/README.md'",
      scaffoldMissing: null,
      scaffoldThin: "mkdir -p 'skills' && printf %s '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n' > 'skills/README.md'",
      memory: null,
      skills: "mkdir -p 'skills' && printf %s '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n' > 'skills/README.md'",
      soul: null,
      voice: null,
    },
    queuedAreas: [
      {
        area: 'skills',
        status: 'thin',
        summary: '1 registered, 1 documented, root missing @ skills/README.md',
        action: 'create skills/README.md',
        paths: ['skills/README.md'],
        command: "mkdir -p 'skills' && printf %s '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n' > 'skills/README.md'",
      },
    ],
  });
  assert.deepEqual(summary.skills.skills, [
    {
      id: 'cron',
      name: 'cron',
      description: 'Keep scheduled follow-ups reliable.',
      status: 'discovered',
      foundationStatus: 'ready',
    },
  ]);
  assert.match(summary.promptPreview, /skills: 1 registered, 1 documented \(cron\); root missing @ skills\/README\.md; docs: skills\/cron\/SKILL\.md; excerpts: cron: Keep scheduled follow-ups reliable\./);
  assert.doesNotMatch(summary.promptPreview, /cron: name: cron/);
});

test('buildSummary prefers frontmatter descriptions for memory and skills root excerpts', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    ['---', 'description: Keep shared operator procedures discoverable.', '---', '', '# Skills', '', '## What lives here', '- Keep shared operator procedures discoverable.', '', '## Layout', '- skills/<name>/SKILL.md stores the per-skill workflow.'].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    ['---', 'description: >', '  Keep durable repo knowledge organized', '  without leaking raw YAML metadata.', '---', '', '# Memory', '', 'Buckets live below.'].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    ['---', 'name: cron', 'description: Keep scheduled follow-ups reliable.', '---', '', '# Cron', '', 'Use this skill when a schedule needs setup.'].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.memory.rootExcerpt, 'Keep durable repo knowledge organized without leaking raw YAML metadata.');
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootReadySections, []);
  assert.equal(summary.foundation.core.skills.rootExcerpt, 'Keep shared operator procedures discoverable.');
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; buckets 3\/3 ready \(daily, long-term, scratch\); samples: daily\/2026-04-18\.md, long-term\/operator\.json, scratch\/draft\.txt; root: Keep durable repo knowledge organized without leaking raw YAML metadata\. @ memory\/README\.md; root sections 0\/2 ready, missing what-belongs-here, buckets/);
  assert.match(summary.promptPreview, /skills: 1 registered, 1 documented \(cron\); root: Keep shared operator procedures discoverable\. @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\); docs: skills\/cron\/SKILL\.md; excerpts: cron: Keep scheduled follow-ups reliable\./);
  assert.doesNotMatch(summary.promptPreview, /root: description:/);
  assert.doesNotMatch(summary.promptPreview, /root: >/);
});


test('buildSummary ignores fenced template blocks when deriving memory and skills root excerpts', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    ['# Skills', '', '```md', 'Template excerpt that should stay hidden.', '```', '', 'Keep shared operator procedures discoverable outside fenced templates.'].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    ['# Memory', '', '~~~md', '- Template memory guidance that should stay hidden.', '~~~', '', '- Keep durable repo knowledge outside fenced templates.'].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\nKeep scheduled follow-ups reliable.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.memory.rootExcerpt, 'Keep durable repo knowledge outside fenced templates.');
  assert.equal(summary.foundation.core.skills.rootExcerpt, 'Keep shared operator procedures discoverable outside fenced templates.');
  assert.doesNotMatch(summary.promptPreview, /Template excerpt that should stay hidden/);
  assert.doesNotMatch(summary.promptPreview, /Template memory guidance that should stay hidden/);
});

test('buildSummary ignores html comments when deriving memory and skills excerpts', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    ['# Skills', '', '<!-- Generated summary should stay hidden. -->', '', 'Keep shared operator procedures discoverable outside managed comments.'].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    ['# Memory', '', '<!-- Generated memory note should stay hidden. -->', '', '- Keep durable repo knowledge outside managed comments.'].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    ['# Cron', '', '<!-- Generated skill note should stay hidden. -->', '', 'Keep scheduled follow-ups reliable.'].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nKeep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.memory.rootExcerpt, 'Keep durable repo knowledge outside managed comments.');
  assert.equal(summary.foundation.core.skills.rootExcerpt, 'Keep shared operator procedures discoverable outside managed comments.');
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['cron: Keep scheduled follow-ups reliable.']);
  assert.doesNotMatch(summary.promptPreview, /Generated summary should stay hidden/);
  assert.doesNotMatch(summary.promptPreview, /Generated memory note should stay hidden/);
  assert.doesNotMatch(summary.promptPreview, /Generated skill note should stay hidden/);
});

test('buildSummary ignores admonition labels when deriving soul and voice root excerpts', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep shared operator procedures discoverable.\n\n## Layout\n- skills/<name>/SKILL.md documents reusable workflows.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\nKeep scheduled follow-ups reliable.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), ['# Voice', '', '> [!NOTE]', '> Warm and grounded.', '', '## Signature moves', '- Use crisp examples.', '', '## Avoid', '- Never pad the answer.', '', '## Language hints', '- Preserve bilingual phrasing when the source material switches languages.'].join('\n'));
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), ['# Soul', '', '> [!TIP]', '> Stay faithful to the source material.', '', '## Boundaries', '- Do not bluff certainty.', '', '## Vibe', '- Grounded and direct.', '', '## Continuity', '- Carry durable lessons forward.'].join('\n'));

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Warm and grounded.');
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Stay faithful to the source material.');
  assert.match(summary.promptPreview, /- tone: Warm and grounded\./);
  assert.match(summary.promptPreview, /- excerpt: Stay faithful to the source material\./);
  assert.doesNotMatch(summary.promptPreview, /\[!NOTE\]/);
  assert.doesNotMatch(summary.promptPreview, /\[!TIP\]/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
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
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'missing', paths: ['skills/starter/SKILL.md'] });
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
    recommendedArea: 'memory',
    recommendedAction: 'scaffold missing or thin core foundation areas — starting with add at least one entry under memory/daily, memory/long-term, and memory/scratch',
    recommendedCommand: scaffoldAllCommand,
    recommendedPaths: ['memory/daily', 'memory/long-term', 'memory/scratch', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md'],
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
        summary: 'README yes, daily 0, long-term 0, scratch 0, root 2/2 sections ready (what-belongs-here, buckets)',
        action: 'add at least one entry under memory/daily, memory/long-term, and memory/scratch',
        paths: ['memory/daily', 'memory/long-term', 'memory/scratch'],
        command: memoryCommand,
      },
      {
        area: 'skills',
        status: 'missing',
        summary: '0 registered, 0 documented, root missing @ skills/README.md',
        action: 'create skills/<name>/SKILL.md for at least one repo skill',
        paths: ['skills/starter/SKILL.md'],
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
  assert.match(summary.promptPreview, /helpers: scaffold-all [\s\S]*skills\/starter/);
  assert.match(summary.promptPreview, /helpers: scaffold-all [\s\S]*node --input-type=module -e/);
  assert.match(summary.promptPreview, /memory \[thin\]: add at least one entry under memory\/daily, memory\/long-term, and memory\/scratch @ memory\/daily, memory\/long-term, memory\/scratch; command mkdir -p 'memory\/daily' 'memory\/long-term' 'memory\/scratch'/);
  assert.match(summary.promptPreview, /skills \[missing\]: create skills\/\<name\>\/SKILL\.md for at least one repo skill @ skills\/starter\/SKILL\.md; command mkdir -p 'skills\/starter' && for file in 'skills\/starter\/SKILL\.md'; do \[ -f \"\$file\" \] \|\| printf %s '# Starter skill/);
  assert.match(summary.promptPreview, /\+2 more queued: soul \[thin\] \(present, 0 lines\), voice \[missing\] \(missing, 0 lines\)/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 0\/4 ready \(2 thin, 2 missing\); profiles 0 queued for refresh, 0 incomplete/);
});

test('buildSummary keeps memory foundation thin until daily, long-term, and scratch buckets are all seeded', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    rootPath: 'memory/README.md',
    rootExcerpt: 'Keep durable notes here.',
    rootMissingSections: [],
    rootReadySections: ['what-belongs-here', 'buckets'],
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
  assert.equal(
    summary.foundation.core.maintenance.queuedAreas[0]?.summary,
    'README yes, daily 1, long-term 0, scratch 0, root 2/2 sections ready (what-belongs-here, buckets)',
  );
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin memory/);
  assert.match(summary.promptPreview, /memory \[thin\]: add at least one entry under memory\/long-term and memory\/scratch @ memory\/long-term, memory\/scratch; command mkdir -p 'memory\/long-term' 'memory\/scratch' && touch 'memory\/long-term\/notes\.md' 'memory\/scratch\/draft\.md'/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 0, scratch 0; buckets 1\/3 ready \(daily\), missing long-term, scratch; samples: daily\/2026-04-16\.md; root: Keep durable notes here\. @ memory\/README\.md; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
  assert.match(summary.promptPreview, /next actions: add at least one entry under memory\/long-term and memory\/scratch/);
});

test('buildSummary work loop surfaces a bundled scaffold command when multiple core foundation areas are queued', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');

  const summary = buildSummary(rootDir);
  const memoryCommand = buildCoreFoundationCommand({ area: 'memory', status: 'thin', paths: ['memory/daily', 'memory/long-term', 'memory/scratch'] });
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'missing', paths: ['skills/starter/SKILL.md'] });
  const soulCommand = buildCoreFoundationCommand({ area: 'soul', status: 'thin', paths: ['SOUL.md'] });
  const voiceCommand = buildCoreFoundationCommand({ area: 'voice', status: 'missing', paths: ['voice/README.md'] });
  const scaffoldAllCommand = [memoryCommand, skillsCommand, soulCommand, voiceCommand]
    .map((command) => `(${command})`)
    .join(' && ');

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'scaffold missing or thin core foundation areas — starting with add at least one entry under memory/daily, memory/long-term, and memory/scratch');
  assert.equal(summary.workLoop.currentPriority?.command, scaffoldAllCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['memory/daily', 'memory/long-term', 'memory/scratch', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md']);

  assert.match(summary.promptPreview, /helpers: scaffold-all /);
  assert.match(summary.promptPreview, /skills\/starter/);
  assert.match(summary.promptPreview, /node --input-type=module -e/);
  assert.match(summary.promptPreview, /voice\/README\.md/);
});

test('buildSummary work loop surfaces runnable commands for thin soul and missing voice scaffolds', () => {
  const voiceRootDir = makeTempRepo();

  fs.mkdirSync(path.join(voiceRootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(voiceRootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(voiceRootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(voiceRootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(voiceRootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(voiceRootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
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
  fs.writeFileSync(path.join(soulRootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(soulRootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(soulRootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(soulRootDir, 'SOUL.md'), '# Soul');

  const soulSummary = buildSummary(soulRootDir);

  assert.equal(soulSummary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(soulSummary.workLoop.currentPriority?.nextAction, 'add non-heading guidance to SOUL.md');
  assert.match(soulSummary.workLoop.currentPriority?.command ?? '', /node -e/);
  assert.deepEqual(soulSummary.workLoop.currentPriority?.paths, ['SOUL.md']);
  assert.match(soulSummary.promptPreview, /next action: add non-heading guidance to SOUL\.md/);
});

test('buildSummary keeps thin memory queue actionable when bucket files exist but memory README is missing', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.');
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
    recommendedArea: 'memory',
    recommendedAction: 'create memory/README.md',
    recommendedCommand: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md'",
    recommendedPaths: ['memory/README.md'],
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'create skills/<name>/SKILL.md for at least one repo skill');
  assert.equal(summary.workLoop.currentPriority?.command, "mkdir -p 'skills/starter' && for file in 'skills/starter/SKILL.md'; do [ -f \"$file\" ] || printf %s '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n' > \"$file\"; done");
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/starter/SKILL.md']);
  assert.match(summary.promptPreview, /command: mkdir -p 'skills\/starter' && for file in 'skills\/starter\/SKILL\.md'; do \[ -f \"\$file\" \] \|\| printf %s '# Starter skill[\s\S]*' > \"\$file\"; done/);
});

test('buildSummary treats placeholder skill directories as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md', 'skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
    missingPaths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: false,
    rootPath: 'skills/README.md',
    rootExcerpt: null,
    count: 2,
    hasRootDocument: false,
    rootPath: 'skills/README.md',
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
    recommendedActions: ['create skills/README.md | create skills/slack/SKILL.md and skills/telegram/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'skills',
    recommendedAction: 'create skills/README.md | create skills/slack/SKILL.md and skills/telegram/SKILL.md',
    recommendedCommand: skillsCommand,
    recommendedPaths: ['skills/README.md', 'skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
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
        summary: '2 registered, 0 documented, root missing @ skills/README.md',
        action: 'create skills/README.md | create skills/slack/SKILL.md and skills/telegram/SKILL.md',
        paths: ['skills/README.md', 'skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
        missingPaths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
        command: skillsCommand,
      },
    ],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| create skills\/slack\/SKILL\.md and skills\/telegram\/SKILL\.md @ skills\/README\.md, skills\/slack\/SKILL\.md, skills\/telegram\/SKILL\.md; command \(mkdir -p 'skills' && printf %s '# Skills[\s\S]*\) && \(mkdir -p 'skills\/slack' 'skills\/telegram' && for file in 'skills\/slack\/SKILL\.md' 'skills\/telegram\/SKILL\.md'; do \[ -f "\$file" \] \|\| printf %s '# Starter skill/);
  assert.match(summary.promptPreview, /skills: 2 registered, 0 documented \(slack, telegram\); root missing @ skills\/README\.md; missing docs: slack, telegram @ skills\/slack\/SKILL\.md, skills\/telegram\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md', 'skills/slack/SKILL.md'],
    missingPaths: ['skills/slack/SKILL.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: false,
    rootPath: 'skills/README.md',
    rootExcerpt: null,
    count: 2,
    hasRootDocument: false,
    rootPath: 'skills/README.md',
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
    recommendedActions: ['create skills/README.md | create skills/slack/SKILL.md'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'skills',
    recommendedAction: 'create skills/README.md | create skills/slack/SKILL.md',
    recommendedCommand: skillsCommand,
    recommendedPaths: ['skills/README.md', 'skills/slack/SKILL.md'],
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
        summary: '2 registered, 1 documented, root missing @ skills/README.md',
        action: 'create skills/README.md | create skills/slack/SKILL.md',
        paths: ['skills/README.md', 'skills/slack/SKILL.md'],
        missingPaths: ['skills/slack/SKILL.md'],
        command: skillsCommand,
      },
    ],
  });
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| create skills\/slack\/SKILL\.md @ skills\/README\.md, skills\/slack\/SKILL\.md/);
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(slack, telegram\); root missing @ skills\/README\.md; docs: skills\/telegram\/SKILL\.md; excerpts: telegram: Deliver concise thread updates\.\; missing docs: slack @ skills\/slack\/SKILL\.md/);
});

test('buildSummary treats heading-only SKILL docs as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md', 'skills/delivery/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: false,
    rootPath: 'skills/README.md',
    rootExcerpt: null,
    count: 1,
    hasRootDocument: false,
    rootPath: 'skills/README.md',
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
    thinMissingSections: {
      delivery: ['what-this-skill-is-for', 'suggested-workflow'],
    },
    thinReadySections: {
      delivery: [],
    },
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['create skills/README.md | add missing sections to skills/delivery/SKILL.md: what-this-skill-is-for, suggested-workflow'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'skills',
    recommendedAction: 'create skills/README.md | add missing sections to skills/delivery/SKILL.md: what-this-skill-is-for, suggested-workflow',
    recommendedCommand: skillsCommand,
    recommendedPaths: ['skills/README.md', 'skills/delivery/SKILL.md'],
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
        summary: '1 registered, 0 documented, root missing @ skills/README.md',
        action: 'create skills/README.md | add missing sections to skills/delivery/SKILL.md: what-this-skill-is-for, suggested-workflow',
        paths: ['skills/README.md', 'skills/delivery/SKILL.md'],
        thinPaths: ['skills/delivery/SKILL.md'],
        thinMissingSections: {
          'skills/delivery/SKILL.md': ['what-this-skill-is-for', 'suggested-workflow'],
        },
        thinReadySections: {
          'skills/delivery/SKILL.md': [],
        },
        command: skillsCommand,
      },
    ],
  });
  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'create skills/README.md | add missing sections to skills/delivery/SKILL.md: what-this-skill-is-for, suggested-workflow');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/README.md', 'skills/delivery/SKILL.md']);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| add missing sections to skills\/delivery\/SKILL\.md: what-this-skill-is-for, suggested-workflow @ skills\/README\.md, skills\/delivery\/SKILL\.md; context thin docs delivery sections 0\/2 ready, missing what-this-skill-is-for, suggested-workflow; command /);
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(delivery\); root missing @ skills\/README\.md; thin docs: delivery missing what-this-skill-is-for, suggested-workflow @ skills\/delivery\/SKILL\.md/);
  assert.match(summary.promptPreview, /node -e 'const fs = require\('/);
  assert.match(summary.workLoop.currentPriority.summary, /core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /next action: create skills\/README\.md \| add missing sections to skills\/delivery\/SKILL\.md: what-this-skill-is-for, suggested-workflow/);
});

test('buildSummary keeps ready skills root sections visible in maintenance summaries when skill docs are still missing', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo guidance for reusable procedures.\n\n## Layout\n- Each skill lives under skills/<name>/SKILL.md.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\nDeliver concise thread updates.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.maintenance.queuedAreas[0]?.area, 'skills');
  assert.equal(
    summary.foundation.core.maintenance.queuedAreas[0]?.summary,
    '2 registered, 1 documented, root 2/2 sections ready (what-lives-here, layout)',
  );
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(slack, telegram\); root: Shared repo guidance for reusable procedures\. @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\); docs: skills\/telegram\/SKILL\.md; excerpts: telegram: Deliver concise thread updates\.\; missing docs: slack @ skills\/slack\/SKILL\.md/);
});

test('buildSummary treats frontmatter-only SKILL docs as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    ['---', 'name: delivery', 'description: Keep handoffs crisp.', '---', '', '# Delivery'].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 0);
  assert.equal(summary.foundation.core.skills.thinCount, 1);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, []);
  assert.deepEqual(summary.foundation.core.skills.thinSample, ['delivery']);
  assert.deepEqual(summary.foundation.core.skills.thinMissingSections, {
    delivery: ['what-this-skill-is-for', 'suggested-workflow'],
  });
  assert.deepEqual(summary.skills.skills, [
    {
      id: 'delivery',
      name: 'delivery',
      description: null,
      status: 'discovered',
      foundationStatus: 'thin',
    },
  ]);
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(delivery\); root missing @ skills\/README\.md; thin docs: delivery missing what-this-skill-is-for, suggested-workflow @ skills\/delivery\/SKILL\.md/);
  assert.doesNotMatch(summary.promptPreview, /excerpts: delivery: Keep handoffs crisp\./);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- top skills: delivery \[discovered, thin\]/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md', 'skills/slack/SKILL.md'],
    thinPaths: ['skills/slack/SKILL.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: false,
    rootPath: 'skills/README.md',
    rootExcerpt: null,
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
    thinMissingSections: {
      slack: ['what-this-skill-is-for', 'suggested-workflow'],
    },
    thinReadySections: {
      slack: [],
    },
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['create skills/README.md | add missing sections to skills/slack/SKILL.md: what-this-skill-is-for, suggested-workflow'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'skills',
    recommendedAction: 'create skills/README.md | add missing sections to skills/slack/SKILL.md: what-this-skill-is-for, suggested-workflow',
    recommendedCommand: skillsCommand,
    recommendedPaths: ['skills/README.md', 'skills/slack/SKILL.md'],
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
        summary: '2 registered, 1 documented, root missing @ skills/README.md',
        action: 'create skills/README.md | add missing sections to skills/slack/SKILL.md: what-this-skill-is-for, suggested-workflow',
        paths: ['skills/README.md', 'skills/slack/SKILL.md'],
        thinPaths: ['skills/slack/SKILL.md'],
        thinMissingSections: {
          'skills/slack/SKILL.md': ['what-this-skill-is-for', 'suggested-workflow'],
        },
        thinReadySections: {
          'skills/slack/SKILL.md': [],
        },
        command: skillsCommand,
      },
    ],
  });
  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'create skills/README.md | add missing sections to skills/slack/SKILL.md: what-this-skill-is-for, suggested-workflow');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/README.md', 'skills/slack/SKILL.md']);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| add missing sections to skills\/slack\/SKILL\.md: what-this-skill-is-for, suggested-workflow @ skills\/README\.md, skills\/slack\/SKILL\.md/);
  assert.deepEqual(summary.skills.skills, [
    {
      id: 'delivery',
      name: 'delivery',
      description: 'Deliver concise handoffs.',
      status: 'discovered',
      foundationStatus: 'ready',
    },
    {
      id: 'slack',
      name: 'slack',
      description: null,
      status: 'discovered',
      foundationStatus: 'thin',
    },
  ]);
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(delivery, slack\); root missing @ skills\/README\.md; docs: skills\/delivery\/SKILL\.md; excerpts: delivery: Deliver concise handoffs\.\; thin docs: slack missing what-this-skill-is-for, suggested-workflow @ skills\/slack\/SKILL\.md/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 2\n- discovered: 2\n- custom: 0\n- top skills: delivery \[discovered\]: Deliver concise handoffs\.; slack \[discovered, thin\]/);
});

test('buildSummary surfaces ready sections for partially structured thin skill docs', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'slack', 'SKILL.md'),
    '# Slack\n\n## What this skill is for\n- Keep Slack thread replies grounded in the source discussion.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.thinMissingSections, {
    slack: ['suggested-workflow'],
  });
  assert.deepEqual(summary.foundation.core.skills.thinReadySections, {
    slack: ['what-this-skill-is-for'],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinMissingSections, {
    'skills/slack/SKILL.md': ['suggested-workflow'],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinReadySections, {
    'skills/slack/SKILL.md': ['what-this-skill-is-for'],
  });
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| add missing sections to skills\/slack\/SKILL\.md: suggested-workflow @ skills\/README\.md, skills\/slack\/SKILL\.md; context thin docs slack sections 1\/2 ready \(what-this-skill-is-for\), missing suggested-workflow; command /);
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(slack\); root missing @ skills\/README\.md; thin docs: slack sections 1\/2 ready \(what-this-skill-is-for\), missing suggested-workflow @ skills\/slack\/SKILL\.md/);
});

test('buildSummary treats partially structured skills root guidance as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo guidance for reusable procedures.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: true,
    rootPath: 'skills/README.md',
    rootExcerpt: 'Shared repo guidance for reusable procedures.',
    rootMissingSections: ['layout'],
    rootReadySections: ['what-lives-here'],
    count: 1,
    documentedCount: 1,
    undocumentedCount: 0,
    thinCount: 0,
    sample: ['delivery'],
    samplePaths: ['skills/delivery/SKILL.md'],
    sampleExcerpts: ['delivery: Deliver concise handoffs.'],
    undocumentedSample: [],
    undocumentedPaths: [],
    thinSample: [],
    thinPaths: [],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 3,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['skills'],
    recommendedActions: ['add missing sections to skills/README.md: layout'],
  });
  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'skills',
    recommendedAction: 'add missing sections to skills/README.md: layout',
    recommendedCommand: skillsCommand,
    recommendedPaths: ['skills/README.md'],
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
        summary: '1 registered, 1 documented, root 1/2 sections ready (what-lives-here), missing layout',
        action: 'add missing sections to skills/README.md: layout',
        paths: ['skills/README.md'],
        thinPaths: ['skills/README.md'],
        rootThinMissingSections: ['layout'],
        rootThinReadySections: ['what-lives-here'],
        command: skillsCommand,
      },
    ],
  });
  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'add missing sections to skills/README.md: layout');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/README.md']);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: add missing sections to skills\/README\.md: layout @ skills\/README\.md; context root sections 1\/2 ready \(what-lives-here\), missing layout; command /);
  assert.match(summary.promptPreview, /skills: 1 registered, 1 documented \(delivery\); root: Shared repo guidance for reusable procedures\. @ skills\/README\.md; root sections 1\/2 ready \(what-lives-here\), missing layout; docs: skills\/delivery\/SKILL\.md; excerpts: delivery: Deliver concise handoffs\./);
  assert.match(summary.promptPreview, /node -e 'const fs = require\('/);
});

test('buildSummary treats deeper markdown headings in skills root docs as structured sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n### What lives here\n- Shared repo guidance for reusable procedures.\n\n### Layout\n- Each skill lives under skills/<name>/SKILL.md.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operational takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.doesNotMatch(summary.promptPreview, /root missing @ skills\/README\.md/);
});

test('buildSummary treats skills root headings with closing hashes as structured sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n### What lives here ###\n- Shared repo guidance for reusable procedures.\n\n### Layout ###\n- Each skill lives under skills/<name>/SKILL.md.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operational takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.doesNotMatch(summary.promptPreview, /root missing @ skills\/README\.md/);
});

test('buildSummary treats soul and voice headings with closing hashes as structured sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo guidance for reusable procedures.\n\n## Layout\n- Each skill lives under skills/<name>/SKILL.md.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone ##\n- Keep replies direct.\n\n## Signature moves ##\n- Lead with the operational takeaway.\n\n## Avoid ##\n- Avoid vague filler.\n\n## Language hints ##\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths ##\n- Preserve durable operator intent.\n\n## Boundaries ##\n- Do not invent source material.\n\n## Vibe ##\n- Stay grounded and practical.\n\n## Continuity ##\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.deepEqual(summary.foundation.core.soul.missingSections, []);
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.match(summary.promptPreview, /soul: present, \d+ lines, .*sections 4\/4 ready \(core-truths, boundaries, vibe, continuity\)/);
  assert.match(summary.promptPreview, /voice: present, \d+ lines, .*sections 4\/4 ready \(tone, signature-moves, avoid, language-hints\)/);
});

test('buildSummary treats setext headings across root and profile foundation docs as structured sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\nWhat lives here\n---------------\n- Shared repo guidance for reusable procedures.\n\nLayout\n------\n- Each skill lives under skills/<name>/SKILL.md.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    '# Delivery\n\nWhat this skill is for\n----------------------\n- Deliver concise handoffs.\n\nSuggested workflow\n------------------\n- Re-run the narrowest verification first.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\nTone\n----\n- Keep replies direct.\n\nSignature moves\n---------------\n- Lead with the operational takeaway.\n\nAvoid\n-----\n- Avoid vague filler.\n\nLanguage hints\n--------------\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nCore truths\n-----------\n- Preserve durable operator intent.\n\nBoundaries\n----------\n- Do not invent source material.\n\nVibe\n-----\n- Stay grounded and practical.\n\nContinuity\n----------\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.equal(summary.foundation.core.skills.rootExcerpt, 'Shared repo guidance for reusable procedures.');
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['delivery: Deliver concise handoffs.']);
  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.deepEqual(summary.foundation.core.soul.missingSections, []);
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Preserve durable operator intent.');
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.foundation.core.skills.documentedCount, 1);
  assert.equal(summary.foundation.core.skills.thinCount, 0);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.doesNotMatch(summary.promptPreview, /root missing @ skills\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /thin docs: delivery/);
});

test('buildSummary keeps untouched soul and voice starter templates queued as thin core foundation coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo guidance for reusable procedures.\n\n## Layout\n- Each skill lives under skills/<name>/SKILL.md.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), VOICE_STARTER_TEMPLATE);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.overview.readyAreaCount, 2);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['soul', 'voice']);
  assert.deepEqual(summary.foundation.core.soul.readySections, []);
  assert.deepEqual(summary.foundation.core.soul.missingSections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.deepEqual(summary.foundation.core.voice.readySections, []);
  assert.deepEqual(summary.foundation.core.voice.missingSections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 2\/4 ready \(2 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /soul \[thin\]: add missing sections to SOUL\.md: core-truths, boundaries, vibe, continuity @ SOUL\.md/);
  assert.match(summary.promptPreview, /voice \[thin\]: add missing sections to voice\/README\.md: tone, signature-moves, avoid, language-hints @ voice\/README\.md/);
});

test('buildSummary ignores skills root section headings that only appear inside fenced code blocks', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\nShared repo guidance for reusable procedures.\n\n```md\n## What lives here\n- Example template only.\n\n## Layout\n- Example template only.\n```\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 3);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, 'add missing sections to skills/README.md: what-lives-here, layout');
  assert.match(summary.promptPreview, /root sections 0\/2 ready, missing what-lives-here, layout/);
  assert.match(summary.promptPreview, /skills \[thin\]: add missing sections to skills\/README\.md: what-lives-here, layout/);
});

test('buildSummary ignores soul and voice section headings that only appear inside fenced code blocks with fence-like lines', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents reusable operator workflows.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\nKeep replies direct.\n\n```md\n## Tone\n- Example template only.\n```tsx\n## Signature moves\n- Example template only.\n## Avoid\n- Example template only.\n## Language hints\n- Example template only.\n```\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\nBuild a faithful operator core.\n\n```md\n## Core truths\n- Example template only.\n```tsx\n## Boundaries\n- Example template only.\n## Continuity\n- Example template only.\n```\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.voice.structured, false);
  assert.equal(summary.foundation.core.voice.lineCount, 1);
  assert.equal(summary.foundation.core.voice.excerpt, 'Keep replies direct.');
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.foundation.core.soul.structured, false);
  assert.equal(summary.foundation.core.soul.lineCount, 1);
  assert.equal(summary.foundation.core.soul.excerpt, 'Build a faithful operator core.');
  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.deepEqual(summary.foundation.core.soul.missingSections, []);
  assert.doesNotMatch(summary.promptPreview, /Example template only/);
});

test('buildSummary treats deeper markdown headings in skill docs as structured guidance', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\n### What this skill is for\n- Keep scheduled follow-ups reliable.\n\n### Suggested workflow\n- Re-run the narrowest verification first.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operational takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 1);
  assert.equal(summary.foundation.core.skills.thinCount, 0);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['cron: Keep scheduled follow-ups reliable.']);
  assert.equal(summary.foundation.core.skills.thinMissingSections, undefined);
  assert.equal(summary.foundation.core.skills.thinReadySections, undefined);
  assert.doesNotMatch(summary.promptPreview, /thin docs: cron/);
});

test('buildSummary treats skill doc headings with closing hashes as structured guidance', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\n### What this skill is for ###\n- Keep scheduled follow-ups reliable.\n\n### Suggested workflow ###\n- Re-run the narrowest verification first.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operational takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 1);
  assert.equal(summary.foundation.core.skills.thinCount, 0);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['cron: Keep scheduled follow-ups reliable.']);
  assert.equal(summary.foundation.core.skills.thinMissingSections, undefined);
  assert.equal(summary.foundation.core.skills.thinReadySections, undefined);
  assert.doesNotMatch(summary.promptPreview, /thin docs: cron/);
});

test('buildSummary ignores skill section headings that only appear inside fenced code blocks', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\nKeep scheduled follow-ups reliable.\n\n```md\n## What this skill is for\n- Example template only.\n```\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 1);
  assert.equal(summary.foundation.core.skills.thinCount, 0);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['cron: Keep scheduled follow-ups reliable.']);
  assert.equal(summary.foundation.core.skills.thinMissingSections, undefined);
  assert.equal(summary.foundation.core.skills.thinReadySections, undefined);
  assert.doesNotMatch(summary.promptPreview, /thin docs: cron/);
});

test('buildSummary ignores skill section headings inside tilde fenced code blocks too', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\nKeep scheduled follow-ups reliable.\n\n~~~md\n## What this skill is for\n- Example template only.\n~~~\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 1);
  assert.equal(summary.foundation.core.skills.thinCount, 0);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['cron: Keep scheduled follow-ups reliable.']);
  assert.equal(summary.foundation.core.skills.thinMissingSections, undefined);
  assert.equal(summary.foundation.core.skills.thinReadySections, undefined);
  assert.doesNotMatch(summary.promptPreview, /thin docs: cron/);
});

test('buildSummary keeps skill docs with fenced template examples thin until they contain real prose guidance', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\n```md\n## What this skill is for\n- Example template only.\n\n## Suggested workflow\n- Example workflow only.\n```\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 0);
  assert.equal(summary.foundation.core.skills.thinCount, 1);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, []);
  assert.deepEqual(summary.foundation.core.skills.thinMissingSections, {
    cron: ['what-this-skill-is-for', 'suggested-workflow'],
  });
  assert.match(summary.promptPreview, /thin docs: cron missing what-this-skill-is-for, suggested-workflow @ skills\/cron\/SKILL\.md/);
});

test('buildSummary keeps skill docs with mismatched fence markers thin until a matching fence really closes', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\n```md\n~~~\n## What this skill is for\n- Example template only.\n\n## Suggested workflow\n- Example workflow only.\n```\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 0);
  assert.equal(summary.foundation.core.skills.thinCount, 1);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, []);
  assert.deepEqual(summary.foundation.core.skills.thinMissingSections, {
    cron: ['what-this-skill-is-for', 'suggested-workflow'],
  });
  assert.match(summary.promptPreview, /thin docs: cron missing what-this-skill-is-for, suggested-workflow @ skills\/cron\/SKILL\.md/);
  assert.doesNotMatch(summary.promptPreview, /Example template only/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
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
      'skills/README.md',
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
  });

  assert.deepEqual(summary.foundation.core.skills, {
    hasRootDocument: false,
    rootPath: 'skills/README.md',
    rootExcerpt: null,
    count: 6,
    hasRootDocument: false,
    rootPath: 'skills/README.md',
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
      'create skills/README.md | create skills/alpha/SKILL.md, skills/beta/SKILL.md, skills/delta/SKILL.md, skills/epsilon/SKILL.md, skills/gamma/SKILL.md, and skills/zeta/SKILL.md',
    ],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'skills',
      status: 'thin',
      summary: '6 registered, 0 documented, root missing @ skills/README.md',
      action: 'create skills/README.md | create skills/alpha/SKILL.md, skills/beta/SKILL.md, skills/delta/SKILL.md, skills/epsilon/SKILL.md, skills/gamma/SKILL.md, and skills/zeta/SKILL.md',
      paths: [
        'skills/README.md',
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
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| create skills\/alpha\/SKILL\.md, skills\/beta\/SKILL\.md, skills\/delta\/SKILL\.md, skills\/epsilon\/SKILL\.md, skills\/gamma\/SKILL\.md, and skills\/zeta\/SKILL\.md/);
});

test('buildSummary work loop surfaces a runnable command for thin core skills coverage', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');

  const summary = buildSummary(rootDir);
  const skillsCommand = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md', 'skills/slack/SKILL.md'],
    missingPaths: ['skills/slack/SKILL.md'],
  });

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'create skills/README.md | create skills/slack/SKILL.md');
  assert.equal(summary.workLoop.currentPriority?.command, skillsCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['skills/README.md', 'skills/slack/SKILL.md']);
  assert.match(summary.promptPreview, /Work loop:/);
  assert.match(summary.promptPreview, /command: \(mkdir -p 'skills' && printf %s '# Skills[\s\S]*\) && \(mkdir -p 'skills\/slack' && for file in 'skills\/slack\/SKILL\.md'; do \[ -f "\$file" \] \|\| printf %s '# Starter skill/);
});

test('buildSummary work loop includes all stale intake paths when bulk intake scaffolding is the next step', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'slack'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n- Keep replies direct.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\nBuild a faithful operator core.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'slack', 'SKILL.md'), '# Slack skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.');

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

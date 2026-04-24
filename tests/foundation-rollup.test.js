import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFoundationRollup } from '../src/core/foundation-rollup.js';
import { buildFoundationRollup as buildFoundationRollupTs } from '../src/core/foundation-rollup.ts';
import { PromptAssembler } from '../src/core/prompt-assembler.ts';
import { buildCoreFoundationCommand } from '../src/core/foundation-core-commands.ts';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { buildSummary } from '../src/index.js';

const VOICE_STARTER_TEMPLATE = '# Voice\n\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n';
const READY_VOICE_DOC = '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n';
const READY_SOUL_DOC = '# Soul\n\n## Core truths\n- Build a faithful operator core.\n\n## Boundaries\n- Do not bluff certainty.\n\n## Vibe\n- Grounded and direct.\n\n## Continuity\n- Preserve clear priorities.\n';
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
        memory: { candidateCount: 2, latestTypes: ['message', 'text'], sampleSummaries: ['Ship the first slice.', 'Keep the scope tight.'] },
        voice: { candidateCount: 2, sampleTypes: ['message', 'text'], sampleExcerpts: ['Ship the first slice.'] },
        soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Keep the scope tight.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['execution heuristic'] },
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
        memory: { candidateCount: 1, latestTypes: ['text'], sampleSummaries: ['Tight loops beat big plans.'] },
        voice: { candidateCount: 1, sampleTypes: ['message'], sampleExcerpts: ['Tight loops beat big plans.'] },
        soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Tight loops beat big plans.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['feedback-loop heuristic'] },
      },
    },
  ];

  assert.deepEqual(buildFoundationRollup(profiles), buildFoundationRollupTs(profiles));
});

test('buildFoundationRollup uses latest material ids to break stale-queue ties when timestamps match', () => {
  const profiles = [
    {
      id: 'alpha-operator',
      materialCount: 1,
      profile: { displayName: 'Alpha Operator' },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-message',
      latestMaterialSourcePath: 'profiles/alpha-operator/materials/2026-04-20T12-00-00-000Z-message.json',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: false,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the lane simple.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
    },
    {
      id: 'beta-operator',
      materialCount: 1,
      profile: { displayName: 'Beta Operator' },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
      latestMaterialSourcePath: 'profiles/beta-operator/materials/2026-04-20T12-00-00-000Z-talk.json',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: false,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the lane simple.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
    },
  ];

  const rollup = buildFoundationRollupTs(profiles);

  assert.equal(rollup.maintenance.recommendedProfileId, 'beta-operator');
  assert.equal(rollup.maintenance.recommendedLatestMaterialId, '2026-04-20T12-00-00-000Z-talk');
  assert.equal(rollup.maintenance.recommendedLatestMaterialSourcePath, 'profiles/beta-operator/materials/2026-04-20T12-00-00-000Z-talk.json');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.id, 'beta-operator');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.latestMaterialId, '2026-04-20T12-00-00-000Z-talk');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.latestMaterialSourcePath, 'profiles/beta-operator/materials/2026-04-20T12-00-00-000Z-talk.json');
  assert.equal(rollup.maintenance.queuedProfiles[1]?.id, 'alpha-operator');
  assert.equal(rollup.maintenance.queuedProfiles[1]?.latestMaterialId, '2026-04-20T12-00-00-000Z-message');
  assert.equal(rollup.maintenance.queuedProfiles[1]?.latestMaterialSourcePath, 'profiles/alpha-operator/materials/2026-04-20T12-00-00-000Z-message.json');
  assert.deepEqual(buildFoundationRollup(profiles), rollup);
});

test('buildFoundationRollup uses latest material source paths to break stale-queue ties when timestamps and ids match', () => {
  const profiles = [
    {
      id: 'alpha-operator',
      materialCount: 1,
      profile: { displayName: 'Alpha Operator' },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-text',
      latestMaterialSourcePath: 'profiles/alpha-operator/imports/a-first.txt',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: false,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the lane simple.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
    },
    {
      id: 'beta-operator',
      materialCount: 1,
      profile: { displayName: 'Beta Operator' },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-text',
      latestMaterialSourcePath: 'profiles/beta-operator/imports/z-last.txt',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: false,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the lane simple.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Keep the lane simple.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
    },
  ];

  const rollup = buildFoundationRollupTs(profiles);

  assert.equal(rollup.maintenance.recommendedProfileId, 'beta-operator');
  assert.equal(rollup.maintenance.recommendedLatestMaterialSourcePath, 'profiles/beta-operator/imports/z-last.txt');
  assert.deepEqual(rollup.maintenance.queuedProfiles.map((profile) => profile.id), ['beta-operator', 'alpha-operator']);
  assert.deepEqual(buildFoundationRollup(profiles), rollup);
});

test('buildFoundationRollup normalizes stale maintenance queue metadata before exposing it', () => {
  const rollup = buildFoundationRollupTs([
    {
      id: '  jane-doe  ',
      materialCount: 1,
      profile: {
        displayName: '  Jane Doe  ',
        summary: '  Tight loops beat big plans.  ',
      },
      latestMaterialAt: ' 2026-04-16T16:00:00.000Z ',
      latestMaterialId: ' 2026-04-16T16-00-00-000Z-talk ',
      latestMaterialSourcePath: ' profiles/jane-doe/materials/2026-04-16T16-00-00-000Z-talk.json ',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: false,
        missingDrafts: [' memory ', 'skills', 'memory', '', '   '],
        refreshReasons: [' missing drafts ', 'metadata-updated', 'missing drafts', '', '   '],
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Tight loops beat big plans.'] },
      },
    },
  ]);

  assert.equal(rollup.maintenance.recommendedProfileId, 'jane-doe');
  assert.equal(rollup.maintenance.recommendedLatestMaterialAt, '2026-04-16T16:00:00.000Z');
  assert.equal(rollup.maintenance.recommendedLatestMaterialId, '2026-04-16T16-00-00-000Z-talk');
  assert.equal(rollup.maintenance.recommendedLatestMaterialSourcePath, 'profiles/jane-doe/materials/2026-04-16T16-00-00-000Z-talk.json');
  assert.match(rollup.maintenance.recommendedAction ?? '', /^refresh Jane Doe \(jane-doe\) — reasons missing drafts \+ metadata-updated; evidence memory 1 \| voice 0 \| soul 0 \| skills 0$/);
  assert.deepEqual(rollup.maintenance.missingDraftCounts, {
    memory: 1,
    skills: 1,
    soul: 0,
    voice: 0,
  });
  assert.deepEqual(rollup.maintenance.refreshReasonCounts, {
    'missing drafts': 1,
    'metadata-updated': 1,
  });
  assert.equal(rollup.maintenance.queuedProfiles[0]?.label, 'Jane Doe (jane-doe)');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.displayName, 'Jane Doe');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.summary, 'Tight loops beat big plans.');
  assert.deepEqual(rollup.maintenance.queuedProfiles[0]?.missingDrafts, ['memory', 'skills']);
  assert.deepEqual(rollup.maintenance.queuedProfiles[0]?.refreshReasons, ['missing drafts', 'metadata-updated']);
});

test('buildFoundationRollup carries stale draft source provenance onto maintenance recommendations', () => {
  const rollup = buildFoundationRollupTs([
    {
      id: 'jane-doe',
      materialCount: 2,
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-text',
      latestMaterialSourcePath: 'profiles/jane-doe/imports/voice-note.txt',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: true,
        missingDrafts: [],
        refreshReasons: ['new materials', 'draft metadata drift'],
      },
      foundationDraftSummaries: {
        memory: {
          generated: true,
          path: 'profiles/jane-doe/memory/long-term/foundation.json',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
          sourceCount: 2,
          materialTypes: { message: 1, talk: 1 },
          entryCount: 1,
        },
        skills: {
          generated: true,
          path: 'profiles/jane-doe/skills/README.md',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
          sourceCount: 1,
          materialTypes: { talk: 1 },
        },
        soul: {
          generated: true,
          path: 'profiles/jane-doe/soul/README.md',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
          sourceCount: 1,
          materialTypes: { talk: 1 },
        },
        voice: {
          generated: true,
          path: 'profiles/jane-doe/voice/README.md',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/voice-note.txt',
          sourceCount: 2,
          materialTypes: { message: 1, talk: 1 },
        },
      },
      foundationReadiness: {
        memory: { candidateCount: 2, latestTypes: ['message', 'talk'], sampleSummaries: ['Tight loops beat big plans.'] },
        voice: { candidateCount: 2, sampleTypes: ['message', 'talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
        soul: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['Tight loops beat big plans.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['feedback-loop heuristic'] },
      },
    },
  ]);

  const expectedDraftSourcesSummary = 'memory 2 sources (message:1, talk:1), 1 entry, latest @ profiles/jane-doe/imports/call-notes.txt | skills 1 source (talk:1), latest @ profiles/jane-doe/imports/call-notes.txt | soul 1 source (talk:1), latest @ profiles/jane-doe/imports/call-notes.txt | voice 2 sources (message:1, talk:1), latest @ profiles/jane-doe/imports/voice-note.txt';

  assert.equal(rollup.maintenance.recommendedDraftSourcesSummary, expectedDraftSourcesSummary);
  assert.equal(rollup.maintenance.queuedProfiles[0]?.draftSourcesSummary, expectedDraftSourcesSummary);
});

test('buildFoundationRollup prioritizes metadata-drift foundation refreshes ahead of newer pure material refreshes when stale profiles are otherwise equally complete', () => {
  const rollup = buildFoundationRollupTs([
    {
      id: 'alpha-operator',
      materialCount: 1,
      profile: { displayName: 'Alpha Operator' },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-text',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: true,
        missingDrafts: [],
        refreshReasons: ['profile metadata drift', 'draft metadata drift'],
      },
      foundationDraftSummaries: {
        memory: { generated: true, entryCount: 1, latestSummaries: ['Keep the lane simple.'] },
        voice: { generated: true, highlights: ['- [text] Keep the lane simple.'] },
        soul: { generated: true, highlights: ['- [text] Keep the lane simple.'] },
        skills: { generated: true, highlights: ['- execution heuristic'] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, latestTypes: ['text'], sampleSummaries: ['Keep the lane simple.'] },
        voice: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Keep the lane simple.'] },
        soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Keep the lane simple.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['execution heuristic'] },
      },
    },
    {
      id: 'beta-operator',
      materialCount: 1,
      profile: { displayName: 'Beta Operator' },
      latestMaterialAt: '2026-04-21T12:00:00.000Z',
      latestMaterialId: '2026-04-21T12-00-00-000Z-text',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: true,
        missingDrafts: [],
        refreshReasons: ['new materials'],
      },
      foundationDraftSummaries: {
        memory: { generated: true, entryCount: 1, latestSummaries: ['Keep the lane simple.'] },
        voice: { generated: true, highlights: ['- [text] Keep the lane simple.'] },
        soul: { generated: true, highlights: ['- [text] Keep the lane simple.'] },
        skills: { generated: true, highlights: ['- execution heuristic'] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, latestTypes: ['text'], sampleSummaries: ['Keep the lane simple.'] },
        voice: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Keep the lane simple.'] },
        soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Keep the lane simple.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['execution heuristic'] },
      },
    },
  ]);

  assert.equal(rollup.maintenance.recommendedProfileId, 'alpha-operator');
  assert.deepEqual(rollup.maintenance.queuedProfiles.map((profile) => profile.id), ['alpha-operator', 'beta-operator']);
  assert.deepEqual(rollup.maintenance.queuedProfiles[0]?.refreshReasons, ['profile metadata drift', 'draft metadata drift']);
  assert.deepEqual(rollup.maintenance.queuedProfiles[1]?.refreshReasons, ['new materials']);
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
        memory: { candidateCount: 2, latestTypes: ['message', 'text'], sampleSummaries: ['Ship the first slice.', 'Keep the scope tight.'] },
        voice: { candidateCount: 2, sampleTypes: ['message', 'text'], sampleExcerpts: ['Ship the first slice.'] },
        soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Keep the scope tight.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['execution heuristic'] },
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
        memory: { candidateCount: 1, latestTypes: ['text'], sampleSummaries: ['Tight loops beat big plans.'] },
        voice: { candidateCount: 1, sampleTypes: ['message'], sampleExcerpts: ['Tight loops beat big plans.'] },
        soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Tight loops beat big plans.'] },
        skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['feedback-loop heuristic'] },
      },
    },
  ]);

  assert.deepEqual(rollup.memory, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    candidateCount: 3,
    repoStaleProfileCount: 1,
    totalEntries: 2,
    highlights: ['Ship the first slice.', 'Keep the scope tight.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(rollup.voice, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    candidateCount: 3,
    repoStaleProfileCount: 1,
    highlights: ['[message] Ship the first slice.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(rollup.soul, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    candidateCount: 2,
    repoStaleProfileCount: 1,
    highlights: ['[text] Keep the scope tight.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(rollup.skills, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    repoStaleProfileCount: 1,
    candidateCount: 2,
    highlights: ['execution heuristic', 'feedback-loop heuristic'],
  });
  assert.deepEqual(rollup.maintenance, {
    profileCount: 2,
    readyProfileCount: 1,
    refreshProfileCount: 1,
    incompleteProfileCount: 1,
    draftGapCountTotal: 8,
    draftGapCounts: {
      memory: 1,
      skills: 2,
      soul: 2,
      voice: 3,
    },
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
    refreshBundleCommand: "node src/index.js update foundation --person 'jane-doe'",
    recommendedProfileId: 'jane-doe',
    recommendedLabel: 'Jane Doe (jane-doe)',
    recommendedAction: 'refresh Jane Doe (jane-doe) — reasons missing drafts; evidence memory 1 (text) | voice 1 (message) | soul 1 (text) | skills 1 (talk)',
    recommendedCommand: "node src/index.js update foundation --person 'jane-doe'",
    recommendedPaths: [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
    recommendedLatestMaterialAt: null,
    recommendedLatestMaterialId: null,
    recommendedLatestMaterialSourcePath: null,
    recommendedCandidateSignalSummary: 'memory 1 (text) | voice 1 (message) | soul 1 (text) | skills 1 (talk)',
    recommendedDraftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.) | skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate | soul 1/3 ready (core-truths), missing boundaries/continuity | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints',
    helperCommands: {
      refreshAll: 'node src/index.js update foundation --all',
      refreshStale: 'node src/index.js update foundation --stale',
      refreshBundle: "node src/index.js update foundation --person 'jane-doe'",
    },
    queuedProfiles: [
      {
        id: 'jane-doe',
        displayName: null,
        summary: null,
        label: 'Jane Doe (jane-doe)',
        status: 'stale',
        generatedDraftCount: 0,
        expectedDraftCount: 4,
        candidateDraftCount: 4,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts'],
        latestMaterialAt: null,
        latestMaterialId: null,
        latestMaterialSourcePath: null,
        candidateSignalSummary: 'memory 1 (text) | voice 1 (message) | soul 1 (text) | skills 1 (talk)',
        draftGapCount: 8,
        draftGapCounts: {
          memory: 1,
          skills: 2,
          soul: 2,
          voice: 3,
        },
        draftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.) | skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate | soul 1/3 ready (core-truths), missing boundaries/continuity | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints',
        refreshCommand: "node src/index.js update foundation --person 'jane-doe'",
        paths: [
          'profiles/jane-doe/memory/long-term/foundation.json',
          'profiles/jane-doe/skills/README.md',
          'profiles/jane-doe/soul/README.md',
          'profiles/jane-doe/voice/README.md',
        ],
      },
    ],
  });
});

test('buildFoundationRollup keeps maintenance refresh paths aligned with concrete generated draft files', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'jane-doe',
      materialCount: 1,
      latestMaterialAt: '2026-04-23T10:00:00.000Z',
      latestMaterialId: '2026-04-23T10-00-00-000Z-talk',
      latestMaterialSourcePath: 'profiles/jane-doe/materials/2026-04-23T10-00-00-000Z-talk.json',
      foundationDraftStatus: {
        needsRefresh: true,
        complete: false,
        missingDrafts: ['voice'],
        refreshReasons: ['new materials'],
      },
      foundationDraftSummaries: {
        memory: {
          generated: true,
          path: 'profiles/jane-doe/memory/custom-foundation.json',
          entryCount: 2,
          latestSummaries: ['Preserve the concrete draft paths.'],
        },
        skills: {
          generated: true,
          path: 'profiles/jane-doe/skills/CUSTOM.md',
          highlights: ['- execution checklist'],
          readySectionCount: 3,
          totalSectionCount: 3,
          readySections: ['candidate-skills', 'evidence', 'gaps-to-validate'],
          missingSections: [],
        },
        soul: {
          generated: true,
          path: 'profiles/jane-doe/soul/CUSTOM.md',
          highlights: ['- Protect the operator context.'],
          readySectionCount: 4,
          totalSectionCount: 4,
          readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
          missingSections: [],
        },
        voice: {
          generated: false,
          highlights: [],
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['tone'],
          missingSections: ['signature-moves', 'avoid', 'language-hints'],
        },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Preserve the concrete draft paths.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution checklist'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Protect the operator context.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep the next step direct.'] },
      },
      profile: {
        displayName: 'Jane Doe',
        summary: 'Tight loops beat big plans.',
      },
    },
  ]);

  const expectedPaths = [
    'profiles/jane-doe/memory/custom-foundation.json',
    'profiles/jane-doe/skills/CUSTOM.md',
    'profiles/jane-doe/soul/CUSTOM.md',
    'profiles/jane-doe/voice/README.md',
  ];

  assert.deepEqual(rollup.maintenance.recommendedPaths, expectedPaths);
  assert.deepEqual(rollup.maintenance.queuedProfiles[0]?.paths, expectedPaths);
});

test('buildFoundationRollup shell-quotes refresh commands for profile ids with spaces and apostrophes', () => {
  const rollup = buildFoundationRollup([
    {
      id: "o'brien lane",
      materialCount: 1,
      latestMaterialAt: '2026-04-16T16:00:00.000Z',
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
      },
      foundationDraftSummaries: {
        memory: { generated: false, entryCount: 0, latestSummaries: [] },
        skills: { generated: false, highlights: [] },
        soul: { generated: false, highlights: [] },
        voice: { generated: false, highlights: [] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the feedback loop short.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Protect operator context.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep the feedback loop short.'] },
      },
    },
  ]);

  assert.equal(rollup.maintenance.refreshBundleCommand, "node src/index.js update foundation --person 'o'\"'\"'brien lane'");
  assert.equal(rollup.maintenance.recommendedCommand, "node src/index.js update foundation --person 'o'\"'\"'brien lane'");
  assert.equal(rollup.maintenance.helperCommands.refreshBundle, "node src/index.js update foundation --person 'o'\"'\"'brien lane'");
  assert.equal(rollup.maintenance.queuedProfiles[0]?.refreshCommand, "node src/index.js update foundation --person 'o'\"'\"'brien lane'");
});

test('buildFoundationRollup humanizes queued profile labels when display names are missing', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'jane-doe',
      materialCount: 1,
      latestMaterialAt: '2026-04-19T01:05:00.000Z',
      foundationDraftStatus: { needsRefresh: true, complete: false, missingDrafts: ['memory'], refreshReasons: ['missing drafts'] },
      foundationDraftSummaries: {
        memory: { generated: false, entryCount: 0, latestSummaries: [] },
        voice: { generated: false, highlights: [] },
        soul: { generated: false, highlights: [] },
        skills: { generated: false, highlights: [] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Tight loops beat big plans.'] },
        voice: { candidateCount: 0, sampleExcerpts: [] },
        soul: { candidateCount: 0, sampleExcerpts: [] },
        skills: { candidateCount: 0, sampleExcerpts: [] },
      },
    },
  ]);

  assert.equal(rollup.maintenance.queuedProfiles[0]?.label, 'Jane Doe (jane-doe)');
});

test('buildFoundationRollup preserves aggregate draft gap counts when section names are unavailable', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'jane-doe',
      materialCount: 1,
      latestMaterialAt: '2026-04-16T16:00:00.000Z',
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        refreshReasons: ['missing drafts', 'new materials'],
      },
      foundationDraftSummaries: {
        memory: { generated: false, entryCount: 0, latestSummaries: [] },
        skills: { generated: false, highlights: [], readySectionCount: 1, totalSectionCount: 3 },
        soul: {
          generated: false,
          highlights: [],
          readySectionCount: 2,
          totalSectionCount: 4,
          readySections: ['core-truths', 'boundaries'],
          headingAliases: ['core-values->core-truths'],
        },
        voice: {
          generated: false,
          highlights: [],
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['tone'],
          headingAliases: ['voice-should-capture->signature-moves'],
        },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Tight loops beat big plans.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Stay grounded.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep it direct.'] },
      },
      profile: { displayName: 'Jane Doe' },
    },
  ]);

  assert.equal(
    rollup.maintenance.recommendedDraftGapSummary,
    'memory missing, 1 candidate (Tight loops beat big plans.) | skills 1/3 ready | soul 2/4 ready (core-truths, boundaries); aliases core-values->core-truths | voice 1/4 ready (tone); aliases voice-should-capture->signature-moves',
  );
  assert.equal(
    rollup.maintenance.queuedProfiles[0]?.draftGapSummary,
    'memory missing, 1 candidate (Tight loops beat big plans.) | skills 1/3 ready | soul 2/4 ready (core-truths, boundaries); aliases core-values->core-truths | voice 1/4 ready (tone); aliases voice-should-capture->signature-moves',
  );
});

test('buildFoundationRollup prioritizes stale profiles with more structured draft gaps when missing draft counts tie', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'alpha-gap-heavy',
      materialCount: 1,
      latestMaterialAt: '2026-04-20T10:00:00.000Z',
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory'],
        refreshReasons: ['new materials'],
      },
      foundationDraftSummaries: {
        memory: { generated: false, entryCount: 0, latestSummaries: [] },
        skills: { generated: true, readySectionCount: 1, totalSectionCount: 3, readySections: ['candidate-skills'] },
        soul: { generated: true, readySectionCount: 1, totalSectionCount: 4, readySections: ['core-truths'] },
        voice: { generated: true, readySectionCount: 1, totalSectionCount: 4, readySections: ['tone'] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the loop short.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Protect operator context.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep it direct.'] },
      },
    },
    {
      id: 'beta-gap-light',
      materialCount: 1,
      latestMaterialAt: '2026-04-20T10:05:00.000Z',
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory'],
        refreshReasons: ['new materials'],
      },
      foundationDraftSummaries: {
        memory: { generated: false, entryCount: 0, latestSummaries: [] },
        skills: { generated: true, readySectionCount: 2, totalSectionCount: 3, readySections: ['candidate-skills', 'evidence'] },
        soul: { generated: true, readySectionCount: 3, totalSectionCount: 4, readySections: ['core-truths', 'boundaries', 'vibe'] },
        voice: { generated: true, readySectionCount: 3, totalSectionCount: 4, readySections: ['tone', 'signature-moves', 'avoid'] },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the loop short.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Protect operator context.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Keep it direct.'] },
      },
    },
  ]);

  assert.equal(rollup.maintenance.recommendedProfileId, 'alpha-gap-heavy');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.id, 'alpha-gap-heavy');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.draftGapCount, 9);
  assert.deepEqual(rollup.maintenance.queuedProfiles[0]?.draftGapCounts, {
    memory: 1,
    skills: 2,
    soul: 3,
    voice: 3,
  });
  assert.equal(rollup.maintenance.queuedProfiles[1]?.id, 'beta-gap-light');
  assert.equal(rollup.maintenance.queuedProfiles[1]?.draftGapCount, 4);
});

test('PromptAssembler foundation rollup keeps repo-stale counts visible across voice, soul, and skills', () => {
  const preview = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'A configurable personality core.' },
    soulProfile: { excerpt: null, coreTruths: [], boundaries: [], vibe: [], continuity: [] },
    voice: { tone: 'direct', style: 'documented' },
    memorySummary: { shortTermEntries: 0, longTermEntries: 0, totalEntries: 0, shortTermPresent: false, longTermPresent: false },
    skillsSummary: { skillCount: 0, discoveredCount: 0, customCount: 0, skills: [] },
    foundationRollup: {
      memory: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        candidateCount: 3,
        repoStaleProfileCount: 1,
        totalEntries: 2,
        highlights: ['Keep the feedback loop short.', 'Ship the thin slice first.'],
      },
      voice: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        candidateCount: 2,
        repoStaleProfileCount: 1,
        highlights: ['[talk] Keep the feedback loop short.', 'Tight loops beat big plans.'],
      },
      soul: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        candidateCount: 2,
        repoStaleProfileCount: 1,
        highlights: ['[talk] Keep the feedback loop short.', 'Tight loops beat big plans.'],
      },
      skills: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        repoStaleProfileCount: 1,
        candidateCount: 2,
        highlights: ['execution heuristic', 'feedback-loop heuristic'],
      },
      maintenance: {
        profileCount: 2,
        readyProfileCount: 1,
        refreshProfileCount: 1,
        incompleteProfileCount: 1,
        missingDraftCounts: { memory: 1, skills: 1, soul: 1, voice: 1 },
        refreshReasonCounts: { 'missing drafts': 1 },
        recommendedAction: 'refresh Jane Doe (jane-doe) — reasons missing drafts; evidence memory 1 (text) | voice 1 (message) | soul 1 (text) | skills 1 (talk)',
        recommendedCommand: "node src/index.js update foundation --person 'jane-doe'",
        recommendedPaths: [
          'profiles/jane-doe/memory/long-term/foundation.json',
          'profiles/jane-doe/skills/README.md',
          'profiles/jane-doe/soul/README.md',
          'profiles/jane-doe/voice/README.md',
        ],
        recommendedLatestMaterialAt: '2026-04-20T12:00:00.000Z',
        recommendedLatestMaterialId: '2026-04-20T12-00-00-000Z-text',
        recommendedLatestMaterialSourcePath: 'profiles/jane-doe/materials/2026-04-20T12-00-00-000Z-text.json',
        recommendedDraftSourcesSummary: 'memory 2 sources (message:1, talk:1), 1 entry, latest @ profiles/jane-doe/imports/call-notes.txt | skills 1 source (talk:1), latest @ profiles/jane-doe/imports/call-notes.txt | soul 1 source (text:1), latest @ profiles/jane-doe/imports/call-notes.txt | voice 1 source (message:1), latest @ profiles/jane-doe/imports/voice-note.txt',
        recommendedCandidateSignalSummary: 'memory 1 (text) | voice 1 (message) | soul 1 (text) | skills 1 (talk)',
        staleRefreshCommand: "node src/index.js update foundation --stale",
        helperCommands: { refreshStale: "node src/index.js update foundation --stale" },
        queuedProfiles: [
          {
            id: 'jane-doe',
            label: 'Jane Doe (jane-doe)',
            status: 'stale',
            generatedDraftCount: 0,
            expectedDraftCount: 4,
            missingDrafts: ['memory', 'skills', 'soul', 'voice'],
            latestMaterialAt: '2026-04-20T12:00:00.000Z',
            latestMaterialId: '2026-04-20T12-00-00-000Z-text',
            latestMaterialSourcePath: 'profiles/jane-doe/materials/2026-04-20T12-00-00-000Z-text.json',
            candidateSignalSummary: 'memory 1 (text) | voice 1 (message) | soul 1 (text) | skills 1 (talk)',
            draftSourcesSummary: 'memory 2 sources (message:1, talk:1), 1 entry, latest @ profiles/jane-doe/imports/call-notes.txt | skills 1 source (talk:1), latest @ profiles/jane-doe/imports/call-notes.txt | soul 1 source (text:1), latest @ profiles/jane-doe/imports/call-notes.txt | voice 1 source (message:1), latest @ profiles/jane-doe/imports/voice-note.txt',
          },
        ],
      },
    },
  }).buildPreview(10000);

  assert.match(preview, /Foundation rollup:/);
  assert.match(preview, /memory: 1\/2 generated, 2 candidate profiles, 3 candidates, 1 repo-stale profile, 2 entries, highlights: Keep the feedback loop short\. \| Ship the thin slice first\./);
  assert.match(preview, /voice: 1\/2 generated, 2 candidate profiles, 2 candidates, 1 repo-stale profile, highlights: \[talk\] Keep the feedback loop short\. \| Tight loops beat big plans\./);
  assert.match(preview, /soul: 1\/2 generated, 2 candidate profiles, 2 candidates, 1 repo-stale profile, highlights: \[talk\] Keep the feedback loop short\. \| Tight loops beat big plans\./);
  assert.match(preview, /skills: 1\/2 generated, 2 candidate profiles, 1 repo-stale profile, 2 candidates, highlights: execution heuristic \| feedback-loop heuristic/);
  assert.match(preview, /next refresh: refresh Jane Doe \(jane-doe\) — reasons missing drafts; evidence memory 1 \(text\) \| voice 1 \(message\) \| soul 1 \(text\) \| skills 1 \(talk\); command node src\/index\.js update foundation --person 'jane-doe' @ profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md; latest material 2026-04-20T12:00:00\.000Z \(2026-04-20T12-00-00-000Z-text\) @ profiles\/jane-doe\/materials\/2026-04-20T12-00-00-000Z-text\.json; draft sources memory 2 sources \(message:1, talk:1\), 1 entry, latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| skills 1 source \(talk:1\), latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| soul 1 source \(text:1\), latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| voice 1 source \(message:1\), latest @ profiles\/jane-doe\/imports\/voice-note\.txt/);
  assert.match(preview, /Jane Doe \(jane-doe\): stale, 0\/4 drafts generated, missing memory\/skills\/soul\/voice, latest material 2026-04-20T12:00:00\.000Z \(2026-04-20T12-00-00-000Z-text\) @ profiles\/jane-doe\/materials\/2026-04-20T12-00-00-000Z-text\.json, evidence memory 1 \(text\) \| voice 1 \(message\) \| soul 1 \(text\) \| skills 1 \(talk\), draft sources memory 2 sources \(message:1, talk:1\), 1 entry, latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| skills 1 source \(talk:1\), latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| soul 1 source \(text:1\), latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| voice 1 source \(message:1\), latest @ profiles\/jane-doe\/imports\/voice-note\.txt/);
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
    candidateCount: 3,
    repoStaleProfileCount: 1,
    totalEntries: 2,
    highlights: ['Keep the feedback loop short.', 'Ship the thin slice first.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(summary.foundation.voice, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    candidateCount: 3,
    repoStaleProfileCount: 1,
    highlights: ['[talk] Keep the feedback loop short.', '[message] Ship the thin slice first.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(summary.foundation.soul, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    candidateCount: 2,
    repoStaleProfileCount: 1,
    highlights: ['[talk] Keep the feedback loop short.', 'Tight loops beat big plans.'],
  });
  assert.deepEqual(summary.foundation.skills, {
    profileCount: 2,
    generatedProfileCount: 1,
    candidateProfileCount: 2,
    repoStaleProfileCount: 1,
    candidateCount: 2,
    highlights: ['execution heuristic', 'feedback-loop heuristic'],
  });
  assert.deepEqual(summary.foundation.maintenance, {
    profileCount: 2,
    readyProfileCount: 1,
    refreshProfileCount: 1,
    incompleteProfileCount: 1,
    draftGapCountTotal: 12,
    draftGapCounts: {
      memory: 1,
      skills: 3,
      soul: 4,
      voice: 4,
    },
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
    refreshBundleCommand: "node src/index.js update foundation --person 'jane-doe'",
    recommendedProfileId: 'jane-doe',
    recommendedLabel: 'Jane Doe (jane-doe)',
    recommendedAction: 'refresh Jane Doe (jane-doe) — reasons missing drafts + new materials; evidence memory 1 (talk) | voice 1 (talk) | soul 1 (talk) | skills 1 (talk)',
    recommendedCommand: "node src/index.js update foundation --person 'jane-doe'",
    recommendedPaths: [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
    recommendedLatestMaterialAt: summary.foundation.maintenance.recommendedLatestMaterialAt,
    recommendedLatestMaterialId: summary.foundation.maintenance.recommendedLatestMaterialId,
    recommendedLatestMaterialSourcePath: summary.foundation.maintenance.recommendedLatestMaterialSourcePath,
    recommendedCandidateSignalSummary: 'memory 1 (talk) | voice 1 (talk) | soul 1 (talk) | skills 1 (talk)',
    recommendedDraftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.)',
    helperCommands: {
      refreshAll: 'node src/index.js update foundation --all',
      refreshStale: 'node src/index.js update foundation --stale',
      refreshBundle: "node src/index.js update foundation --person 'jane-doe'",
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
        latestMaterialId: summary.foundation.maintenance.queuedProfiles[0].latestMaterialId,
        latestMaterialSourcePath: summary.foundation.maintenance.queuedProfiles[0].latestMaterialSourcePath,
        candidateSignalSummary: 'memory 1 (talk) | voice 1 (talk) | soul 1 (talk) | skills 1 (talk)',
        draftGapCount: 12,
        draftGapCounts: {
          memory: 1,
          skills: 3,
          soul: 4,
          voice: 4,
        },
        draftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.)',
        refreshCommand: "node src/index.js update foundation --person 'jane-doe'",
        paths: [
          'profiles/jane-doe/memory/long-term/foundation.json',
          'profiles/jane-doe/skills/README.md',
          'profiles/jane-doe/soul/README.md',
          'profiles/jane-doe/voice/README.md',
        ],
      },
    ],
  });
  assert.match(summary.foundation.maintenance.queuedProfiles[0].latestMaterialAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(summary.promptPreview, /Ingestion entrance:/);
  assert.match(summary.promptPreview, /drafts: 1 ready, 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /helpers: .*refresh-all node src\/index\.js update foundation --all .* refresh-bundle node src\/index\.js update foundation --person 'jane-doe'/);
  assert.equal(summary.profileSnapshots[1].refreshCommand, "node src/index.js update foundation --person 'jane-doe'");
  assert.deepEqual(summary.profileSnapshots[1].refreshPaths, [
    'profiles/jane-doe/memory/long-term/foundation.json',
    'profiles/jane-doe/skills/README.md',
    'profiles/jane-doe/soul/README.md',
    'profiles/jane-doe/voice/README.md',
  ]);
  assert.match(summary.profileSnapshots[1].snapshot, /refresh drafts: node src\/index\.js update foundation --person 'jane-doe'/);
  assert.match(summary.profileSnapshots[1].snapshot, /refresh paths: profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest .*?, intake starter template — add entries before import \(templates: message, screenshot, talk, text\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt; gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| refresh-intake node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe'(?: --summary 'Tight loops beat big plans\.')? \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/jane-doe\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/jane-doe\/imports\/materials\.template\.json' --refresh-foundation \| inspect-after-edit node src\/index\.js import intake --person 'jane-doe' \| replay-after-edit node src\/index\.js import intake --person 'jane-doe' --refresh-foundation \| import node src\/index\.js import text --person jane-doe --file 'profiles\/jane-doe\/imports\/sample\.txt' --refresh-foundation \| refresh node src\/index\.js update foundation --person 'jane-doe' \| sync node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe'(?: --summary 'Tight loops beat big plans\.')? --refresh-foundation/);
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
    candidateCount: 0,
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
    rootReadySectionCount: 2,
    rootTotalSectionCount: 2,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
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
    rootReadySectionCount: 2,
    rootTotalSectionCount: 2,
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
    readySectionCount: 0,
    totalSectionCount: 4,
    readySections: [],
    missingSections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
  });
  assert.deepEqual(summary.foundation.core.voice, {
    present: true,
    path: 'voice/README.md',
    rootPath: 'voice/README.md',
    lineCount: 2,
    excerpt: 'Keep replies direct.',
    rootExcerpt: 'Keep replies direct.',
    structured: false,
    readySectionCount: 0,
    totalSectionCount: 4,
    readySections: [],
    missingSections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
  });
  assert.deepEqual(summary.foundation.core.overview, {
    readyAreaCount: 2,
    totalAreaCount: 4,
    missingAreas: [],
    thinAreas: ['soul', 'voice'],
    recommendedActions: [
      'add missing sections to SOUL.md: core-truths, boundaries, vibe, continuity',
      'add missing sections to voice/README.md: tone, signature-moves, avoid, language-hints',
    ],
  });
  assert.equal(summary.foundation.core.maintenance.areaCount, 4);
  assert.equal(summary.foundation.core.maintenance.readyAreaCount, 2);
  assert.equal(summary.foundation.core.maintenance.missingAreaCount, 0);
  assert.equal(summary.foundation.core.maintenance.thinAreaCount, 2);
  assert.match(summary.foundation.core.maintenance.helperCommands.scaffoldThin ?? '', /SOUL\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.scaffoldThin ?? '', /voice\/README\.md/);
  assert.equal(summary.foundation.core.maintenance.queuedAreas.length, 2);
  assert.match(summary.promptPreview, /Core foundation:/);
  assert.match(summary.promptPreview, /coverage: 2\/4 ready; thin soul, voice/);
  assert.match(summary.promptPreview, /queue: 2 ready, 2 thin, 0 missing/);
  assert.match(summary.promptPreview, /- soul: present, 2 lines, Build a faithful operator core\. @ SOUL\.md, sections 0\/4 ready, missing core-truths, boundaries, vibe, continuity/);
  assert.match(summary.promptPreview, /- voice: present, 2 lines, Keep replies direct\. @ voice\/README\.md, sections 0\/4 ready, missing tone, signature-moves, avoid, language-hints/);
  assert.doesNotMatch(summary.promptPreview, /ready details: .*soul sections 4\/4/);
  assert.doesNotMatch(summary.promptPreview, /ready details: .*voice sections 4\/4/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
    recommendedStatus: 'thin',
    recommendedSummary: '1 registered, 1 documented, root missing @ skills/README.md',
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
  assert.match(summary.promptPreview, /- next repair: \[thin\] create skills\/README\.md; command mkdir -p 'skills'/);
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
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.memory.rootExcerpt, 'Keep durable repo knowledge organized without leaking raw YAML metadata.');
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootReadySections, []);
  assert.equal(summary.foundation.core.memory.rootReadySectionCount, 0);
  assert.equal(summary.foundation.core.memory.rootTotalSectionCount, 2);
  assert.equal(summary.foundation.core.skills.rootExcerpt, 'Keep shared operator procedures discoverable.');
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.equal(summary.foundation.core.skills.rootReadySectionCount, 2);
  assert.equal(summary.foundation.core.skills.rootTotalSectionCount, 2);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; buckets 3\/3 ready \(daily, long-term, scratch\); aliases daily canonical via shortTermEntries, shortTermPresent; samples: daily\/2026-04-18\.md, long-term\/operator\.json, scratch\/draft\.txt; root: Keep durable repo knowledge organized without leaking raw YAML metadata\. @ memory\/README\.md; root sections 0\/2 ready, missing what-belongs-here, buckets/);
  assert.match(summary.promptPreview, /skills: 1 registered, 1 documented \(cron\); root: Keep shared operator procedures discoverable\. @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\); docs: skills\/cron\/SKILL\.md; excerpts: cron: Keep scheduled follow-ups reliable\./);
  assert.doesNotMatch(summary.promptPreview, /root: description:/);
  assert.doesNotMatch(summary.promptPreview, /root: >/);
});

test('buildSummary accepts BOM-prefixed frontmatter descriptions for root foundation docs', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    `\uFEFF${['---', 'description: Keep shared operator procedures discoverable.', '---', '', '# Skills', '', '## What lives here', '- Keep shared operator procedures discoverable.', '', '## Layout', '- skills/<name>/SKILL.md stores the per-skill workflow.'].join('\n')}`,
  );
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    `\uFEFF${['---', 'description: >', '  Keep durable repo knowledge organized', '  without leaking raw YAML metadata.', '---', '', '# Memory', '', 'Buckets live below.'].join('\n')}`,
  );
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    ['---', 'name: cron', 'description: Keep scheduled follow-ups reliable.', '---', '', '# Cron', '', 'Use this skill when a schedule needs setup.'].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.memory.rootExcerpt, 'Keep durable repo knowledge organized without leaking raw YAML metadata.');
  assert.equal(summary.foundation.core.skills.rootExcerpt, 'Keep shared operator procedures discoverable.');
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
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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

test('buildSummary strips admonition labels from structured soul and voice sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep shared operator procedures discoverable.\n\n## Layout\n- skills/<name>/SKILL.md documents reusable workflows.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\nKeep scheduled follow-ups reliable.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), ['# Voice', '', '## Tone', '[!NOTE] Warm and grounded.', '', '## Signature moves', '- [!TIP] Use crisp examples.', '', '## Avoid', '- [!WARNING] Never pad the answer.', '', '## Language hints', '- [!IMPORTANT] Preserve bilingual phrasing when the source material switches languages.', ''].join('\n'));
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), ['# Soul', '', '## Core truths', '- [!NOTE] Stay faithful to the source material.', '', '## Boundaries', '- [!WARNING] Do not bluff certainty.', '', '## Vibe', '- [!TIP] Grounded and direct.', '', '## Continuity', '- [!IMPORTANT] Carry durable lessons forward.', ''].join('\n'));

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Warm and grounded.');
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Stay faithful to the source material.');
  assert.match(summary.promptPreview, /- tone: Warm and grounded\./);
  assert.match(summary.promptPreview, /- constraints: 1 \(Never pad the answer\.\)/);
  assert.match(summary.promptPreview, /- signatures: 1 \(Use crisp examples\.\)/);
  assert.match(summary.promptPreview, /- language hints: 1 \(Preserve bilingual phrasing when the source material switches languages\.\)/);
  assert.match(summary.promptPreview, /- core truths: 1/);
  assert.match(summary.promptPreview, /- boundaries: 1/);
  assert.match(summary.promptPreview, /- vibe: 1/);
  assert.match(summary.promptPreview, /- continuity: 1/);
  assert.doesNotMatch(summary.promptPreview, /\[!NOTE\]/);
  assert.doesNotMatch(summary.promptPreview, /\[!TIP\]/);
  assert.doesNotMatch(summary.promptPreview, /\[!WARNING\]/);
  assert.doesNotMatch(summary.promptPreview, /\[!IMPORTANT\]/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, [
    'cron: Keep scheduled follow-ups reliable across recurring operator loops.',
  ]);
  assert.doesNotMatch(summary.promptPreview, /cron: >2/);
});

test('buildSummary ignores blockquoted admonition labels when deriving skill excerpts and descriptions', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep shared operator procedures discoverable.\n\n## Layout\n- skills/<name>/SKILL.md documents reusable workflows.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    [
      '# Delivery',
      '',
      '> [!NOTE]',
      '> Keep handoffs crisp.',
      '',
      '> ## What this skill is for',
      '> - Route work clearly.',
      '',
      '> ## Suggested workflow',
      '> - Confirm context first.',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.skills.skills, [
    {
      id: 'delivery',
      name: 'delivery',
      description: 'Keep handoffs crisp.',
      status: 'discovered',
      foundationStatus: 'ready',
    },
  ]);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, ['delivery: Keep handoffs crisp.']);
  assert.doesNotMatch(summary.promptPreview, /\[!NOTE\]/);
  assert.doesNotMatch(summary.promptPreview, /> Keep handoffs crisp\./);
  assert.match(summary.promptPreview, /top skills: delivery \[discovered\]: Keep handoffs crisp\./);
});

test('buildSummary keeps blockquoted structured skill docs thin until all required sections are filled', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep shared operator procedures discoverable.\n\n## Layout\n- skills/<name>/SKILL.md documents reusable workflows.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    [
      '# Delivery',
      '',
      '> Keep handoffs crisp.',
      '',
      '> ## What this skill is for',
      '> - Route work clearly.',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-18.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.skills.skills, [
    {
      id: 'delivery',
      name: 'delivery',
      description: null,
      status: 'discovered',
      foundationStatus: 'thin',
    },
  ]);
  assert.equal(summary.foundation.core.skills.documentedCount, 0);
  assert.equal(summary.foundation.core.skills.thinCount, 1);
  assert.deepEqual(summary.foundation.core.skills.thinSample, ['delivery']);
  assert.deepEqual(summary.foundation.core.skills.thinPaths, ['skills/delivery/SKILL.md']);
  assert.deepEqual(summary.foundation.core.skills.thinReadySectionCounts, { delivery: 1 });
  assert.deepEqual(summary.foundation.core.skills.thinTotalSectionCounts, { delivery: 2 });
  assert.equal(summary.foundation.core.maintenance.queuedAreas.length, 1);
  assert.equal(summary.foundation.core.maintenance.queuedAreas[0]?.area, 'skills');
  assert.equal(summary.foundation.core.maintenance.queuedAreas[0]?.status, 'thin');
  assert.equal(summary.foundation.core.maintenance.queuedAreas[0]?.action, 'add missing sections to skills/delivery/SKILL.md: suggested-workflow');
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.paths, ['skills/delivery/SKILL.md']);
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinMissingSections, {
    'skills/delivery/SKILL.md': ['suggested-workflow'],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinReadySections, {
    'skills/delivery/SKILL.md': ['what-this-skill-is-for'],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinReadySectionCounts, {
    'skills/delivery/SKILL.md': 1,
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinTotalSectionCounts, {
    'skills/delivery/SKILL.md': 2,
  });
  assert.match(summary.foundation.core.maintenance.queuedAreas[0]?.command ?? '', /skills\/delivery\/SKILL\.md/);
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(delivery\); root: Keep shared operator procedures discoverable\. @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\); thin docs: delivery sections 1\/2 ready \(what-this-skill-is-for\), missing suggested-workflow @ skills\/delivery\/SKILL\.md/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /next action: add missing sections to skills\/delivery\/SKILL\.md: suggested-workflow/);
});

test('buildSummary flags missing and thin core foundation areas in the prompt preview', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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

  const memoryCommand = buildCoreFoundationCommand({ area: 'memory', status: 'thin', paths: ['memory/daily/$(date +%F).md', 'memory/long-term/notes.md', 'memory/scratch/draft.md'] });
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
    recommendedArea: null,
    recommendedStatus: null,
    recommendedSummary: null,
    recommendedAction: 'scaffold missing or thin core foundation areas — starting with add at least one entry under memory/daily, memory/long-term, and memory/scratch',
    recommendedCommand: scaffoldAllCommand,
    recommendedPaths: ['memory/daily/$(date +%F).md', 'memory/long-term/notes.md', 'memory/scratch/draft.md', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md'],
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
        paths: ['memory/daily/$(date +%F).md', 'memory/long-term/notes.md', 'memory/scratch/draft.md'],
        rootThinReadySections: ['what-belongs-here', 'buckets'],
        rootThinReadySectionCount: 2,
        rootThinTotalSectionCount: 2,
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
  assert.match(summary.promptPreview, /memory \[thin\]: add at least one entry under memory\/daily, memory\/long-term, and memory\/scratch @ memory\/daily\/\$\(date \+%F\)\.md, memory\/long-term\/notes\.md, memory\/scratch\/draft\.md; context root sections 2\/2 ready \(what-belongs-here, buckets\); command mkdir -p 'memory\/daily' 'memory\/long-term' 'memory\/scratch'/);
  assert.match(summary.promptPreview, /skills \[missing\]: create skills\/\<name\>\/SKILL\.md for at least one repo skill @ skills\/starter\/SKILL\.md; command mkdir -p 'skills\/starter' && for file in 'skills\/starter\/SKILL\.md'; do \[ -f \"\$file\" \] \|\| printf %s '# Starter skill/);
  assert.match(summary.promptPreview, /- next repair: scaffold missing or thin core foundation areas — starting with add at least one entry under memory\/daily, memory\/long-term, and memory\/scratch; command \(mkdir -p 'memory\/daily' 'memory\/long-term' 'memory\/scratch'[\s\S]*\) && \(mkdir -p 'skills\/starter'[\s\S]*\) && \(node --input-type=module -e[\s\S]*\) && \(mkdir -p voice && printf %s '# Voice[\s\S]* @ memory\/daily\/\$\(date \+%F\)\.md, memory\/long-term\/notes\.md, memory\/scratch\/draft\.md, skills\/starter\/SKILL\.md, SOUL\.md, voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /- next repair: [^\n]*; context /);
  assert.match(summary.promptPreview, /\+2 more queued: soul \[thin\] \(present, 0 lines\), voice \[missing\] \(missing, 0 lines\)/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 0\/4 ready \(2 thin, 2 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.equal(summary.workLoop.currentPriority.command, scaffoldAllCommand);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['memory/daily/$(date +%F).md', 'memory/long-term/notes.md', 'memory/scratch/draft.md', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md']);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    rootPath: 'memory/README.md',
    rootExcerpt: 'Keep durable notes here.',
    rootMissingSections: [],
    rootReadySections: ['what-belongs-here', 'buckets'],
    rootReadySectionCount: 2,
    rootTotalSectionCount: 2,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
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
  assert.match(summary.promptPreview, /memory \[thin\]: add at least one entry under memory\/long-term and memory\/scratch @ memory\/long-term\/notes\.md, memory\/scratch\/draft\.md; context root sections 2\/2 ready \(what-belongs-here, buckets\); command mkdir -p 'memory\/long-term' 'memory\/scratch' && touch 'memory\/long-term\/notes\.md' 'memory\/scratch\/draft\.md'/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 0, scratch 0; buckets 1\/3 ready \(daily\), missing long-term, scratch; aliases daily canonical via shortTermEntries, shortTermPresent; samples: daily\/2026-04-16\.md; root: Keep durable notes here\. @ memory\/README\.md; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
  assert.match(summary.promptPreview, /next actions: add at least one entry under memory\/long-term and memory\/scratch/);
});

test('buildSummary work loop surfaces a bundled scaffold command when multiple core foundation areas are queued', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul');

  const summary = buildSummary(rootDir);
  const memoryCommand = buildCoreFoundationCommand({ area: 'memory', status: 'thin', paths: ['memory/daily/$(date +%F).md', 'memory/long-term/notes.md', 'memory/scratch/draft.md'] });
  const skillsCommand = buildCoreFoundationCommand({ area: 'skills', status: 'missing', paths: ['skills/starter/SKILL.md'] });
  const soulCommand = buildCoreFoundationCommand({ area: 'soul', status: 'thin', paths: ['SOUL.md'] });
  const voiceCommand = buildCoreFoundationCommand({ area: 'voice', status: 'missing', paths: ['voice/README.md'] });
  const scaffoldAllCommand = [memoryCommand, skillsCommand, soulCommand, voiceCommand]
    .map((command) => `(${command})`)
    .join(' && ');

  assert.equal(summary.workLoop.currentPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority?.nextAction, 'scaffold missing or thin core foundation areas — starting with add at least one entry under memory/daily, memory/long-term, and memory/scratch');
  assert.equal(summary.workLoop.currentPriority?.command, scaffoldAllCommand);
  assert.deepEqual(summary.workLoop.currentPriority?.paths, ['memory/daily/$(date +%F).md', 'memory/long-term/notes.md', 'memory/scratch/draft.md', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md']);

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
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(voiceRootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(voiceRootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(soulRootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(soulRootDir, 'voice', 'README.md'), READY_VOICE_DOC);
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
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.maintenance, {
    areaCount: 4,
    readyAreaCount: 3,
    missingAreaCount: 0,
    thinAreaCount: 1,
    recommendedArea: 'memory',
    recommendedStatus: 'thin',
    recommendedSummary: 'README no, daily 1, long-term 1, scratch 1',
    recommendedAction: 'create memory/README.md',
    recommendedCommand: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n' > 'memory/README.md'",
    recommendedPaths: ['memory/README.md'],
    helperCommands: {
      scaffoldAll: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n' > 'memory/README.md'",
      scaffoldMissing: null,
      scaffoldThin: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n' > 'memory/README.md'",
      memory: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n' > 'memory/README.md'",
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
        command: "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n' > 'memory/README.md'",
      },
    ],
  });
  assert.match(summary.promptPreview, /queue: 3 ready, 1 thin, 0 missing/);
  assert.match(summary.promptPreview, /memory \[thin\]: create memory\/README\.md @ memory\/README\.md; command mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context\.\n\n## Buckets\n- daily\/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term\/: durable facts and conventions\n- scratch\/: in-flight ideas to refine or promote\n- legacy memory\/short-term\/ files are folded into daily\/ during repo loading for compatibility with older repos\n' > 'memory\/README\.md'/);
});

test('buildSummary surfaces memory root section context on thin memory queue items', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Telegram skill\n\n## What this skill is for\n- Deliver concise thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread context first.');
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);
  const memoryCommand = buildCoreFoundationCommand({
    area: 'memory',
    status: 'thin',
    paths: ['memory/README.md'],
    thinPaths: ['memory/README.md'],
  });

  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'memory',
      status: 'thin',
      summary: 'README yes, daily 1, long-term 1, scratch 1, root 1/2 sections ready (what-belongs-here), missing buckets',
      action: 'add missing sections to memory/README.md: buckets',
      paths: ['memory/README.md'],
      thinPaths: ['memory/README.md'],
      rootThinMissingSections: ['buckets'],
      rootThinReadySections: ['what-belongs-here'],
      rootThinReadySectionCount: 1,
      rootThinTotalSectionCount: 2,
      command: memoryCommand,
    },
  ]);
  assert.match(summary.promptPreview, /memory \[thin\]: add missing sections to memory\/README\.md: buckets @ memory\/README\.md; context root sections 1\/2 ready \(what-belongs-here\), missing buckets; command /);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; buckets 3\/3 ready \(daily, long-term, scratch\); aliases daily canonical via shortTermEntries, shortTermPresent; samples: daily\/2026-04-16\.md, long-term\/operator\.json, scratch\/draft\.txt; root: Keep durable notes here\. @ memory\/README\.md; root sections 1\/2 ready \(what-belongs-here\), missing buckets/);
});

test('buildSummary surfaces soul and voice section context on thin document queue items', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Deliver concise handoffs.\n\n## Suggested workflow\n- Run the smallest verified loop first.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Warm and grounded.\n');

  const summary = buildSummary(rootDir);
  const soulCommand = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });
  const voiceCommand = buildCoreFoundationCommand({
    area: 'voice',
    status: 'thin',
    paths: ['voice/README.md'],
  });

  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'soul',
      status: 'thin',
      summary: 'present, 1 lines, sections 1/4 ready (core-truths), missing boundaries, vibe, continuity',
      action: 'add missing sections to SOUL.md: boundaries, vibe, continuity',
      paths: ['SOUL.md'],
      rootThinMissingSections: ['boundaries', 'vibe', 'continuity'],
      rootThinReadySections: ['core-truths'],
      rootThinReadySectionCount: 1,
      rootThinTotalSectionCount: 4,
      command: soulCommand,
    },
    {
      area: 'voice',
      status: 'thin',
      summary: 'present, 1 lines, sections 1/4 ready (tone), missing signature-moves, avoid, language-hints',
      action: 'add missing sections to voice/README.md: signature-moves, avoid, language-hints',
      paths: ['voice/README.md'],
      rootThinMissingSections: ['signature-moves', 'avoid', 'language-hints'],
      rootThinReadySections: ['tone'],
      rootThinReadySectionCount: 1,
      rootThinTotalSectionCount: 4,
      command: voiceCommand,
    },
  ]);
  assert.match(summary.promptPreview, /soul \[thin\]: add missing sections to SOUL\.md: boundaries, vibe, continuity @ SOUL\.md; context sections 1\/4 ready \(core-truths\), missing boundaries, vibe, continuity; command /);
  assert.match(summary.promptPreview, /voice \[thin\]: add missing sections to voice\/README\.md: signature-moves, avoid, language-hints @ voice\/README\.md; context sections 1\/4 ready \(tone\), missing signature-moves, avoid, language-hints; command /);
});

test('buildSummary surfaces root heading alias context on thin memory and skills queue items', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What lives here\n- Keep durable notes here.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What belongs here\n- Keep reusable operator procedures here.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Deliver concise handoffs.\n\n## Suggested workflow\n- Run the smallest verified loop first.');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'memory',
      status: 'thin',
      summary: 'README yes, daily 1, long-term 1, scratch 1, root 1/2 sections ready (what-belongs-here), missing buckets',
      action: 'add missing sections to memory/README.md: buckets',
      paths: ['memory/README.md'],
      thinPaths: ['memory/README.md'],
      rootThinMissingSections: ['buckets'],
      rootThinReadySections: ['what-belongs-here'],
      rootThinReadySectionCount: 1,
      rootThinTotalSectionCount: 2,
      rootHeadingAliases: ['what-lives-here->what-belongs-here'],
      command: buildCoreFoundationCommand({
        area: 'memory',
        status: 'thin',
        paths: ['memory/README.md'],
        thinPaths: ['memory/README.md'],
      }),
    },
    {
      area: 'skills',
      status: 'thin',
      summary: '1 registered, 1 documented, root 1/2 sections ready (what-lives-here), missing layout',
      action: 'add missing sections to skills/README.md: layout',
      paths: ['skills/README.md'],
      thinPaths: ['skills/README.md'],
      rootThinMissingSections: ['layout'],
      rootThinReadySections: ['what-lives-here'],
      rootThinReadySectionCount: 1,
      rootThinTotalSectionCount: 2,
      rootHeadingAliases: ['what-belongs-here->what-lives-here'],
      command: buildCoreFoundationCommand({
        area: 'skills',
        status: 'thin',
        paths: ['skills/README.md'],
        thinPaths: ['skills/README.md'],
      }),
    },
  ]);
  assert.match(summary.promptPreview, /memory \[thin\]: add missing sections to memory\/README\.md: buckets @ memory\/README\.md; context root sections 1\/2 ready \(what-belongs-here\), missing buckets \| root aliases what-lives-here->what-belongs-here; command /);
  assert.match(summary.promptPreview, /skills \[thin\]: add missing sections to skills\/README\.md: layout @ skills\/README\.md; context root sections 1\/2 ready \(what-lives-here\), missing layout \| root aliases what-belongs-here->what-lives-here; command /);
});

test('buildSummary surfaces root heading alias context on thin soul and voice queue items', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Keep reusable operator procedures here.\n\n## Layout\n- skills/<name>/SKILL.md stores the per-skill workflow.');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Deliver concise handoffs.\n\n## Suggested workflow\n- Run the smallest verified loop first.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Stay faithful.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Voice should capture\n- Warm and grounded.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'soul',
      status: 'thin',
      summary: 'present, 1 lines, sections 1/4 ready (core-truths), missing boundaries, vibe, continuity',
      action: 'add missing sections to SOUL.md: boundaries, vibe, continuity',
      paths: ['SOUL.md'],
      rootThinMissingSections: ['boundaries', 'vibe', 'continuity'],
      rootThinReadySections: ['core-truths'],
      rootThinReadySectionCount: 1,
      rootThinTotalSectionCount: 4,
      rootHeadingAliases: ['core-values->core-truths'],
      command: buildCoreFoundationCommand({
        area: 'soul',
        status: 'thin',
        paths: ['SOUL.md'],
      }),
    },
    {
      area: 'voice',
      status: 'thin',
      summary: 'present, 1 lines, sections 2/4 ready (tone, signature-moves), missing avoid, language-hints',
      action: 'add missing sections to voice/README.md: avoid, language-hints',
      paths: ['voice/README.md'],
      rootThinMissingSections: ['avoid', 'language-hints'],
      rootThinReadySections: ['tone', 'signature-moves'],
      rootThinReadySectionCount: 2,
      rootThinTotalSectionCount: 4,
      rootHeadingAliases: ['voice-should-capture->signature-moves'],
      command: buildCoreFoundationCommand({
        area: 'voice',
        status: 'thin',
        paths: ['voice/README.md'],
      }),
    },
  ]);
  assert.match(summary.promptPreview, /soul \[thin\]: add missing sections to SOUL\.md: boundaries, vibe, continuity @ SOUL\.md; context sections 1\/4 ready \(core-truths\), missing boundaries, vibe, continuity \| root aliases core-values->core-truths; command /);
  assert.match(summary.promptPreview, /voice \[thin\]: add missing sections to voice\/README\.md: avoid, language-hints @ voice\/README\.md; context sections 2\/4 ready \(tone, signature-moves\), missing avoid, language-hints \| root aliases voice-should-capture->signature-moves; command /);
});

test('buildSummary compact queued-area remainder keeps root section context for hidden thin soul and voice docs', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Deliver concise handoffs.\n\n## Suggested workflow\n- Run the smallest verified loop first.');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Warm and grounded.\n');

  const summary = buildSummary(rootDir);

  assert.match(summary.promptPreview, /memory \[thin\]: add at least one entry under memory\/daily, memory\/long-term, and memory\/scratch @ memory\/daily\/\$\(date \+%F\)\.md, memory\/long-term\/notes\.md, memory\/scratch\/draft\.md; context root sections 2\/2 ready \(what-belongs-here, buckets\); command /);
  assert.match(summary.promptPreview, /\+2 more queued: soul \[thin\] \(present, 1 lines, sections 1\/4 ready \(core-truths\), missing boundaries, vibe, continuity; context sections 1\/4 ready \(core-truths\), missing boundaries, vibe, continuity\), voice \[thin\] \(present, 1 lines, sections 1\/4 ready \(tone\), missing signature-moves, avoid, language-hints; context sections 1\/4 ready \(tone\), missing signature-moves, avoid, language-hints\)/);
});

test('buildSummary work loop scaffolds a starter repo skill when the skills area is missing entirely', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
    recommendedStatus: 'thin',
    recommendedSummary: '2 registered, 0 documented, root missing @ skills/README.md',
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
    recommendedStatus: 'thin',
    recommendedSummary: '2 registered, 1 documented, root missing @ skills/README.md',
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
    thinReadySectionCounts: {
      delivery: 0,
    },
    thinTotalSectionCounts: {
      delivery: 2,
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
    recommendedStatus: 'thin',
    recommendedSummary: '1 registered, 0 documented, root missing @ skills/README.md',
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
        thinReadySectionCounts: {
          'skills/delivery/SKILL.md': 0,
        },
        thinTotalSectionCounts: {
          'skills/delivery/SKILL.md': 2,
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
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(delivery\); root missing @ skills\/README\.md; thin docs: delivery sections 0\/2 ready, missing what-this-skill-is-for, suggested-workflow @ skills\/delivery\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(delivery\); root missing @ skills\/README\.md; thin docs: delivery sections 0\/2 ready, missing what-this-skill-is-for, suggested-workflow @ skills\/delivery\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
    thinReadySectionCounts: {
      slack: 0,
    },
    thinTotalSectionCounts: {
      slack: 2,
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
    recommendedStatus: 'thin',
    recommendedSummary: '2 registered, 1 documented, root missing @ skills/README.md',
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
        thinReadySectionCounts: {
          'skills/slack/SKILL.md': 0,
        },
        thinTotalSectionCounts: {
          'skills/slack/SKILL.md': 2,
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
  assert.match(summary.promptPreview, /skills: 2 registered, 1 documented \(delivery, slack\); root missing @ skills\/README\.md; docs: skills\/delivery\/SKILL\.md; excerpts: delivery: Deliver concise handoffs\.\; thin docs: slack sections 0\/2 ready, missing what-this-skill-is-for, suggested-workflow @ skills\/slack\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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

test('buildSummary keeps nested thin skill labels compact in queued prompt context', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'channels', 'slack'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'channels', 'slack', 'SKILL.md'),
    '# Slack\n\n## What this skill is for\n- Keep Slack thread replies grounded in the source discussion.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinMissingSections, {
    'skills/channels/slack/SKILL.md': ['suggested-workflow'],
  });
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas[0]?.thinReadySections, {
    'skills/channels/slack/SKILL.md': ['what-this-skill-is-for'],
  });
  assert.match(summary.promptPreview, /skills \[thin\]: create skills\/README\.md \| add missing sections to skills\/channels\/slack\/SKILL\.md: suggested-workflow @ skills\/README\.md, skills\/channels\/slack\/SKILL\.md; context thin docs channels\/slack sections 1\/2 ready \(what-this-skill-is-for\), missing suggested-workflow; command /);
  assert.match(summary.promptPreview, /skills: 1 registered, 0 documented \(channels\/slack\); root missing @ skills\/README\.md; thin docs: channels\/slack sections 1\/2 ready \(what-this-skill-is-for\), missing suggested-workflow @ skills\/channels\/slack\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
    rootReadySectionCount: 1,
    rootTotalSectionCount: 2,
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
    recommendedStatus: 'thin',
    recommendedSummary: '1 registered, 1 documented, root 1/2 sections ready (what-lives-here), missing layout',
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
        rootThinReadySectionCount: 1,
        rootThinTotalSectionCount: 2,
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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

test('buildSummary treats memory headings with closing hashes as structured sections', () => {
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n### What belongs here ###\n- Keep durable notes here.\n\n### Buckets ###\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operational takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory.rootReadySections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md, aliases core-values->core-truths, decision-rules->continuity; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1/);
});

test('buildSummary treats memory headings with setext markdown as structured sections', () => {
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nWhat belongs here\n-----------------\n- Keep durable notes here.\n\nBuckets\n-------\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operational takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory.rootReadySections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md, aliases core-values->core-truths, decision-rules->continuity; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /soul: present, \d+ lines/);
  assert.doesNotMatch(summary.promptPreview, /voice: present, \d+ lines/);
});

test('buildSummary treats target-specific current default voice headings as structured foundation guidance', () => {
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\nKeep replies direct.\n\n## Signature moves\n- Lead with the operating takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Current default for Harry Han\n- concise by default\n- preserve 中文 and English switching when the source does\n',
  );
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.voice.structured, true);
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /voice: present, \d+ lines, Keep replies direct\./);
});

test('buildSummary exposes canonical heading alias metadata when legacy soul and voice headings still back the root foundation docs', () => {
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Voice should capture\n- Lead with the operating takeaway.\n\n## Voice should not capture\n- Avoid vague filler.\n\n## Current default for Harry Han\n- concise by default\n- preserve 中文 and English switching when the source does\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n',
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.soul.headingAliases, [
    'core-values->core-truths',
    'decision-rules->continuity',
  ]);
  assert.deepEqual(summary.foundation.core.voice.headingAliases, [
    'voice-should-capture->signature-moves',
    'voice-should-not-capture->avoid',
    'current-default->language-hints',
  ]);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.match(summary.promptPreview, /ready details: .*soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md, aliases core-values->core-truths, decision-rules->continuity; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md, aliases voice-should-capture->signature-moves, voice-should-not-capture->avoid, current-default->language-hints/);
});

test('buildSummary surfaces legacy memory and skills root heading aliases while keeping the core foundation ready', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What lives here\n- Keep durable notes here.\n\n## Layout\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What belongs here\n- Shared repo guidance for reusable procedures.\n\n## Buckets\n- Each skill lives under skills/<name>/SKILL.md.\n- README.md keeps shared repo conventions visible.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operating takeaway.\n\n## Avoid\n- Avoid vague filler.\n\n## Language hints\n- Prefer plain English unless source material clearly code-switches.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Continuity\n- Prefer verified repo state over assumptions.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory.rootReadySections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, []);
  assert.deepEqual(summary.foundation.core.memory.headingAliases, [
    'what-lives-here->what-belongs-here',
    'layout->buckets',
  ]);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.deepEqual(summary.foundation.core.skills.headingAliases, [
    'what-belongs-here->what-lives-here',
    'buckets->layout',
  ]);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.equal(summary.foundation.core.maintenance.recommendedAction, null);
  assert.match(summary.promptPreview, /Memory store:\n- daily: 1\n- long-term: 1\n- scratch: 1\n- total: 3\n- buckets: 3\/3 ready \(daily, long-term, scratch\)\n- aliases: daily canonical via shortTermEntries, shortTermPresent\n- root: Keep durable notes here\. @ memory\/README\.md\n- root sections: 2\/2 ready \(what-belongs-here, buckets\)\n- root heading aliases: what-lives-here->what-belongs-here, layout->buckets/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- root: Shared repo guidance for reusable procedures\. @ skills\/README\.md\n- root sections: 2\/2 ready \(what-lives-here, layout\)\n- root heading aliases: what-belongs-here->what-lives-here, buckets->layout\n- top skills: delivery \[discovered\]: Deliver concise handoffs\./);
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md, aliases what-lives-here->what-belongs-here, layout->buckets; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md, aliases what-belongs-here->what-lives-here, buckets->layout; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
});

test('buildSummary surfaces legacy soul and voice heading aliases in compact preview blocks', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo guidance for reusable procedures.\n\n## Layout\n- Each skill lives under skills/<name>/SKILL.md.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nDeliver concise handoffs.');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Voice should capture\n- Keep replies direct.\n\n## Signature moves\n- Lead with the operating takeaway.\n\n## Voice should not capture\n- Avoid vague filler.\n\n## Current default for Harry\n- Prefer plain English unless source material clearly code-switches.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core values\n- Preserve durable operator intent.\n\n## Boundaries\n- Do not invent source material.\n\n## Vibe\n- Stay grounded and practical.\n\n## Decision rules\n- Prefer verified repo state over assumptions.\n',
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.deepEqual(summary.foundation.core.soul.headingAliases, [
    'core-values->core-truths',
    'decision-rules->continuity',
  ]);
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.headingAliases, [
    'voice-should-capture->signature-moves',
    'voice-should-not-capture->avoid',
    'current-default->language-hints',
  ]);
  assert.match(summary.promptPreview, /Soul profile:\n- excerpt: Preserve durable operator intent\.\n- core truths: 1\n- boundaries: 1\n- vibe: 1\n- continuity: 1\n- root: Preserve durable operator intent\. @ SOUL\.md\n- sections: 4\/4 ready \(core-truths, boundaries, vibe, continuity\)\n- root heading aliases: core-values->core-truths, decision-rules->continuity/);
  assert.match(summary.promptPreview, /Voice profile:\n- tone: Keep replies direct\.\n- style: documented\n- constraints: 1 \(Avoid vague filler\.\)\n- signatures: 2 \(Keep replies direct\.\; Lead with the operating takeaway\.\)\n- language hints: 1 \(Prefer plain English unless source material clearly code-switches\.\)\n- root: Keep replies direct\. @ voice\/README\.md\n- sections: 4\/4 ready \(tone, signature-moves, avoid, language-hints\)\n- root heading aliases: voice-should-capture->signature-moves, voice-should-not-capture->avoid, current-default->language-hints/);
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md, aliases core-values->core-truths, decision-rules->continuity; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md, aliases voice-should-capture->signature-moves, voice-should-not-capture->avoid, current-default->language-hints/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, []);
  assert.equal(summary.foundation.core.skills.rootReadySectionCount, 0);
  assert.equal(summary.foundation.core.skills.rootTotalSectionCount, 2);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  assert.deepEqual(summary.foundation.core.voice.readySections, []);
  assert.deepEqual(summary.foundation.core.voice.missingSections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.equal(summary.foundation.core.soul.structured, false);
  assert.equal(summary.foundation.core.soul.lineCount, 1);
  assert.equal(summary.foundation.core.soul.excerpt, 'Build a faithful operator core.');
  assert.deepEqual(summary.foundation.core.soul.readySections, []);
  assert.deepEqual(summary.foundation.core.soul.missingSections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 0);
  assert.equal(summary.foundation.core.skills.thinCount, 1);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, []);
  assert.deepEqual(summary.foundation.core.skills.thinMissingSections, {
    cron: ['what-this-skill-is-for', 'suggested-workflow'],
  });
  assert.match(summary.promptPreview, /thin docs: cron sections 0\/2 ready, missing what-this-skill-is-for, suggested-workflow @ skills\/cron\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.skills.documentedCount, 0);
  assert.equal(summary.foundation.core.skills.thinCount, 1);
  assert.deepEqual(summary.foundation.core.skills.sampleExcerpts, []);
  assert.deepEqual(summary.foundation.core.skills.thinMissingSections, {
    cron: ['what-this-skill-is-for', 'suggested-workflow'],
  });
  assert.match(summary.promptPreview, /thin docs: cron sections 0\/2 ready, missing what-this-skill-is-for, suggested-workflow @ skills\/cron\/SKILL\.md/);
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n## What belongs here\n- Keep durable notes here.\n\n## Buckets\n- daily/: short-lived run notes and the canonical checked-in short-term bucket\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-16.md'), '# Daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'operator.json'), '{"fact":true}');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.txt'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), READY_VOICE_DOC);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), READY_SOUL_DOC);
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
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/beta-partial/imports/images',
    'profiles/beta-partial/imports/materials.template.json',
    'profiles/beta-partial/imports/sample.txt',
    'profiles/alpha-missing/imports',
    'profiles/alpha-missing/imports/images',
    'profiles/alpha-missing/imports/README.md',
    'profiles/alpha-missing/imports/materials.template.json',
    'profiles/alpha-missing/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /command: \(node src\/index\.js update intake --person 'beta-partial' --display-name 'Beta Partial' --summary 'Needs the intake scaffold completed\.'\) && \(node src\/index\.js update intake --person 'alpha-missing' --display-name 'Alpha Missing' --summary 'Needs a fresh intake scaffold\.'\)/);
  assert.match(summary.promptPreview, /paths: profiles\/beta-partial\/imports\/images, profiles\/beta-partial\/imports\/materials\.template\.json, profiles\/beta-partial\/imports\/sample\.txt, profiles\/alpha-missing\/imports, profiles\/alpha-missing\/imports\/images, profiles\/alpha-missing\/imports\/README\.md, profiles\/alpha-missing\/imports\/materials\.template\.json, profiles\/alpha-missing\/imports\/sample\.txt/);
});

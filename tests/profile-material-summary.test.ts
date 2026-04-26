import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemLoader, hasValidFoundationMarkdownDraft } from '../src/core/fs-loader.js';
import { buildSummary, runUpdateCommand } from '../src/index.js';
import { buildIngestionSummary as buildJsIngestionSummary } from '../src/core/ingestion-summary.js';
import { buildIngestionSummary as buildTsIngestionSummary } from '../src/core/ingestion-summary.ts';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import * as promptAssemblerJsShim from '../src/core/prompt-assembler.js';
import { PromptAssembler, buildProfileSnapshotSummaries } from '../src/core/prompt-assembler.ts';
import * as promptAssemblerTsModule from '../src/core/prompt-assembler.ts';
import { buildFoundationRollup } from '../src/core/foundation-rollup.ts';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-profile-summary-'));
}

test('JS prompt assembler shim stays aligned with the TypeScript profile snapshot helpers', () => {
  assert.equal(typeof promptAssemblerJsShim.PromptAssembler, 'function');
  assert.equal(typeof promptAssemblerTsModule.PromptAssembler, 'function');
  assert.equal(typeof promptAssemblerJsShim.buildProfileSnapshotSummaries, 'function');
  assert.equal(typeof promptAssemblerTsModule.buildProfileSnapshotSummaries, 'function');

  const profiles = [{
    id: 'harry-han',
    materialCount: 2,
    materialTypes: { text: 1, message: 1 },
    latestMaterialAt: '2026-04-16T15:00:00.000Z',
    latestMaterialId: '2026-04-16T15-00-00-000Z-message',
    foundationReadiness: {
      memory: { candidateCount: 2, latestTypes: ['message', 'text'], sampleSummaries: ['Ship the first slice.'] },
      voice: { candidateCount: 1, sampleTypes: ['message'], sampleExcerpts: ['Ship the first slice.'] },
      soul: { candidateCount: 1, sampleTypes: ['text'], sampleExcerpts: ['Protect the operator loop.'] },
      skills: { candidateCount: 1, sampleTypes: ['talk'], sampleExcerpts: ['execution heuristic'] },
    },
    foundationDraftStatus: {
      generatedAt: '2026-04-16T15:00:01.000Z',
      complete: false,
      missingDrafts: ['skills'],
      needsRefresh: true,
      refreshReasons: ['new-material'],
    },
    foundationDraftSummaries: {
      memory: {
        generated: true,
        path: 'profiles/harry-han/memory/long-term/foundation.json',
        generatedAt: '2026-04-16T15:00:01.000Z',
        latestMaterialAt: '2026-04-16T15:00:00.000Z',
        latestMaterialId: '2026-04-16T15-00-00-000Z-message',
        sourceCount: 2,
        materialTypes: { text: 1, message: 1 },
        entryCount: 2,
        latestSummaries: ['Ship the first slice.'],
      },
      voice: {
        generated: true,
        path: 'profiles/harry-han/voice/README.md',
        highlights: ['- [message] Ship the first slice.'],
        readySectionCount: 4,
        totalSectionCount: 4,
        readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
        missingSections: [],
      },
      soul: {
        generated: true,
        path: 'profiles/harry-han/soul/README.md',
        highlights: ['- [text] Protect the operator loop.'],
        readySectionCount: 4,
        totalSectionCount: 4,
        readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
        missingSections: [],
      },
      skills: {
        generated: false,
        path: 'profiles/harry-han/skills/README.md',
        highlights: [],
        readySectionCount: 2,
        totalSectionCount: 3,
        readySections: ['candidate-skills', 'evidence'],
        missingSections: ['gaps-to-validate'],
      },
    },
  }];

  assert.deepEqual(
    promptAssemblerJsShim.buildProfileSnapshotSummaries(profiles),
    promptAssemblerTsModule.buildProfileSnapshotSummaries(profiles),
  );

  const exportedKeys = execFileSync(
    'node',
    ['--input-type=module', '-e', "import('./src/core/prompt-assembler.js').then((module) => console.log(Object.keys(module).sort().join(',')))"],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  ).trim();

  assert.equal(exportedKeys, 'PromptAssembler,buildProfileSnapshotSummaries');
});

test('buildProfileSnapshotSummaries trims and dedupes snapshot string metadata before exposing it', () => {
  const [snapshot] = buildProfileSnapshotSummaries([{
    id: 'jane-doe',
    materialCount: 1,
    materialTypes: { text: 1 },
    latestMaterialAt: '2026-04-16T15:00:00.000Z',
    latestMaterialId: ' 2026-04-16T15-00-00-000Z-text ',
    latestMaterialSourcePath: ' .\\profiles\\jane-doe//imports\\sample.txt ',
    profile: {
      displayName: 'Jane Doe',
      summary: '  Tight loops beat big plans.  ',
    },
    foundationReadiness: {
      memory: {
        candidateCount: 1,
        latestTypes: [' text ', 'text', ''],
        sampleSummaries: ['  Tight loops beat big plans.  ', 'Tight loops beat big plans.', ''],
      },
      voice: {
        candidateCount: 1,
        sampleTypes: [' message ', 'message', ''],
        sampleExcerpts: ['  Keep it tight.  ', 'Keep it tight.', ''],
      },
      soul: {
        candidateCount: 1,
        sampleTypes: [' talk ', 'talk', ''],
        sampleExcerpts: ['  Protect the operator loop.  ', 'Protect the operator loop.', ''],
      },
      skills: {
        candidateCount: 1,
        sampleTypes: [' talk ', 'talk', ''],
        sampleExcerpts: ['  feedback-loop heuristic  ', 'feedback-loop heuristic', ''],
      },
    },
    foundationDraftStatus: {
      generatedAt: '2026-04-16T15:00:01.000Z',
      complete: false,
      missingDrafts: [' memory ', 'voice', 'memory', ''],
      needsRefresh: true,
      refreshReasons: ['  new-material  ', 'new-material', ''],
    },
    foundationDraftSummaries: {
      memory: {
        generated: true,
        path: ' .\\profiles\\jane-doe//memory\\long-term\\foundation.json ',
        latestSummaries: ['  Tight loops beat big plans.  ', 'Tight loops beat big plans.', ''],
      },
      voice: {
        generated: true,
        path: ' .\\profiles\\jane-doe//voice\\README.md ',
        highlights: [' - [message] Keep it tight. ', '[message] Keep it tight.', ''],
        readySectionCount: 1,
        totalSectionCount: 4,
        readySections: [' tone ', 'tone', ''],
        missingSections: [' avoid ', 'avoid', ''],
      },
      soul: {
        generated: true,
        path: ' .\\profiles\\jane-doe//soul\\README.md ',
        highlights: [' - [talk] Protect the operator loop. ', '[talk] Protect the operator loop.', ''],
        readySectionCount: 1,
        totalSectionCount: 4,
        readySections: [' core-truths ', 'core-truths', ''],
        missingSections: [' boundaries ', 'boundaries', ''],
      },
      skills: {
        generated: true,
        path: ' .\\profiles\\jane-doe//skills\\README.md ',
        highlights: ['  feedback-loop heuristic  ', 'feedback-loop heuristic', ''],
        readySectionCount: 1,
        totalSectionCount: 3,
        readySections: [' candidate-skills ', 'candidate-skills', ''],
        missingSections: [' evidence ', 'evidence', ''],
      },
    },
  }]);

  assert.equal(snapshot.profileSummary, 'Tight loops beat big plans.');
  assert.deepEqual(snapshot.draftStatus.missingDrafts, ['memory', 'voice']);
  assert.deepEqual(snapshot.draftStatus.refreshReasons, ['new-material']);
  assert.deepEqual(snapshot.readiness.memory.latestTypes, ['text']);
  assert.deepEqual(snapshot.readiness.memory.sampleSummaries, ['Tight loops beat big plans.']);
  assert.deepEqual(snapshot.readiness.voice.sampleTypes, ['message']);
  assert.deepEqual(snapshot.readiness.voice.sampleExcerpts, ['Keep it tight.']);
  assert.equal(snapshot.latestMaterialId, '2026-04-16T15-00-00-000Z-text');
  assert.equal(snapshot.latestMaterialSourcePath, 'profiles/jane-doe/imports/sample.txt');
  assert.equal(snapshot.draftFiles.memory, 'profiles/jane-doe/memory/long-term/foundation.json');
  assert.equal(snapshot.draftFiles.voice, 'profiles/jane-doe/voice/README.md');
  assert.deepEqual(snapshot.draftSections.voice?.readySections, ['tone']);
  assert.deepEqual(snapshot.draftSections.voice?.missingSections, ['avoid']);
  assert.deepEqual(snapshot.draftSections.soul?.readySections, ['core-truths']);
  assert.deepEqual(snapshot.draftSections.skills?.missingSections, ['evidence']);
  assert.deepEqual(snapshot.highlights.memory, ['Tight loops beat big plans.']);
  assert.deepEqual(snapshot.highlights.voice, ['[message] Keep it tight.']);
  assert.deepEqual(snapshot.highlights.soul, ['[talk] Protect the operator loop.']);
  assert.deepEqual(snapshot.highlights.skills, ['feedback-loop heuristic']);
  assert.match(snapshot.snapshot, /latest material: 2026-04-16T15:00:00.000Z \(2026-04-16T15-00-00-000Z-text\) @ profiles\/jane-doe\/imports\/sample\.txt/);
  assert.match(snapshot.snapshot, /drafts: stale, missing memory\/voice, generated 2026-04-16T15:00:01.000Z, reasons new-material/);
  assert.match(snapshot.snapshot, /draft gaps: memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills 1\/3 ready \(candidate-skills\), missing evidence \| soul 1\/4 ready \(core-truths\), missing boundaries \| voice 1\/4 ready \(tone\), missing avoid/);
  assert.doesNotMatch(snapshot.snapshot, /\s\|\s\|/);
  assert.doesNotMatch(snapshot.snapshot, /memory\/voice\/memory/);
});

test('buildProfileSnapshotSummaries keeps latest material source paths visible even without timestamp metadata', () => {
  const [snapshot] = buildProfileSnapshotSummaries([{
    id: 'jane-doe',
    materialCount: 1,
    materialTypes: { screenshot: 1 },
    latestMaterialSourcePath: 'profiles/jane-doe/imports/images/chat.png',
    foundationDraftStatus: {
      complete: false,
      needsRefresh: true,
      missingDrafts: ['memory'],
    },
    foundationReadiness: {
      memory: {
        candidateCount: 1,
        sampleSummaries: ['Capture the exact UI state before narrating it.'],
      },
    },
  }]);

  assert.equal(snapshot.latestMaterialAt, null);
  assert.equal(snapshot.latestMaterialId, null);
  assert.equal(snapshot.latestMaterialSourcePath, 'profiles/jane-doe/imports/images/chat.png');
  assert.match(snapshot.snapshot, /latest material: unknown timestamp @ profiles\/jane-doe\/imports\/images\/chat\.png/);
});

test('buildProfileSnapshotSummaries merges latest and sample memory types in candidate signal lines', () => {
  const [snapshot] = buildProfileSnapshotSummaries([{
    id: 'jane-doe',
    materialCount: 3,
    materialTypes: { text: 1, message: 1, screenshot: 1 },
    foundationReadiness: {
      memory: {
        candidateCount: 3,
        latestTypes: ['text'],
        sampleTypes: ['message', 'screenshot', 'text'],
        sampleSummaries: ['Keep it inspectable.'],
      },
      voice: {
        candidateCount: 1,
        sampleTypes: ['message'],
        sampleExcerpts: ['Keep it tight.'],
      },
      soul: {
        candidateCount: 0,
      },
      skills: {
        candidateCount: 0,
      },
    },
    foundationDraftStatus: {
      complete: false,
      missingDrafts: ['memory'],
      needsRefresh: true,
    },
  }]);

  assert.deepEqual(snapshot.readiness.memory.latestTypes, ['text']);
  assert.deepEqual(snapshot.readiness.memory.sampleTypes, ['message', 'screenshot', 'text']);
  assert.match(snapshot.snapshot, /memory candidates: 3 \(message, screenshot, text\) \| voice: 1 \(message\) \| soul: 0 \| skills: 0/);
});

test('buildProfileSnapshotSummaries falls back to readiness memory highlights when generated summaries normalize to empty strings', () => {
  const [snapshot] = buildProfileSnapshotSummaries([{
    id: 'jane-doe',
    materialCount: 1,
    materialTypes: { text: 1 },
    foundationReadiness: {
      memory: {
        candidateCount: 1,
        sampleSummaries: ['  Tight loops beat big plans.  ', ''],
      },
    },
    foundationDraftStatus: {
      complete: false,
      missingDrafts: ['memory'],
      needsRefresh: true,
    },
    foundationDraftSummaries: {
      memory: {
        generated: true,
        latestSummaries: ['   ', ''],
      },
    },
  }]);

  assert.deepEqual(snapshot.highlights.memory, ['Tight loops beat big plans.']);
  assert.match(snapshot.snapshot, /memory highlights: Tight loops beat big plans\./);
  assert.match(snapshot.snapshot, /draft gaps: memory missing, 1 candidate \(Tight loops beat big plans\.\)/);
});

test('buildFoundationRollup merges latest and sample memory types in candidate signal summaries', () => {
  const rollup = buildFoundationRollup([{
    id: 'jane-doe',
    materialCount: 3,
    profile: {
      displayName: 'Jane Doe',
    },
    latestMaterialAt: '2026-04-16T15:00:00.000Z',
    latestMaterialId: '2026-04-16T15-00-00-000Z-text',
    foundationReadiness: {
      memory: {
        candidateCount: 3,
        latestTypes: ['text'],
        sampleTypes: ['message', 'screenshot', 'text'],
        sampleSummaries: ['Keep it inspectable.'],
      },
      voice: {
        candidateCount: 1,
        sampleTypes: ['message'],
        sampleExcerpts: ['Keep it tight.'],
      },
      soul: {
        candidateCount: 0,
      },
      skills: {
        candidateCount: 0,
      },
    },
    foundationDraftStatus: {
      complete: false,
      needsRefresh: true,
      missingDrafts: ['memory'],
      refreshReasons: ['new-material'],
    },
  }]);

  assert.equal(rollup.maintenance.recommendedCandidateSignalSummary, 'memory 3 (message, screenshot, text) | voice 1 (message) | soul 0 | skills 0');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.candidateSignalSummary, 'memory 3 (message, screenshot, text) | voice 1 (message) | soul 0 | skills 0');
});

test('buildProfileSnapshotSummaries keeps fully missing structured drafts visible in draft gap summaries', () => {
  const [snapshot] = buildProfileSnapshotSummaries([{
    id: 'jane-doe',
    materialCount: 1,
    materialTypes: { talk: 1 },
    foundationReadiness: {
      memory: {
        candidateCount: 1,
        sampleSummaries: ['Tight loops beat big plans.'],
      },
      skills: {
        candidateCount: 1,
        sampleExcerpts: ['execution heuristic'],
      },
      soul: {
        candidateCount: 1,
        sampleExcerpts: ['Protect the operator loop.'],
      },
      voice: {
        candidateCount: 1,
        sampleExcerpts: ['Keep it tight.'],
      },
    },
    foundationDraftStatus: {
      complete: false,
      missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      needsRefresh: true,
    },
    foundationDraftSummaries: {
      skills: {
        generated: false,
        highlights: [],
      },
      soul: {
        generated: false,
        highlights: [],
      },
      voice: {
        generated: false,
        highlights: [],
      },
    },
  }]);

  assert.deepEqual(snapshot.draftGaps, [
    'memory missing, 1 candidate (Tight loops beat big plans.)',
    'skills missing',
    'soul missing',
    'voice missing',
  ]);
  assert.match(snapshot.snapshot, /draft gaps: memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills missing \| soul missing \| voice missing/);
  assert.match(snapshot.snapshot, /refresh paths: profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md/);
});

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

test('buildIngestionSummary preserves sample manifest source paths for legacy text-file manifests', () => {
  const summary = buildTsIngestionSummary([], {
    sampleManifestPath: 'samples/legacy-materials.json',
    sampleManifest: {
      status: 'loaded',
      entryCount: 1,
      profileIds: [' alpha-ready '],
      profileLabels: [' Alpha Ready (alpha-ready) '],
      filePaths: [' samples/alpha-ready.txt '],
      materialTypes: { ' text ': 1 },
      textFilePersonIds: {
        ' samples/alpha-ready.txt ': ' alpha-ready ',
      },
      error: null,
    },
    sampleTextPath: 'samples/alpha-ready.txt',
  });

  assert.deepEqual(summary.sampleManifestProfileIds, ['alpha-ready']);
  assert.deepEqual(summary.sampleManifestProfileLabels, ['Alpha Ready (alpha-ready)']);
  assert.deepEqual(summary.sampleManifestFilePaths, ['samples/alpha-ready.txt']);
  assert.deepEqual(summary.sampleManifestMaterialTypes, { text: 1 });
  assert.deepEqual(summary.sampleFileCommands, [
    {
      type: 'text',
      path: 'samples/alpha-ready.txt',
      personId: 'alpha-ready',
      sourcePath: 'samples/legacy-materials.json',
      command: "node src/index.js import text --person alpha-ready --file 'samples/alpha-ready.txt' --refresh-foundation",
    },
  ]);

  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    ingestion: summary as any,
  }).buildPreview(4000);

  assert.match(prompt, /sample text: alpha-ready -> node src\/index\.js import text --person alpha-ready --file 'samples\/alpha-ready\.txt' --refresh-foundation @ samples\/legacy-materials\.json/);
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
    "(node src/index.js update foundation --person 'jane-doe') && (node src/index.js update foundation --person 'harry-han')",
  );
});

test('buildIngestionSummary breaks stale imported-profile ties with latest material ids before label ordering', () => {
  const profiles = [
    {
      id: 'alpha-operator',
      materialCount: 1,
      materialTypes: { text: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-alpha',
      profile: {
        displayName: 'Alpha Operator',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
      },
      foundationDraftSummaries: {
        memory: { generated: true },
        skills: { generated: true },
        soul: { generated: true },
        voice: { generated: true },
      },
    },
    {
      id: 'beta-operator',
      materialCount: 1,
      materialTypes: { text: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-beta',
      profile: {
        displayName: 'Beta Operator',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
      },
      foundationDraftSummaries: {
        memory: { generated: true },
        skills: { generated: true },
        soul: { generated: true },
        voice: { generated: true },
      },
    },
  ];

  const jsSummary = buildJsIngestionSummary(profiles, {});
  const tsSummary = buildTsIngestionSummary(profiles, {});

  assert.deepEqual(jsSummary, tsSummary);
  assert.equal(tsSummary.recommendedProfileId, 'beta-operator');
  assert.equal(tsSummary.recommendedLabel, 'Beta Operator (beta-operator)');
  assert.equal(
    tsSummary.recommendedCommand,
    "(node src/index.js update foundation --person 'beta-operator') && (node src/index.js update foundation --person 'alpha-operator')",
  );
  assert.equal(
    tsSummary.refreshFoundationBundleCommand,
    "(node src/index.js update foundation --person 'beta-operator') && (node src/index.js update foundation --person 'alpha-operator')",
  );
  assert.deepEqual(
    tsSummary.profileCommands.map((profile) => profile.personId),
    ['beta-operator', 'alpha-operator'],
  );
  assert.deepEqual(
    tsSummary.allProfileCommands.map((profile) => profile.personId),
    ['beta-operator', 'alpha-operator'],
  );
});

test('buildIngestionSummary breaks stale imported-profile ties with latest material source paths before label ordering when timestamps and ids match', () => {
  const profiles = [
    {
      id: 'alpha-operator',
      materialCount: 1,
      materialTypes: { text: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-text',
      latestMaterialSourcePath: 'profiles/alpha-operator/imports/a-first.txt',
      profile: {
        displayName: 'Alpha Operator',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
      },
      foundationDraftSummaries: {
        memory: { generated: true },
        skills: { generated: true },
        soul: { generated: true },
        voice: { generated: true },
      },
    },
    {
      id: 'beta-operator',
      materialCount: 1,
      materialTypes: { text: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-text',
      latestMaterialSourcePath: 'profiles/beta-operator/imports/z-last.txt',
      profile: {
        displayName: 'Beta Operator',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
      },
      foundationDraftSummaries: {
        memory: { generated: true },
        skills: { generated: true },
        soul: { generated: true },
        voice: { generated: true },
      },
    },
  ];

  const jsSummary = buildJsIngestionSummary(profiles, {});
  const tsSummary = buildTsIngestionSummary(profiles, {});

  assert.deepEqual(jsSummary, tsSummary);
  assert.equal(tsSummary.recommendedProfileId, 'beta-operator');
  assert.equal(tsSummary.recommendedLabel, 'Beta Operator (beta-operator)');
  assert.equal(
    tsSummary.recommendedCommand,
    "(node src/index.js update foundation --person 'beta-operator') && (node src/index.js update foundation --person 'alpha-operator')",
  );
  assert.equal(
    tsSummary.refreshFoundationBundleCommand,
    "(node src/index.js update foundation --person 'beta-operator') && (node src/index.js update foundation --person 'alpha-operator')",
  );
  assert.deepEqual(
    tsSummary.profileCommands.map((profile) => profile.personId),
    ['beta-operator', 'alpha-operator'],
  );
  assert.deepEqual(
    tsSummary.allProfileCommands.map((profile) => profile.personId),
    ['beta-operator', 'alpha-operator'],
  );
});

test('buildIngestionSummary slash-normalizes latest material source paths on recommended and per-profile surfaces', () => {
  const profiles = [{
    id: 'jane-doe',
    materialCount: 1,
    materialTypes: { text: 1 },
    latestMaterialAt: '2026-04-20T12:00:00.000Z',
    latestMaterialId: '2026-04-20T12-00-00-000Z-text',
    latestMaterialSourcePath: ' .\\profiles\\jane-doe//imports\\sample.txt ',
    profile: {
      displayName: 'Jane Doe',
    },
    foundationDraftStatus: {
      complete: true,
      needsRefresh: true,
      missingDrafts: [],
    },
    foundationDraftSummaries: {
      memory: { generated: true },
      skills: { generated: true },
      soul: { generated: true },
      voice: { generated: true },
    },
  }];

  const jsSummary = buildJsIngestionSummary(profiles, {});
  const tsSummary = buildTsIngestionSummary(profiles, {});

  assert.deepEqual(jsSummary, tsSummary);
  assert.equal(tsSummary.recommendedLatestMaterialSourcePath, 'profiles/jane-doe/imports/sample.txt');
  assert.equal(tsSummary.profileCommands[0]?.latestMaterialSourcePath, 'profiles/jane-doe/imports/sample.txt');
  assert.equal(tsSummary.allProfileCommands[0]?.latestMaterialSourcePath, 'profiles/jane-doe/imports/sample.txt');
});

test('buildIngestionSummary keeps legacy new-material refresh reasons ahead of empty stale reasons', () => {
  const profiles = [
    {
      id: 'alpha-legacy-refresh',
      materialCount: 1,
      materialTypes: { text: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-alpha',
      profile: {
        displayName: 'Alpha Legacy Refresh',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
        refreshReasons: ['new-material'],
      },
      foundationDraftSummaries: {
        memory: { generated: true },
        skills: { generated: true },
        soul: { generated: true },
        voice: { generated: true },
      },
    },
    {
      id: 'beta-empty-refresh',
      materialCount: 1,
      materialTypes: { text: 1 },
      latestMaterialAt: '2026-04-21T12:00:00.000Z',
      latestMaterialId: '2026-04-21T12-00-00-000Z-beta',
      profile: {
        displayName: 'Beta Empty Refresh',
      },
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
        refreshReasons: [],
      },
      foundationDraftSummaries: {
        memory: { generated: true },
        skills: { generated: true },
        soul: { generated: true },
        voice: { generated: true },
      },
    },
  ];

  const jsSummary = buildJsIngestionSummary(profiles, {});
  const tsSummary = buildTsIngestionSummary(profiles, {});

  assert.deepEqual(jsSummary, tsSummary);
  assert.equal(tsSummary.recommendedProfileId, 'alpha-legacy-refresh');
  assert.equal(tsSummary.recommendedLabel, 'Alpha Legacy Refresh (alpha-legacy-refresh)');
  assert.equal(
    tsSummary.recommendedCommand,
    "(node src/index.js update foundation --person 'alpha-legacy-refresh') && (node src/index.js update foundation --person 'beta-empty-refresh')",
  );
  assert.equal(
    tsSummary.refreshFoundationBundleCommand,
    "(node src/index.js update foundation --person 'alpha-legacy-refresh') && (node src/index.js update foundation --person 'beta-empty-refresh')",
  );
  assert.deepEqual(
    tsSummary.profileCommands.map((profile) => profile.personId),
    ['alpha-legacy-refresh', 'beta-empty-refresh'],
  );
  assert.deepEqual(
    tsSummary.allProfileCommands.map((profile) => profile.personId),
    ['alpha-legacy-refresh', 'beta-empty-refresh'],
  );
});

test('buildIngestionSummary keeps starter-only metadata intake templates off the ready-intake bundle path', () => {
  const summary = buildTsIngestionSummary([
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
      id: 'beta-ready',
      materialCount: 0,
      materialTypes: {},
      profile: {
        displayName: 'Beta Ready',
        summary: 'Another ready starter intake.',
      },
      intake: {
        ready: true,
        completion: 'ready',
        importsDir: 'profiles/beta-ready/imports',
        intakeReadmePath: 'profiles/beta-ready/imports/README.md',
        starterManifestPath: 'profiles/beta-ready/imports/materials.template.json',
        sampleTextPath: 'profiles/beta-ready/imports/sample.txt',
        missingPaths: [],
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: false,
        missingDrafts: [],
      },
    },
  ]);

  assert.equal(
    summary.helperCommands.importIntakeBundle,
    null,
  );
  assert.equal(summary.recommendedAction, 'import source materials for Alpha Ready (alpha-ready)');
  assert.equal(
    summary.recommendedCommand,
    "node src/index.js import text --person alpha-ready --file 'profiles/alpha-ready/imports/sample.txt' --refresh-foundation",
  );
  assert.deepEqual(summary.recommendedPaths, []);
});

test('buildIngestionSummary shell-quotes profile-local starter sample commands when person ids contain spaces and apostrophes', () => {
  const summary = buildTsIngestionSummary([
    {
      id: "o'brien lane",
      materialCount: 0,
      materialTypes: {},
      profile: {
        displayName: "O'Brien Lane",
        summary: 'Starter intake is ready to import.',
      },
      intake: {
        ready: true,
        completion: 'ready',
        importsDir: "profiles/o'brien lane/imports",
        intakeReadmePath: "profiles/o'brien lane/imports/README.md",
        starterManifestPath: "profiles/o'brien lane/imports/materials.template.json",
        sampleTextPath: "profiles/o'brien lane/imports/sample note.txt",
        missingPaths: [],
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: false,
        missingDrafts: [],
      },
    },
  ]);

  assert.equal(summary.recommendedAction, "import source materials for O'Brien Lane (o'brien lane)");
  assert.equal(
    summary.recommendedCommand,
    "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'profiles/o'\"'\"'brien lane/imports/sample note.txt' --refresh-foundation",
  );
  assert.equal(
    summary.metadataProfileCommands[0]?.importMaterialCommand,
    "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'profiles/o'\"'\"'brien lane/imports/sample note.txt' --refresh-foundation",
  );
});

test('buildIngestionSummary shell-quotes sample import commands when person ids contain spaces and apostrophes', () => {
  const summary = buildTsIngestionSummary([
    {
      id: "o'brien lane",
      materialCount: 0,
      materialTypes: {},
      profile: {
        displayName: "O'Brien Lane",
        summary: 'Profile scaffold without imported materials yet.',
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: false,
        missingDrafts: [],
      },
    },
  ], {
    sampleManifestPath: 'samples/o-brien lane materials.json',
    sampleManifest: {
      status: 'loaded',
      entryCount: 2,
      profileIds: ["o'brien lane"],
      profileLabels: ["O'Brien Lane (o'brien lane)"],
      filePaths: ['samples/o brien note.txt'],
      materialTypes: { message: 1, text: 1 },
      textFilePersonIds: {
        'samples/o brien note.txt': "o'brien lane",
      },
      fileEntries: [
        {
          type: 'text',
          filePath: 'samples/o brien note.txt',
          personId: "o'brien lane",
        },
      ],
      inlineEntries: [
        {
          type: 'message',
          text: "Don't drop the quote.",
          personId: "o'brien lane",
        },
      ],
      error: null,
    },
    sampleTextPath: 'samples/o brien note.txt',
  });

  assert.equal(summary.sampleTextPersonId, "o'brien lane");
  assert.equal(summary.sampleTextCommand, "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'samples/o brien note.txt' --refresh-foundation");
  assert.deepEqual(summary.sampleFileCommands, [
    {
      type: 'text',
      path: 'samples/o brien note.txt',
      personId: "o'brien lane",
      sourcePath: 'samples/o-brien lane materials.json',
      command: "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'samples/o brien note.txt' --refresh-foundation",
    },
  ]);
  assert.deepEqual(summary.sampleInlineCommands, [
    {
      type: 'message',
      text: "Don't drop the quote.",
      personId: "o'brien lane",
      sourcePath: 'samples/o-brien lane materials.json',
      command: "node src/index.js import message --person 'o'\"'\"'brien lane' --text 'Don'\"'\"'t drop the quote.' --refresh-foundation",
    },
  ]);
  assert.equal(summary.metadataProfileCommands[0]?.importCommands?.text, "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'samples/o brien note.txt' --refresh-foundation");
  assert.equal(summary.metadataProfileCommands[0]?.importCommands?.message, "node src/index.js import message --person 'o'\"'\"'brien lane' --text 'Don'\"'\"'t drop the quote.' --refresh-foundation");
  assert.equal(summary.metadataProfileCommands[0]?.helperCommands?.directImports?.text, "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'samples/o brien note.txt' --refresh-foundation");
  assert.equal(summary.metadataProfileCommands[0]?.helperCommands?.directImports?.message, "node src/index.js import message --person 'o'\"'\"'brien lane' --text 'Don'\"'\"'t drop the quote.' --refresh-foundation");
  assert.equal(summary.metadataProfileCommands[0]?.importMaterialCommand, "node src/index.js import text --person 'o'\"'\"'brien lane' --file 'samples/o brien note.txt' --refresh-foundation");
});

test('buildIngestionSummary trims sample manifest file and person identifiers before matching profile imports', () => {
  const summary = buildTsIngestionSummary([
    {
      id: 'harry-han',
      materialCount: 0,
      materialTypes: {},
      profile: {
        displayName: 'Harry Han',
        summary: 'Profile scaffold without imported materials yet.',
      },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: false,
        missingDrafts: [],
      },
    },
  ], {
    sampleManifestPath: 'samples/harry-materials.json',
    sampleManifest: {
      status: 'loaded',
      entryCount: 2,
      profileIds: [' harry-han '],
      profileLabels: [' Harry Han (harry-han) '],
      filePaths: [' samples/harry-post.txt '],
      materialTypes: { message: 1, text: 1 },
      textFilePersonIds: {
        ' samples/harry-post.txt ': ' harry-han ',
      },
      fileEntries: [
        {
          type: 'text',
          filePath: ' samples/harry-post.txt ',
          personId: ' harry-han ',
        },
      ],
      inlineEntries: [
        {
          type: 'message',
          text: ' Ship the thin slice first. ',
          personId: ' harry-han ',
        },
      ],
      error: null,
    },
    sampleTextPath: 'samples/harry-post.txt',
  });

  assert.deepEqual(summary.sampleManifestProfileIds, ['harry-han']);
  assert.deepEqual(summary.sampleManifestProfileLabels, ['Harry Han (harry-han)']);
  assert.deepEqual(summary.sampleManifestFilePaths, ['samples/harry-post.txt']);
  assert.equal(summary.sampleTextPersonId, 'harry-han');
  assert.equal(summary.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.deepEqual(summary.sampleFileCommands, [
    {
      type: 'text',
      path: 'samples/harry-post.txt',
      personId: 'harry-han',
      sourcePath: 'samples/harry-materials.json',
      command: "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation",
    },
  ]);
  assert.deepEqual(summary.sampleInlineCommands, [
    {
      type: 'message',
      text: 'Ship the thin slice first.',
      personId: 'harry-han',
      sourcePath: 'samples/harry-materials.json',
      command: "node src/index.js import message --person harry-han --text 'Ship the thin slice first.' --refresh-foundation",
    },
  ]);
  assert.equal(summary.metadataProfileCommands[0]?.importCommands?.text, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.equal(summary.metadataProfileCommands[0]?.importCommands?.message, "node src/index.js import message --person harry-han --text 'Ship the thin slice first.' --refresh-foundation");
  assert.equal(summary.metadataProfileCommands[0]?.importMaterialCommand, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
});

test('buildIngestionSummary carries section-aware draft gap summaries onto stale imported profile commands', () => {
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
      foundationDraftSummaries: {
        voice: {
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['tone'],
          missingSections: ['signature-moves', 'avoid', 'language-hints'],
          headingAliases: ['voice-should-capture->signature-moves'],
        },
        soul: {
          readySectionCount: 2,
          totalSectionCount: 4,
          readySections: ['core-truths', 'boundaries'],
          missingSections: ['vibe', 'continuity'],
          headingAliases: ['core-values->core-truths'],
        },
      },
    },
  ]);

  assert.equal(
    summary.profileCommands[0]?.draftGapSummary,
    'memory missing | soul 2/4 ready (core-truths, boundaries), missing vibe/continuity; aliases core-values->core-truths | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints; aliases voice-should-capture->signature-moves',
  );
});

test('buildIngestionSummary preserves aggregate draft gap counts when missing section names are unavailable', () => {
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
      foundationDraftSummaries: {
        skills: {
          readySectionCount: 1,
          totalSectionCount: 3,
        },
        voice: {
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['tone'],
        },
      },
      foundationReadiness: {
        memory: {
          candidateCount: 1,
          sampleSummaries: ['Tight loops beat big plans.'],
        },
      },
    },
  ]);

  assert.equal(
    summary.profileCommands[0]?.draftGapSummary,
    'memory missing, 1 candidate (Tight loops beat big plans.) | skills 1/3 ready | voice 1/4 ready (tone)',
  );
});

test('loadProfilesIndex treats blockquoted voice draft headings as valid structured foundation content', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const voiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  const voiceDraftLines = voiceDraft.split(/\r?\n/);
  const firstSectionIndex = voiceDraftLines.findIndex((line) => line.trim() === '## Tone');
  const blockquotedVoiceDraft = [
    ...voiceDraftLines.slice(0, firstSectionIndex),
    ...voiceDraftLines.slice(firstSectionIndex).map((line) => (line.length > 0 ? `> ${line}` : line)),
  ].join('\n');
  fs.writeFileSync(voiceDraftPath, blockquotedVoiceDraft);

  assert.equal(hasValidFoundationMarkdownDraft(voiceDraftPath), true);

  const [profile] = loader.loadProfilesIndex();
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.equal(profile.foundationDraftSummaries.voice.generatedAt !== null, true);
  assert.deepEqual(profile.foundationDraftSummaries.voice.materialTypes, { message: 1 });
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
    sampleImagesDirPresent: true,
    intakeReadmePresent: true,
    starterManifestPresent: true,
    sampleTextPresent: true,
    missingPaths: [],
    importsDir: 'profiles/harry-han/imports',
    sampleImagesDirPath: 'profiles/harry-han/imports/images',
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
  assert.equal(profile.foundationDraftSummaries.memory.path, 'profiles/harry-han/memory/long-term/foundation.json');
  assert.equal(profile.foundationDraftSummaries.memory.generatedAt, profile.foundationDraftSummaries.voice.generatedAt);
  assert.equal(profile.foundationDraftSummaries.memory.latestMaterialAt, profile.latestMaterialAt);
  assert.equal(profile.foundationDraftSummaries.memory.latestMaterialId, profile.latestMaterialId);
  assert.equal(profile.foundationDraftSummaries.memory.latestMaterialSourcePath, 'chat.png');
  assert.equal(profile.foundationDraftSummaries.memory.sourceCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.memory.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.equal(profile.foundationDraftSummaries.memory.entryCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.memory.latestSummaries.slice().sort(), ['Direct writing sample.', 'Ship the first slice.']);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.equal(profile.foundationDraftSummaries.voice.path, 'profiles/harry-han/voice/README.md');
  assert.equal(profile.foundationDraftSummaries.voice.generatedAt !== null, true);
  assert.equal(profile.foundationDraftSummaries.voice.sourceCount, 3);
  assert.deepEqual(profile.foundationDraftSummaries.voice.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.equal(profile.foundationDraftSummaries.voice.latestMaterialAt, profile.latestMaterialAt);
  assert.equal(profile.foundationDraftSummaries.voice.latestMaterialId, profile.latestMaterialId);
  assert.equal(profile.foundationDraftSummaries.voice.latestMaterialSourcePath, 'chat.png');
  assert.deepEqual(profile.foundationDraftSummaries.voice.highlights.slice().sort(), [
    '- [message] Ship the first slice.',
    '- [text] Direct writing sample.',
  ]);
  assert.equal(profile.foundationDraftSummaries.voice.readySectionCount, 4);
  assert.equal(profile.foundationDraftSummaries.voice.totalSectionCount, 4);
  assert.deepEqual(profile.foundationDraftSummaries.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(profile.foundationDraftSummaries.voice.missingSections, []);
  assert.deepEqual(profile.foundationDraftSummaries.soul, {
    generated: true,
    path: 'profiles/harry-han/soul/README.md',
    generatedAt: profile.foundationDraftSummaries.voice.generatedAt,
    latestMaterialAt: profile.latestMaterialAt,
    latestMaterialId: profile.latestMaterialId,
    latestMaterialSourcePath: 'chat.png',
    sourceCount: 3,
    materialTypes: {
      message: 1,
      screenshot: 1,
      text: 1,
    },
    highlights: ['- [text] Direct writing sample.'],
    readySectionCount: 4,
    totalSectionCount: 4,
    readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
    missingSections: [],
  });
  assert.deepEqual(profile.foundationDraftSummaries.skills, {
    generated: true,
    path: 'profiles/harry-han/skills/README.md',
    generatedAt: profile.foundationDraftSummaries.voice.generatedAt,
    latestMaterialAt: profile.latestMaterialAt,
    latestMaterialId: profile.latestMaterialId,
    latestMaterialSourcePath: 'chat.png',
    sourceCount: 3,
    materialTypes: {
      message: 1,
      screenshot: 1,
      text: 1,
    },
    highlights: [],
    readySectionCount: 3,
    totalSectionCount: 3,
    readySections: ['candidate-skills', 'evidence', 'gaps-to-validate'],
    missingSections: [],
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

test('loadProfilesIndex marks memory foundation drafts stale when the stored personId drifts from the profile id', () => {
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

  const memoryDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json');
  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  memoryDraft.personId = 'someone-else';
  fs.writeFileSync(memoryDraftPath, JSON.stringify(memoryDraft, null, 2));

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.deepEqual(profile.foundationDraftStatus.refreshReasons, ['profile metadata drift']);
  assert.equal(profile.foundationDraftSummaries.memory.generated, true);
});

test('loadProfilesIndex marks legacy markdown foundation drafts without structured sections as stale and ungenerated', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.importTalkSnippet({ personId: 'Harry Han', text: 'Keep the loop tight.', notes: 'execution heuristic' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md'),
    '# Voice draft\n\nProfile: harry-han\nDisplay name: Harry Han\nSummary: Not set.\nGenerated at: 2026-04-16T00:00:00.000Z\nLatest material: 2026-04-16T00:00:00.000Z (legacy-message)\nSource materials: 1 (message:1)\n\nRepresentative voice excerpts:\n- [message] Ship the first slice.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md'),
    '# Soul draft\n\nProfile: harry-han\nDisplay name: Harry Han\nSummary: Not set.\nGenerated at: 2026-04-16T00:00:00.000Z\nLatest material: 2026-04-16T00:00:00.000Z (legacy-talk)\nSource materials: 2 (message:1, talk:1)\n\nCandidate soul signals:\n- [talk] Keep the loop tight.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'skills', 'README.md'),
    '# Skills draft\n\nProfile: harry-han\nDisplay name: Harry Han\nSummary: Not set.\nGenerated at: 2026-04-16T00:00:00.000Z\nLatest material: 2026-04-16T00:00:00.000Z (legacy-talk)\nSource materials: 2 (message:1, talk:1)\n\nCandidate procedural skills:\n- execution heuristic\n  - sample: Keep the loop tight.\n',
  );

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, false);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, ['skills', 'soul', 'voice']);
  assert.deepEqual(profile.foundationDraftStatus.refreshReasons, ['missing drafts']);
  assert.deepEqual(profile.foundationDraftSummaries.voice, {
    generated: false,
    path: 'profiles/harry-han/voice/README.md',
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
    readySectionCount: 0,
    totalSectionCount: 4,
    readySections: [],
    missingSections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
  });
  assert.deepEqual(profile.foundationDraftSummaries.soul, {
    generated: false,
    path: 'profiles/harry-han/soul/README.md',
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
    readySectionCount: 0,
    totalSectionCount: 4,
    readySections: [],
    missingSections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
  });
  assert.deepEqual(profile.foundationDraftSummaries.skills, {
    generated: false,
    path: 'profiles/harry-han/skills/README.md',
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
    readySectionCount: 0,
    totalSectionCount: 3,
    readySections: [],
    missingSections: ['candidate-skills', 'evidence', 'gaps-to-validate'],
  });
});

test('loadProfilesIndex reports ready sections for partially structured stale profile drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md'),
    [
      '# Voice draft',
      '',
      'Profile: harry-han',
      'Display name: Harry Han',
      'Summary: Not set.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-message)',
      'Source materials: 1 (message:1)',
      '',
      '## Tone',
      'Keep replies direct.',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md'),
    [
      '# Soul draft',
      '',
      'Profile: harry-han',
      'Display name: Harry Han',
      'Summary: Not set.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-message)',
      'Source materials: 1 (message:1)',
      '',
      '## Core values',
      '- [message] Ship the first slice.',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'skills', 'README.md'),
    [
      '# Skills draft',
      '',
      'Profile: harry-han',
      'Display name: Harry Han',
      'Summary: Not set.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-message)',
      'Source materials: 1 (message:1)',
      '',
      '## Candidate skills',
      '- execution heuristic',
    ].join('\n'),
  );

  const [profile] = loader.loadProfilesIndex();

  assert.deepEqual(profile.foundationDraftSummaries.voice, {
    generated: false,
    path: 'profiles/harry-han/voice/README.md',
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
    readySectionCount: 1,
    totalSectionCount: 4,
    readySections: ['tone'],
    missingSections: ['signature-moves', 'avoid', 'language-hints'],
  });
  assert.deepEqual(profile.foundationDraftSummaries.soul, {
    generated: false,
    path: 'profiles/harry-han/soul/README.md',
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
    readySectionCount: 1,
    totalSectionCount: 4,
    readySections: ['core-truths'],
    missingSections: ['boundaries', 'vibe', 'continuity'],
    headingAliases: ['core-values->core-truths'],
  });
  assert.deepEqual(profile.foundationDraftSummaries.skills, {
    generated: false,
    path: 'profiles/harry-han/skills/README.md',
    generatedAt: null,
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    sourceCount: 0,
    materialTypes: {},
    highlights: [],
    readySectionCount: 1,
    totalSectionCount: 3,
    readySections: ['candidate-skills'],
    missingSections: ['evidence', 'gaps-to-validate'],
  });
});

test('loadProfilesIndex accepts deeper markdown headings in structured foundation drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md');

  const deeperVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8')
    .replace(/## /g, '### ');
  const deeperSoulDraft = fs.readFileSync(soulDraftPath, 'utf8')
    .replace(/## /g, '### ');

  fs.writeFileSync(voiceDraftPath, deeperVoiceDraft);
  fs.writeFileSync(soulDraftPath, deeperSoulDraft);

  assert.equal(hasValidFoundationMarkdownDraft(voiceDraftPath), true);
  assert.equal(hasValidFoundationMarkdownDraft(soulDraftPath), true);

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, false);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.equal(profile.foundationDraftSummaries.soul.generated, true);
});

test('refreshFoundationDrafts writes profile soul drafts with openclaw-style headings', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const soulDraft = fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md'), 'utf8');

  assert.match(soulDraft, /## Core truths/);
  assert.match(soulDraft, /## Boundaries/);
  assert.match(soulDraft, /## Vibe/);
  assert.match(soulDraft, /## Continuity/);
  assert.doesNotMatch(soulDraft, /## Core values/);
  assert.doesNotMatch(soulDraft, /## Decision rules/);
});

test('loadProfilesIndex accepts openclaw-style soul headings and legacy voice headings as valid structured drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md');

  const legacyVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8')
    .replace('## Signature moves', '## Voice should capture')
    .replace('## Avoid', '## Voice should not capture')
    .replace('## Language hints', '## Current default for Harry Han');
  const openclawSoulDraft = fs.readFileSync(soulDraftPath, 'utf8')
    .replace('## Core values', '## Core truths')
    .replace('## Decision rules', '## Continuity');

  fs.writeFileSync(voiceDraftPath, legacyVoiceDraft);
  fs.writeFileSync(soulDraftPath, openclawSoulDraft);

  assert.equal(hasValidFoundationMarkdownDraft(voiceDraftPath), true);
  assert.equal(hasValidFoundationMarkdownDraft(soulDraftPath), true);

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.foundationDraftStatus.complete, true);
  assert.equal(profile.foundationDraftStatus.needsRefresh, false);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, []);
  assert.equal(profile.foundationDraftSummaries.voice.generated, true);
  assert.equal(profile.foundationDraftSummaries.soul.generated, true);
  assert.deepEqual(profile.foundationDraftSummaries.voice.headingAliases, [
    'voice-should-capture->signature-moves',
    'voice-should-not-capture->avoid',
    'current-default->language-hints',
  ]);
  assert.equal(profile.foundationDraftSummaries.soul.headingAliases, undefined);
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

test('PromptAssembler singularizes foundation rollup candidate and stale-profile wording when counts are one', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationRollup: {
      memory: {
        profileCount: 1,
        generatedProfileCount: 0,
        candidateProfileCount: 1,
        candidateCount: 1,
        repoStaleProfileCount: 1,
        totalEntries: 1,
        highlights: ['Keep loops short.'],
      },
      voice: {
        profileCount: 1,
        generatedProfileCount: 0,
        candidateProfileCount: 1,
        candidateCount: 1,
        repoStaleProfileCount: 1,
        highlights: ['Warm and grounded.'],
      },
      soul: {
        profileCount: 1,
        generatedProfileCount: 0,
        candidateProfileCount: 1,
        candidateCount: 1,
        repoStaleProfileCount: 1,
        highlights: ['Protect the operator loop.'],
      },
      skills: {
        profileCount: 1,
        generatedProfileCount: 0,
        candidateProfileCount: 1,
        repoStaleProfileCount: 1,
        candidateCount: 1,
        highlights: ['execution heuristic'],
      },
    },
  }).buildSystemPrompt();

  assert.match(prompt, /memory: 0\/1 generated, 1 candidate profile, 1 candidate, 1 repo-stale profile, 1 entries, highlights: Keep loops short\./);
  assert.match(prompt, /voice: 0\/1 generated, 1 candidate profile, 1 candidate, 1 repo-stale profile, highlights: Warm and grounded\./);
  assert.match(prompt, /soul: 0\/1 generated, 1 candidate profile, 1 candidate, 1 repo-stale profile, highlights: Protect the operator loop\./);
  assert.match(prompt, /skills: 0\/1 generated, 1 candidate profile, 1 repo-stale profile, 1 candidate, highlights: execution heuristic/);
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
            path: 'profiles/harry-han/memory/long-term/foundation.json',
            generatedAt: '2026-04-16T15:00:01.000Z',
            latestMaterialAt: '2026-04-16T15:00:00.000Z',
            latestMaterialId: '2026-04-16T15-00-00-000Z-screenshot',
            sourceCount: 3,
            materialTypes: { text: 1, message: 1, screenshot: 1 },
            entryCount: 3,
            latestSummaries: ['Ship the first slice.', 'Direct writing sample.'],
          },
          voice: {
            generated: true,
            path: 'profiles/harry-han/voice/README.md',
            highlights: ['- [message] Ship the first slice.'],
            readySectionCount: 4,
            totalSectionCount: 4,
            readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
            missingSections: [],
          },
          soul: {
            generated: true,
            path: 'profiles/harry-han/soul/README.md',
            highlights: ['- [text] Direct writing sample.'],
            readySectionCount: 4,
            totalSectionCount: 4,
            readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
            missingSections: [],
          },
          skills: {
            generated: true,
            path: 'profiles/harry-han/skills/README.md',
            highlights: [],
            readySectionCount: 3,
            totalSectionCount: 3,
            readySections: ['candidate-skills', 'evidence', 'gaps-to-validate'],
            missingSections: [],
          },
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
          refreshReasons: ['missing-draft', 'new-material'],
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
        candidateProfileCount: 2,
        candidateCount: 3,
        repoStaleProfileCount: 1,
        totalEntries: 3,
        highlights: ['Ship the first slice.', 'Direct writing sample.'],
      },
      voice: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        candidateCount: 3,
        repoStaleProfileCount: 1,
        highlights: ['[message] Ship the first slice.', 'Tight loops beat big plans.'],
      },
      soul: {
        profileCount: 2,
        generatedProfileCount: 1,
        candidateProfileCount: 2,
        candidateCount: 2,
        repoStaleProfileCount: 1,
        highlights: ['[text] Direct writing sample.', 'Tight loops beat big plans.'],
      },
      skills: {
        profileCount: 2,
        generatedProfileCount: 0,
        candidateProfileCount: 1,
        repoStaleProfileCount: 1,
        candidateCount: 1,
        highlights: ['execution heuristic'],
      },
    },
  }).buildSystemPrompt();

  assert.match(prompt, /Foundation rollup:/);
  assert.match(prompt, /memory: 1\/2 generated, 2 candidate profiles, 3 candidates, 1 repo-stale profile, 3 entries/);
  assert.match(prompt, /voice: 1\/2 generated, 2 candidate profiles, 3 candidates, 1 repo-stale profile/);
  assert.match(prompt, /soul: 1\/2 generated, 2 candidate profiles, 2 candidates, 1 repo-stale profile/);
  assert.match(prompt, /skills: 0\/2 generated, 1 candidate profile, 1 repo-stale profile, 1 candidate, highlights: execution heuristic/);
  assert.match(prompt, /Profiles:/);
  assert.match(prompt, /"jane-doe"/);
  assert.match(prompt, /Profile foundation snapshots:/);
  assert.match(prompt, /- Harry Han \(harry-han\): 3 materials \(message:1, screenshot:1, text:1\)/);
  assert.match(prompt, /profile summary: Direct operator with a bias for momentum\./);
  assert.match(prompt, /drafts: fresh, complete, generated 2026-04-16T15:00:01.000Z/);
  assert.match(prompt, /memory candidates: 3 \(message, screenshot, text\) \| voice: 2 \(message, text\) \| soul: 1 \(text\) \| skills: 0/);
  assert.match(prompt, /draft sections: skills 3\/3 ready \(candidate-skills, evidence, gaps-to-validate\) \| soul 4\/4 ready \(core-truths, boundaries, vibe, continuity\) \| voice 4\/4 ready \(tone, signature-moves, avoid, language-hints\)/);
  assert.match(prompt, /draft files: memory @ profiles\/harry-han\/memory\/long-term\/foundation\.json \| skills @ profiles\/harry-han\/skills\/README\.md \| soul @ profiles\/harry-han\/soul\/README\.md \| voice @ profiles\/harry-han\/voice\/README\.md/);
  assert.match(prompt, /voice highlights: \[message\] Ship the first slice\./);
  assert.match(prompt, /- Jane Doe \(jane-doe\): 1 material \(talk:1\)/);
  assert.match(prompt, /drafts: stale, missing memory\/skills\/soul\/voice, reasons missing-draft \+ new-material/);
  assert.match(prompt, /memory highlights: Tight loops beat big plans\./);
  assert.match(prompt, /skills signals: execution heuristic/);
  assert.match(prompt, /Ship the first slice\./);
});

test('PromptAssembler truncates previews at line boundaries with an ellipsis instead of slicing mid-line', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    soulProfile: {
      excerpt: 'Keep the system inspectable.',
      coreTruths: ['Prefer small verified slices.'],
      boundaries: ['Do not bluff.'],
      vibe: ['Grounded.'],
      continuity: ['Carry forward durable lessons.'],
    },
    voice: {
      tone: 'Direct.',
      style: 'documented',
      constraints: ['No padding.'],
      signatures: ['Short sentences.'],
      languageHints: ['Preserve bilingual habits.'],
    },
    memory: { shortTermEntries: 1, longTermEntries: 1 },
    memorySummary: { shortTermEntries: 1, longTermEntries: 1, totalEntries: 2, shortTermPresent: true, longTermPresent: true },
    skills: [],
    skillsSummary: { skillCount: 1, discoveredCount: 1, customCount: 0, skills: [{ name: 'cron', status: 'discovered', description: 'Keep recurring runs small and verified.' }] },
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
  }).buildPreview(88);

  assert.equal(prompt, 'Name: ManSkill\nSoul summary: persona core\nSoul profile:…');
});

test('PromptAssembler preserves root section count summaries when only aggregate counts are available', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    memorySummary: {
      dailyEntries: 1,
      longTermEntries: 0,
      scratchEntries: 0,
      totalEntries: 1,
      dailyPresent: true,
      longTermPresent: false,
      scratchPresent: false,
      canonicalShortTermBucket: 'daily',
      legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
      legacyShortTermSourceCount: 0,
      legacyShortTermSources: [],
      legacyShortTermSampleSources: [],
      legacyShortTermSourceOverflowCount: 0,
      readyBucketCount: 1,
      totalBucketCount: 3,
      populatedBuckets: ['daily'],
      emptyBuckets: ['long-term', 'scratch'],
    },
    skills: [],
    skillsSummary: {
      skillCount: 1,
      discoveredCount: 1,
      customCount: 0,
      skills: [{ name: 'slack', status: 'discovered', description: 'Route thread replies safely.' }],
    },
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here'],
        rootMissingSections: ['buckets'],
        rootReadySectionCount: 1,
        rootTotalSectionCount: 2,
        dailyCount: 1,
        longTermCount: 0,
        scratchCount: 0,
        readyBucketCount: 1,
        totalBucketCount: 3,
        populatedBuckets: ['daily'],
        emptyBuckets: ['long-term', 'scratch'],
        sampleEntries: ['daily/2026-04-20.md'],
      },
      skills: {
        hasRootDocument: true,
        rootPath: 'skills/README.md',
        rootExcerpt: 'Keep shared procedures discoverable.',
        rootReadySections: ['what-lives-here'],
        rootMissingSections: ['layout'],
        rootReadySectionCount: 1,
        rootTotalSectionCount: 2,
        count: 1,
        documentedCount: 1,
        sample: ['slack'],
        samplePaths: ['skills/slack/SKILL.md'],
      },
      overview: {
        readyAreaCount: 4,
        totalAreaCount: 4,
        missingAreas: [],
        thinAreas: [],
        recommendedActions: [],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 4,
        missingAreaCount: 0,
        thinAreaCount: 0,
        recommendedPaths: [],
        helperCommands: {},
        queuedAreas: [],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /Memory store:\n- daily: 1\n- long-term: 0\n- scratch: 0\n- total: 1\n- buckets: 1\/3 ready \(daily\), missing long-term, scratch\n- aliases: daily canonical via shortTermEntries, shortTermPresent\n- root: Keep durable notes here\. @ memory\/README\.md\n- root sections: 1\/2 ready \(what-belongs-here\), missing buckets/);
  assert.match(prompt, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- root: Keep shared procedures discoverable\. @ skills\/README\.md\n- root sections: 1\/2 ready \(what-lives-here\), missing layout\n- top skills: slack \[discovered\]: Route thread replies safely\./);
  assert.match(prompt, /memory: README yes, daily 1, long-term 0, scratch 0; buckets 1\/3 ready \(daily\), missing long-term, scratch; samples: daily\/2026-04-20\.md; root: Keep durable notes here\. @ memory\/README\.md; root sections 1\/2 ready/);
  assert.match(prompt, /skills: 1 registered, 1 documented \(slack\); root: Keep shared procedures discoverable\. @ skills\/README\.md; root sections 1\/2 ready \(what-lives-here\), missing layout; docs: skills\/slack\/SKILL\.md/);
});

test('PromptAssembler infers canonical daily alias wording from legacy short-term fields when explicit alias metadata is absent', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: {
      dailyEntries: 2,
      shortTermEntries: 2,
      longTermEntries: 1,
      scratchEntries: 0,
      totalEntries: 3,
      dailyPresent: true,
      shortTermPresent: true,
      longTermPresent: true,
      scratchPresent: false,
      legacyShortTermSourceCount: 4,
      legacyShortTermSampleSources: [
        'memory/short-term/2026-04-01.md',
        'memory/short-term/2026-04-02.md',
        'memory/short-term/2026-04-03.md',
      ],
      legacyShortTermSourceOverflowCount: 1,
    },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here', 'buckets'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        shortTermEntries: 2,
        shortTermPresent: true,
        longTermCount: 1,
        scratchCount: 0,
        totalEntries: 3,
        readyBucketCount: 2,
        totalBucketCount: 3,
        populatedBuckets: ['daily', 'long-term'],
        emptyBuckets: ['scratch'],
        sampleEntries: ['daily/2026-04-20.md', 'long-term/operator.json'],
        legacyShortTermSourceCount: 4,
        legacyShortTermSampleSources: [
          'memory/short-term/2026-04-01.md',
          'memory/short-term/2026-04-02.md',
          'memory/short-term/2026-04-03.md',
        ],
        legacyShortTermSourceOverflowCount: 1,
      },
      skills: {
        hasRootDocument: false,
        rootPath: 'skills/README.md',
        rootExcerpt: null,
        count: 0,
        documentedCount: 0,
        sample: [],
        samplePaths: [],
      },
      soul: {
        present: false,
        path: 'SOUL.md',
        lineCount: 0,
        excerpt: null,
        readySections: [],
        missingSections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
        readySectionCount: 0,
        totalSectionCount: 4,
      },
      voice: {
        present: false,
        path: 'voice/README.md',
        lineCount: 0,
        excerpt: null,
        readySections: [],
        missingSections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
        readySectionCount: 0,
        totalSectionCount: 4,
      },
      overview: {
        readyAreaCount: 1,
        totalAreaCount: 4,
        missingAreas: ['skills', 'soul', 'voice'],
        thinAreas: [],
        recommendedActions: [],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 1,
        missingAreaCount: 3,
        thinAreaCount: 0,
        recommendedPaths: [],
        helperCommands: {},
        queuedAreas: [],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /memory: README yes, daily 2, long-term 1, scratch 0; buckets 2\/3 ready \(daily, long-term\), missing scratch; aliases daily canonical via shortTermEntries, shortTermPresent; legacy short-term sources memory\/short-term\/2026-04-01\.md, memory\/short-term\/2026-04-02\.md, memory\/short-term\/2026-04-03\.md, \+1 more; samples: daily\/2026-04-20\.md, long-term\/operator\.json; root: Keep durable notes here\. @ memory\/README\.md; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
});

test('PromptAssembler normalizes legacy short-term source provenance before rendering alias summaries', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: {
      dailyEntries: 2,
      shortTermEntries: 2,
      longTermEntries: 0,
      scratchEntries: 0,
      totalEntries: 2,
      dailyPresent: true,
      shortTermPresent: true,
      longTermPresent: false,
      scratchPresent: false,
      legacyShortTermSourceCount: 3,
      legacyShortTermSampleSources: [
        ' .\\memory\\short-term\\2026-04-01.md ',
        './memory/short-term//2026-04-02.md',
        '.\\memory/short-term\\2026-04-03.md',
      ],
    },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here', 'buckets'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        shortTermEntries: 2,
        shortTermPresent: true,
        readyBucketCount: 1,
        totalBucketCount: 3,
        populatedBuckets: ['daily'],
        emptyBuckets: ['long-term', 'scratch'],
        sampleEntries: ['daily/2026-04-20.md'],
        legacyShortTermSourceCount: 3,
        legacyShortTermSampleSources: [
          ' .\\memory\\short-term\\2026-04-01.md ',
          './memory/short-term//2026-04-02.md',
          '.\\memory/short-term\\2026-04-03.md',
        ],
      },
      skills: {
        hasRootDocument: false,
        rootPath: 'skills/README.md',
        rootExcerpt: null,
        count: 0,
        documentedCount: 0,
        sample: [],
        samplePaths: [],
      },
      soul: {
        present: false,
        path: 'SOUL.md',
        lineCount: 0,
        excerpt: null,
        readySections: [],
        missingSections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
        readySectionCount: 0,
        totalSectionCount: 4,
      },
      voice: {
        present: false,
        path: 'voice/README.md',
        lineCount: 0,
        excerpt: null,
        readySections: [],
        missingSections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
        readySectionCount: 0,
        totalSectionCount: 4,
      },
      overview: {
        readyAreaCount: 1,
        totalAreaCount: 4,
        missingAreas: ['skills', 'soul', 'voice'],
        thinAreas: [],
        recommendedActions: [],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 1,
        missingAreaCount: 3,
        thinAreaCount: 0,
        recommendedPaths: [],
        helperCommands: {},
        queuedAreas: [],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /aliases daily canonical via shortTermEntries, shortTermPresent; legacy short-term sources memory\/short-term\/2026-04-01\.md, memory\/short-term\/2026-04-02\.md, memory\/short-term\/2026-04-03\.md; samples: daily\/2026-04-20\.md/);
});

test('PromptAssembler prefers explicit daily counts over legacy short-term aliases in core foundation memory snapshots', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 1, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here'],
        rootMissingSections: ['buckets'],
        rootReadySectionCount: 1,
        rootTotalSectionCount: 2,
        shortTermEntries: 5,
        shortTermPresent: true,
        dailyCount: 2,
        longTermCount: 1,
        scratchCount: 0,
        readyBucketCount: 2,
        totalBucketCount: 3,
        populatedBuckets: ['daily', 'long-term'],
        emptyBuckets: ['scratch'],
      },
      overview: {
        readyAreaCount: 1,
        totalAreaCount: 4,
        missingAreas: ['skills', 'soul', 'voice'],
        thinAreas: [],
        recommendedActions: [],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 1,
        missingAreaCount: 3,
        thinAreaCount: 0,
        recommendedPaths: [],
        helperCommands: {},
        queuedAreas: [],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /memory: README yes, daily 2, long-term 1, scratch 0; buckets 2\/3 ready \(daily, long-term\), missing scratch; aliases daily canonical via shortTermEntries, shortTermPresent; root: Keep durable notes here\. @ memory\/README\.md; root sections 1\/2 ready \(what-belongs-here\), missing buckets/);
  assert.doesNotMatch(prompt, /memory: README yes, daily 5,/);
});

test('PromptAssembler preserves queued core-foundation root section counts when only aggregate counts are available', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here', 'buckets'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        dailyCount: 1,
        longTermCount: 1,
        scratchCount: 1,
        readyBucketCount: 3,
        totalBucketCount: 3,
        populatedBuckets: ['daily', 'long-term', 'scratch'],
        emptyBuckets: [],
        sampleEntries: ['daily/2026-04-20.md', 'long-term/operator.json', 'scratch/draft.md'],
      },
      skills: {
        hasRootDocument: true,
        rootPath: 'skills/README.md',
        rootExcerpt: 'Keep shared procedures discoverable.',
        rootReadySectionCount: 1,
        rootTotalSectionCount: 2,
        rootMissingSections: ['layout'],
        count: 1,
        documentedCount: 1,
        sample: ['slack'],
        samplePaths: ['skills/slack/SKILL.md'],
        sampleExcerpts: ['slack: Route thread replies safely.'],
      },
      soul: {
        present: true,
        path: 'SOUL.md',
        lineCount: 4,
        excerpt: 'Stay grounded.',
        readySectionCount: 4,
        totalSectionCount: 4,
        readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
        missingSections: [],
      },
      voice: {
        present: true,
        path: 'voice/README.md',
        lineCount: 4,
        excerpt: 'Stay direct.',
        readySectionCount: 4,
        totalSectionCount: 4,
        readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
        missingSections: [],
      },
      overview: {
        readyAreaCount: 3,
        totalAreaCount: 4,
        missingAreas: [],
        thinAreas: ['skills'],
        recommendedActions: ['add missing sections to skills/README.md: layout'],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 3,
        missingAreaCount: 0,
        thinAreaCount: 1,
        recommendedArea: 'skills',
        recommendedAction: 'add missing sections to skills/README.md: layout',
        recommendedCommand: 'python scripts/repair-skills-root.py',
        recommendedPaths: ['skills/README.md'],
        helperCommands: {},
        queuedAreas: [
          {
            area: 'skills',
            status: 'thin',
            summary: '1 registered, 1 documented, root 1/2 sections ready (what-lives-here), missing layout',
            action: 'add missing sections to skills/README.md: layout',
            paths: ['skills/README.md'],
            rootThinMissingSections: ['layout'],
            rootThinReadySectionCount: 1,
            rootThinTotalSectionCount: 2,
            command: 'python scripts/repair-skills-root.py',
          },
        ],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /skills \[thin\]: add missing sections to skills\/README\.md: layout @ skills\/README\.md; context root sections 1\/2 ready, missing layout; command python scripts\/repair-skills-root\.py/);
});

test('PromptAssembler labels queued soul and voice section context without a misleading root prefix', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here', 'buckets'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        dailyCount: 1,
        longTermCount: 1,
        scratchCount: 1,
        readyBucketCount: 3,
        totalBucketCount: 3,
        populatedBuckets: ['daily', 'long-term', 'scratch'],
        emptyBuckets: [],
        sampleEntries: ['daily/2026-04-20.md', 'long-term/operator.json', 'scratch/draft.md'],
      },
      skills: {
        hasRootDocument: true,
        rootPath: 'skills/README.md',
        rootExcerpt: 'Keep shared procedures discoverable.',
        rootReadySections: ['what-lives-here', 'layout'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        count: 1,
        documentedCount: 1,
        sample: ['slack'],
        samplePaths: ['skills/slack/SKILL.md'],
      },
      soul: {
        present: true,
        path: 'SOUL.md',
        lineCount: 1,
        excerpt: 'Stay grounded.',
        readySectionCount: 1,
        totalSectionCount: 4,
        readySections: ['core-truths'],
        missingSections: ['boundaries', 'vibe', 'continuity'],
      },
      voice: {
        present: true,
        path: 'voice/README.md',
        lineCount: 1,
        excerpt: 'Stay direct.',
        readySectionCount: 1,
        totalSectionCount: 4,
        readySections: ['tone'],
        missingSections: ['signature-moves', 'avoid', 'language-hints'],
      },
      overview: {
        readyAreaCount: 2,
        totalAreaCount: 4,
        missingAreas: [],
        thinAreas: ['soul', 'voice'],
        recommendedActions: ['add missing sections to SOUL.md: boundaries, vibe, continuity'],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 2,
        missingAreaCount: 0,
        thinAreaCount: 2,
        recommendedArea: 'soul',
        recommendedAction: 'add missing sections to SOUL.md: boundaries, vibe, continuity',
        recommendedCommand: 'python scripts/repair-soul.py',
        recommendedPaths: ['SOUL.md'],
        helperCommands: {},
        queuedAreas: [
          {
            area: 'soul',
            status: 'thin',
            summary: 'present, 1 lines, sections 1/4 ready (core-truths), missing boundaries, vibe, continuity',
            action: 'add missing sections to SOUL.md: boundaries, vibe, continuity',
            paths: ['SOUL.md'],
            rootThinReadySectionCount: 1,
            rootThinTotalSectionCount: 4,
            rootThinReadySections: ['core-truths'],
            rootThinMissingSections: ['boundaries', 'vibe', 'continuity'],
            command: 'python scripts/repair-soul.py',
          },
          {
            area: 'voice',
            status: 'thin',
            summary: 'present, 1 lines, sections 1/4 ready (tone), missing signature-moves, avoid, language-hints',
            action: 'add missing sections to voice/README.md: signature-moves, avoid, language-hints',
            paths: ['voice/README.md'],
            rootThinReadySectionCount: 1,
            rootThinTotalSectionCount: 4,
            rootThinReadySections: ['tone'],
            rootThinMissingSections: ['signature-moves', 'avoid', 'language-hints'],
            command: 'python scripts/repair-voice.py',
          },
        ],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /soul \[thin\]: add missing sections to SOUL\.md: boundaries, vibe, continuity @ SOUL\.md; context sections 1\/4 ready \(core-truths\), missing boundaries, vibe, continuity; command python scripts\/repair-soul\.py/);
  assert.match(prompt, /voice \[thin\]: add missing sections to voice\/README\.md: signature-moves, avoid, language-hints @ voice\/README\.md; context sections 1\/4 ready \(tone\), missing signature-moves, avoid, language-hints; command python scripts\/repair-voice\.py/);
  assert.doesNotMatch(prompt, /context root sections 1\/4 ready/);
});

test('PromptAssembler keeps compact ready core foundation details when section counts can be derived from arrays', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here', 'buckets'],
        rootMissingSections: [],
        canonicalShortTermBucket: 'daily',
        legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
        legacyShortTermSourceCount: 0,
        legacyShortTermSources: [],
        dailyCount: 1,
        longTermCount: 1,
        scratchCount: 1,
        readyBucketCount: 3,
        totalBucketCount: 3,
        populatedBuckets: ['daily', 'long-term', 'scratch'],
        emptyBuckets: [],
        sampleEntries: ['daily/2026-04-20.md', 'long-term/operator.json', 'scratch/draft.md'],
      },
      skills: {
        hasRootDocument: true,
        rootPath: 'skills/README.md',
        rootExcerpt: 'Keep shared procedures discoverable.',
        rootReadySections: ['what-lives-here', 'layout'],
        rootMissingSections: [],
        count: 2,
        documentedCount: 2,
        sample: ['slack', 'telegram'],
        samplePaths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
      },
      soul: {
        present: true,
        path: 'SOUL.md',
        lineCount: 4,
        excerpt: 'Stay grounded.',
        readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
        missingSections: [],
      },
      voice: {
        present: true,
        path: 'voice/README.md',
        lineCount: 4,
        excerpt: 'Stay direct.',
        readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
        missingSections: [],
      },
      overview: {
        readyAreaCount: 4,
        totalAreaCount: 4,
        missingAreas: [],
        thinAreas: [],
        recommendedActions: [],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 4,
        missingAreaCount: 0,
        thinAreaCount: 0,
        recommendedPaths: [],
        helperCommands: {},
        queuedAreas: [],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 2\/2 \(slack, telegram\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(prompt, /memory: README yes, daily 1, long-term 1, scratch 1/);
});

test('PromptAssembler preserves thin skill doc section counts when only aggregate counts are available', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    foundationCore: {
      memory: {
        hasRootDocument: true,
        rootPath: 'memory/README.md',
        rootExcerpt: 'Keep durable notes here.',
        rootReadySections: ['what-belongs-here', 'buckets'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        dailyCount: 1,
        longTermCount: 1,
        scratchCount: 1,
        readyBucketCount: 3,
        totalBucketCount: 3,
        populatedBuckets: ['daily', 'long-term', 'scratch'],
        emptyBuckets: [],
        sampleEntries: ['daily/2026-04-20.md', 'long-term/operator.json', 'scratch/draft.md'],
      },
      skills: {
        hasRootDocument: true,
        rootPath: 'skills/README.md',
        rootExcerpt: 'Keep shared procedures discoverable.',
        rootReadySections: ['what-lives-here', 'layout'],
        rootMissingSections: [],
        rootReadySectionCount: 2,
        rootTotalSectionCount: 2,
        count: 1,
        documentedCount: 1,
        thinCount: 1,
        sample: ['delivery'],
        samplePaths: ['skills/delivery/SKILL.md'],
        thinSample: ['delivery'],
        thinPaths: ['skills/delivery/SKILL.md'],
        thinReadySectionCounts: { delivery: 1 },
        thinTotalSectionCounts: { delivery: 2 },
      },
      soul: {
        present: true,
        path: 'SOUL.md',
        lineCount: 4,
        excerpt: 'Stay grounded.',
        readySectionCount: 4,
        totalSectionCount: 4,
        readySections: ['core-truths', 'boundaries', 'vibe', 'continuity'],
        missingSections: [],
      },
      voice: {
        present: true,
        path: 'voice/README.md',
        lineCount: 4,
        excerpt: 'Stay direct.',
        readySectionCount: 4,
        totalSectionCount: 4,
        readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
        missingSections: [],
      },
      overview: {
        readyAreaCount: 3,
        totalAreaCount: 4,
        missingAreas: [],
        thinAreas: ['skills'],
        recommendedActions: ['add missing sections to skills/delivery/SKILL.md'],
      },
      maintenance: {
        areaCount: 4,
        readyAreaCount: 3,
        missingAreaCount: 0,
        thinAreaCount: 1,
        recommendedArea: 'skills',
        recommendedStatus: 'thin',
        recommendedSummary: '1 registered, 1 documented, 1 thin doc',
        recommendedAction: 'add missing sections to skills/delivery/SKILL.md',
        recommendedCommand: "node -e 'repair delivery skill'",
        recommendedPaths: ['skills/delivery/SKILL.md'],
        helperCommands: {
          skills: "node -e 'repair delivery skill'",
        },
        queuedAreas: [
          {
            area: 'skills',
            status: 'thin',
            summary: '1 registered, 1 documented, 1 thin doc',
            action: 'add missing sections to skills/delivery/SKILL.md',
            paths: ['skills/delivery/SKILL.md'],
            thinPaths: ['skills/delivery/SKILL.md'],
            thinReadySectionCounts: { 'skills/delivery/SKILL.md': 1 },
            thinTotalSectionCounts: { 'skills/delivery/SKILL.md': 2 },
            command: "node -e 'repair delivery skill'",
          },
        ],
      },
    },
  }).buildPreview(4000);

  assert.match(prompt, /skills: 1 registered, 1 documented \(delivery\); root: Keep shared procedures discoverable\. @ skills\/README\.md; root sections 2\/2 ready \(what-lives-here, layout\); docs: skills\/delivery\/SKILL\.md; thin docs: delivery sections 1\/2 ready @ skills\/delivery\/SKILL\.md/);
  assert.match(prompt, /skills \[thin\]: add missing sections to skills\/delivery\/SKILL\.md @ skills\/delivery\/SKILL\.md; context thin docs delivery sections 1\/2 ready; command node -e 'repair delivery skill'/);
});

test('PromptAssembler preserves aggregate draft gap counts when missing section names are unavailable', () => {
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
        profile: { displayName: 'Jane Doe' },
        foundationDraftStatus: {
          complete: false,
          needsRefresh: true,
          missingDrafts: ['memory', 'skills', 'voice'],
          refreshReasons: ['missing drafts'],
        },
        foundationReadiness: {
          memory: { candidateCount: 1, sampleSummaries: ['Tight loops beat big plans.'] },
        },
        foundationDraftSummaries: {
          skills: { readySectionCount: 1, totalSectionCount: 3 },
          voice: { readySectionCount: 1, totalSectionCount: 4, readySections: ['tone'] },
        },
      },
    ],
  }).buildSystemPrompt();

  assert.match(prompt, /draft gaps: memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills 1\/3 ready \| voice 1\/4 ready \(tone\)/);
});

test('buildFoundationRollup maintenance aggregates missing draft coverage and refresh reasons', () => {
  const rollup = buildFoundationRollup([
    {
      id: 'harry-han',
      materialCount: 2,
      latestMaterialAt: '2026-04-16T15:00:00.000Z',
      latestMaterialId: ' 2026-04-16T15-00-00-000Z-message ',
      foundationDraftStatus: {
        complete: true,
        needsRefresh: true,
        missingDrafts: [],
        refreshReasons: ['metadata-updated'],
      },
      foundationDraftSummaries: {
        memory: { generated: true, entryCount: 2, latestSummaries: ['Ship the first slice.'] },
        voice: { generated: true, highlights: ['- [message] Ship the first slice.'] },
        soul: { generated: true, highlights: ['- [text] Stay faithful.'] },
        skills: { generated: true, highlights: ['- execution heuristic'] },
      },
      foundationReadiness: {
        memory: { candidateCount: 2, sampleSummaries: ['Ship the first slice.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['Ship the first slice.'] },
        soul: { candidateCount: 1, sampleExcerpts: ['Stay faithful.'] },
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
      profile: { displayName: 'Harry Han' },
    },
    {
      id: 'jane-doe',
      materialCount: 1,
      latestMaterialAt: '2026-04-16T16:00:00.000Z',
      latestMaterialId: ' 2026-04-16T16-00-00-000Z-talk ',
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills', 'voice'],
        refreshReasons: ['missing-draft', 'new-material'],
      },
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
        skills: { candidateCount: 1, sampleExcerpts: ['execution heuristic'] },
      },
      profile: { displayName: 'Jane Doe' },
    },
  ]);

  assert.deepEqual(rollup.maintenance.missingDraftCounts, {
    memory: 1,
    skills: 1,
    soul: 0,
    voice: 1,
  });
  assert.deepEqual(rollup.maintenance.refreshReasonCounts, {
    'metadata-updated': 1,
    'missing-draft': 1,
    'new-material': 1,
  });
  assert.equal(rollup.maintenance.recommendedLatestMaterialAt, '2026-04-16T16:00:00.000Z');
  assert.equal(rollup.maintenance.recommendedLatestMaterialId, '2026-04-16T16-00-00-000Z-talk');
  assert.equal(rollup.maintenance.queuedProfiles[0]?.latestMaterialId, '2026-04-16T16-00-00-000Z-talk');
  assert.equal(rollup.maintenance.queuedProfiles[1]?.latestMaterialId, '2026-04-16T15-00-00-000Z-message');
});

test('PromptAssembler includes aggregated foundation maintenance counts in the system prompt', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [],
    foundationRollup: {
      maintenance: {
        profileCount: 2,
        readyProfileCount: 0,
        refreshProfileCount: 2,
        incompleteProfileCount: 1,
        missingDraftCounts: {
          memory: 1,
          skills: 1,
          soul: 0,
          voice: 1,
        },
        refreshReasonCounts: {
          'metadata-updated': 1,
          'missing-draft': 1,
          'new-material': 1,
        },
        staleRefreshCommand: 'node src/index.js update foundation --stale',
        helperCommands: {
          refreshStale: 'node src/index.js update foundation --stale',
        },
        queuedProfiles: [],
      },
      memory: {
        profileCount: 2,
        generatedProfileCount: 1,
        repoStaleProfileCount: 2,
        totalEntries: 3,
        highlights: ['Ship the first slice.'],
      },
    },
  }).buildSystemPrompt();

  assert.match(prompt, /Foundation maintenance:/);
  assert.match(prompt, /- missing drafts: memory 1, skills 1, voice 1/);
  assert.match(prompt, /- refresh reasons: metadata-updated 1, missing-draft 1, new-material 1/);
});

test('PromptAssembler renders normalized foundation maintenance queue metadata from the rollup', () => {
  const foundationRollup = buildFoundationRollup([
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
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [],
    foundationRollup,
  }).buildSystemPrompt();

  assert.match(prompt, /- next refresh: refresh Jane Doe \(jane-doe\) — reasons missing drafts \+ metadata-updated; evidence memory 1 \| voice 0 \| soul 0 \| skills 0; command node src\/index\.js update foundation --person 'jane-doe' @ profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md; latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\) @ profiles\/jane-doe\/materials\/2026-04-16T16-00-00-000Z-talk\.json/);
  assert.match(prompt, /- Jane Doe \(jane-doe\): stale, 0\/4 drafts generated, missing memory\/skills, latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\) @ profiles\/jane-doe\/materials\/2026-04-16T16-00-00-000Z-talk\.json, reasons missing drafts \+ metadata-updated, evidence memory 1 \| voice 0 \| soul 0 \| skills 0/);
  assert.doesNotMatch(prompt, /missing drafts \+ metadata-updated \+ missing drafts/);
  assert.doesNotMatch(prompt, /missing memory\/skills\/memory/);
});

test('PromptAssembler keeps foundation maintenance previews compact when many queued profiles need refresh', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    profiles: [],
    foundationRollup: {
      maintenance: {
        profileCount: 3,
        readyProfileCount: 0,
        refreshProfileCount: 3,
        incompleteProfileCount: 3,
        missingDraftCounts: {
          memory: 3,
          skills: 3,
          soul: 2,
          voice: 1,
        },
        refreshReasonCounts: {
          'metadata-updated': 2,
          'missing-draft': 3,
          'new-material': 1,
        },
        staleRefreshCommand: 'node src/index.js update foundation --stale',
        recommendedProfileId: 'jane-doe',
        recommendedLabel: 'Jane Doe (jane-doe)',
        recommendedAction: 'refresh Jane Doe (jane-doe) — reasons missing drafts + metadata-updated; evidence memory 1 (text) | voice 1 (talk) | soul 1 (text) | skills 0',
        recommendedCommand: "node src/index.js update foundation --person 'jane-doe'",
        recommendedPaths: [
          'profiles/jane-doe/memory/long-term/foundation.json',
          'profiles/jane-doe/skills/README.md',
          'profiles/jane-doe/soul/README.md',
          'profiles/jane-doe/voice/README.md',
        ],
        recommendedLatestMaterialAt: '2026-04-16T16:00:00.000Z',
        recommendedLatestMaterialId: '2026-04-16T16-00-00-000Z-talk',
        recommendedLatestMaterialSourcePath: 'profiles/jane-doe/materials/2026-04-16T16-00-00-000Z-talk.json',
        recommendedDraftSourcesSummary: null,
        recommendedCandidateSignalSummary: 'memory 1 (text) | voice 1 (talk) | soul 1 (text) | skills 0',
        recommendedDraftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.) | soul 1/3 ready (core-truths), missing boundaries/continuity | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints',
        helperCommands: {
          refreshStale: 'node src/index.js update foundation --stale',
          refreshBundle: "(node src/index.js update foundation --person 'jane-doe') && (node src/index.js update foundation --person 'harry-han') && (node src/index.js update foundation --person sam-lane)",
        },
        queuedProfiles: [
          {
            id: 'jane-doe',
            label: 'Jane Doe (jane-doe)',
            status: 'needs-refresh',
            generatedDraftCount: 0,
            expectedDraftCount: 4,
            missingDrafts: ['memory', 'skills', 'soul', 'voice'],
            latestMaterialAt: '2026-04-16T16:00:00.000Z',
            latestMaterialId: '2026-04-16T16-00-00-000Z-talk',
            refreshReasons: ['missing drafts', 'metadata-updated'],
            candidateSignalSummary: 'memory 1 (text) | voice 1 (talk) | soul 1 (text) | skills 0',
            draftGapSummary: 'memory missing, 1 candidate (Tight loops beat big plans.) | soul 1/3 ready (core-truths), missing boundaries/continuity | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints',
          },
          {
            id: 'harry-han',
            label: 'Harry Han (harry-han)',
            status: 'needs-refresh',
            generatedDraftCount: 2,
            expectedDraftCount: 4,
            missingDrafts: ['memory', 'skills'],
            latestMaterialAt: '2026-04-16T15:00:00.000Z',
            latestMaterialId: '2026-04-16T15-00-00-000Z-message',
            refreshReasons: ['missing drafts', 'new materials'],
          },
          {
            id: 'sam-lane',
            label: 'Sam Lane (sam-lane)',
            status: 'needs-refresh',
            generatedDraftCount: 1,
            expectedDraftCount: 4,
            missingDrafts: ['memory', 'skills', 'soul'],
            refreshReasons: ['missing drafts', 'metadata-updated'],
          },
        ],
      },
    },
  });
  const systemPrompt = prompt.buildSystemPrompt();
  const preview = prompt.buildPreview(120000);

  assert.match(systemPrompt, /- next refresh: refresh Jane Doe \(jane-doe\) — reasons missing drafts \+ metadata-updated; evidence memory 1 \(text\) \| voice 1 \(talk\) \| soul 1 \(text\) \| skills 0; command node src\/index\.js update foundation --person 'jane-doe' @ profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md; latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\) @ profiles\/jane-doe\/materials\/2026-04-16T16-00-00-000Z-talk\.json; gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| soul 1\/3 ready \(core-truths\), missing boundaries\/continuity \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints/);
  assert.match(systemPrompt, /- Jane Doe \(jane-doe\): needs-refresh, 0\/4 drafts generated, missing memory\/skills\/soul\/voice, latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\), reasons missing drafts \+ metadata-updated, evidence memory 1 \(text\) \| voice 1 \(talk\) \| soul 1 \(text\) \| skills 0/);
  assert.match(systemPrompt, /- Jane Doe \(jane-doe\): needs-refresh, 0\/4 drafts generated, missing memory\/skills\/soul\/voice, latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\), reasons missing drafts \+ metadata-updated, evidence memory 1 \(text\) \| voice 1 \(talk\) \| soul 1 \(text\) \| skills 0, gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| soul 1\/3 ready \(core-truths\), missing boundaries\/continuity \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints/);
  assert.match(systemPrompt, /- Harry Han \(harry-han\): needs-refresh, 2\/4 drafts generated, missing memory\/skills, latest material 2026-04-16T15:00:00\.000Z \(2026-04-16T15-00-00-000Z-message\), reasons missing drafts \+ new materials/);
  assert.match(systemPrompt, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh\]/);
  assert.doesNotMatch(systemPrompt, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh, 1\/4 drafts/);
  assert.doesNotMatch(systemPrompt, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh, missing memory\/skills\/soul/);
  assert.doesNotMatch(systemPrompt, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh, .*reasons/);
  assert.doesNotMatch(systemPrompt, /- Sam Lane \(sam-lane\): needs-refresh, 1\/4 drafts generated/);

  assert.match(preview, /Foundation maintenance:\n- 0 ready, 3 queued for refresh, 3 incomplete/);
  assert.match(preview, /- next refresh: refresh Jane Doe \(jane-doe\) — reasons missing drafts \+ metadata-updated; evidence memory 1 \(text\) \| voice 1 \(talk\) \| soul 1 \(text\) \| skills 0; command node src\/index\.js update foundation --person 'jane-doe' @ profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md; latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\) @ profiles\/jane-doe\/materials\/2026-04-16T16-00-00-000Z-talk\.json; gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| soul 1\/3 ready \(core-truths\), missing boundaries\/continuity \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints/);
  assert.match(preview, /- Jane Doe \(jane-doe\): needs-refresh, 0\/4 drafts generated, missing memory\/skills\/soul\/voice, latest material 2026-04-16T16:00:00\.000Z \(2026-04-16T16-00-00-000Z-talk\), reasons missing drafts \+ metadata-updated, evidence memory 1 \(text\) \| voice 1 \(talk\) \| soul 1 \(text\) \| skills 0, gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| soul 1\/3 ready \(core-truths\), missing boundaries\/continuity \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints/);
  assert.match(preview, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh\]/);
  assert.doesNotMatch(preview, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh, 1\/4 drafts/);
  assert.doesNotMatch(preview, /- \+1 more queued profile: Sam Lane \(sam-lane\) \[needs-refresh, missing memory\/skills\/soul/);
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
      updateProfileBundleCommand: "(node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe') && (node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.')",
      updateProfileAndRefreshBundleCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
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
          refreshFoundationCommand: "node src/index.js update foundation --person 'jane-doe'",
          updateProfileCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'",
          updateProfileAndRefreshCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
          importCommands: {
            text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
            message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
            talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
            screenshot: "node src/index.js import screenshot --person jane-doe --file 'profiles/jane-doe/imports/images/chat.png' --refresh-foundation",
          },
          importMaterialCommand: null,
        },
        {
          personId: 'metadata-only',
          label: 'Metadata Only (metadata-only)',
          materialCount: 0,
          materialTypes: {},
          latestMaterialAt: null,
          latestMaterialId: null,
          latestMaterialSourcePath: null,
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
          latestMaterialId: null,
          latestMaterialSourcePath: null,
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
            screenshot: "node src/index.js import screenshot --person harry-han --file 'profiles/harry-han/imports/images/chat.png' --refresh-foundation",
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
  assert.match(prompt, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest 2026-04-16T16:00:00\.000Z \| refresh node src\/index\.js update foundation --person 'jane-doe' \| sync node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation/);
  assert.match(prompt, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\); scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' \| import node src\/index\.js import message --person metadata-only --text <message> --refresh-foundation \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(prompt, /\+1 more profile: Harry Han \(harry-han\) \[intake ready\]/);
  assert.match(prompt, /Delivery foundation:/);
  assert.match(prompt, /channels: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Slack \[planned\] via events-api\/web-api -> thread-reply @ \/hooks\/slack\/events \[bot-token: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET\]/);
  assert.match(prompt, /models: 2 total \(1 active, 1 planned, 0 candidate\)/);
  assert.match(prompt, /Anthropic \[active\] default claude-3.7-sonnet \[ANTHROPIC_API_KEY\] \{chat, long-context, vision\}/);
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
      blockedPriorityCount: 0,
      currentPriority: {
        id: 'ingestion',
        label: 'Ingestion',
        status: 'queued',
        summary: '0 imported, 0 metadata-only, drafts 0 ready, 0 queued for refresh',
        nextAction: 'bootstrap a target profile',
        command: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
        editPath: 'profiles/harry-han/imports/materials.template.json',
        editPaths: ['profiles/harry-han/imports/materials.template.json'],
        inspectCommand: "node src/index.js import intake --person 'harry-han'",
        followUpCommand: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
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
          summary: '0 imported, 0 metadata-only, drafts 0 ready, 0 queued for refresh',
          nextAction: 'bootstrap a target profile',
          command: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
          editPath: 'profiles/harry-han/imports/materials.template.json',
          inspectCommand: "node src/index.js import intake --person 'harry-han'",
          followUpCommand: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
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
  assert.match(prompt, /current: Ingestion \[queued\] — 0 imported, 0 metadata-only, drafts 0 ready, 0 queued for refresh/);
  assert.match(prompt, /next action: bootstrap a target profile/);
  assert.match(prompt, /command: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(prompt, /edit: profiles\/harry-han\/imports\/materials\.template\.json/);
  assert.match(prompt, /inspect after editing: node src\/index\.js import intake --person 'harry-han'/);
  assert.match(prompt, /then run: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(prompt, /order: foundation:ready \| ingestion:queued \| channels:queued \| providers:queued/);
});

test('PromptAssembler keeps unknown-timestamp latest-material provenance visible across current, runnable, and advisory work-loop lanes', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: { channelCount: 0, channels: [] },
    models: { providerCount: 0, providers: [] },
    workLoop: {
      intervalMinutes: 10,
      priorityCount: 4,
      readyPriorityCount: 1,
      queuedPriorityCount: 2,
      blockedPriorityCount: 1,
      leadingPriority: {
        id: 'foundation',
        label: 'Foundation',
        status: 'queued',
        summary: 'core 4/4 ready; profiles 1 queued for refresh, 1 incomplete',
        nextAction: 'refresh Jane Doe (jane-doe)',
        command: null,
        paths: ['profiles/jane-doe/voice/README.md'],
      },
      currentPriority: {
        id: 'foundation',
        label: 'Foundation',
        status: 'queued',
        summary: 'core 4/4 ready; profiles 1 queued for refresh, 1 incomplete',
        nextAction: 'refresh Jane Doe (jane-doe)',
        command: null,
        latestMaterialSourcePath: 'profiles/jane-doe/imports/images/chat.png',
        paths: ['profiles/jane-doe/voice/README.md'],
      },
      runnablePriority: {
        id: 'channels',
        label: 'Channels',
        status: 'blocked',
        summary: '4 pending, 0 configured, 4 auth-blocked',
        nextAction: 'copy .env.example to .env before adding secrets',
        command: 'cp .env.example .env',
        latestMaterialSourcePath: '.env.example',
        paths: ['.env.example', '.env'],
      },
      actionableReadyPriority: {
        id: 'ingestion',
        label: 'Ingestion',
        status: 'ready',
        summary: 'starter scaffold available',
        nextAction: 'populate the checked-in starter manifest',
        command: null,
        latestMaterialSourcePath: 'profiles/harry-han/imports/materials.template.json',
        paths: ['profiles/harry-han/imports/materials.template.json'],
      },
      recommendedPriority: {
        id: 'channels',
        label: 'Channels',
        status: 'blocked',
        summary: '4 pending, 0 configured, 4 auth-blocked',
        nextAction: 'copy .env.example to .env before adding secrets',
        command: 'cp .env.example .env',
        latestMaterialSourcePath: '.env.example',
        paths: ['.env.example', '.env'],
      },
      priorities: [
        {
          id: 'foundation',
          label: 'Foundation',
          status: 'queued',
          summary: 'core 4/4 ready; profiles 1 queued for refresh, 1 incomplete',
          nextAction: 'refresh Jane Doe (jane-doe)',
          command: null,
          latestMaterialSourcePath: 'profiles/jane-doe/imports/images/chat.png',
          paths: ['profiles/jane-doe/voice/README.md'],
        },
        {
          id: 'ingestion',
          label: 'Ingestion',
          status: 'ready',
          summary: 'starter scaffold available',
          nextAction: 'populate the checked-in starter manifest',
          command: null,
          latestMaterialSourcePath: 'profiles/harry-han/imports/materials.template.json',
          paths: ['profiles/harry-han/imports/materials.template.json'],
        },
        {
          id: 'channels',
          label: 'Channels',
          status: 'blocked',
          summary: '4 pending, 0 configured, 4 auth-blocked',
          nextAction: 'copy .env.example to .env before adding secrets',
          command: 'cp .env.example .env',
          latestMaterialSourcePath: '.env.example',
          paths: ['.env.example', '.env'],
        },
        {
          id: 'providers',
          label: 'Providers',
          status: 'queued',
          summary: '6 pending, 0 configured, 6 auth-blocked',
          nextAction: 'set OPENAI_API_KEY for gpt-5',
          command: null,
          paths: ['src/models/openai.js'],
        },
      ],
    },
  }).buildSystemPrompt();

  assert.match(prompt, /latest material: unknown timestamp @ profiles\/jane-doe\/imports\/images\/chat\.png/);
  assert.match(prompt, /runnable latest material: unknown timestamp @ \.env\.example/);
  assert.match(prompt, /advisory latest material: unknown timestamp @ profiles\/harry-han\/imports\/materials\.template\.json/);
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
            totalSectionCount: 4,
            readySections: ['core-truths'],
            missingSections: ['boundaries', 'vibe', 'continuity'],
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
      },
    ],
  }).buildSystemPrompt();

  assert.match(prompt, /voice highlights: Tight loops beat big plans\./);
  assert.match(prompt, /soul highlights: Tight loops beat big plans\./);
  assert.match(prompt, /skills signals: feedback-loop heuristic/);
  assert.match(prompt, /draft gaps: memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills 1\/3 ready \(candidate-skills\), missing evidence\/gaps-to-validate \| soul 1\/4 ready \(core-truths\), missing boundaries\/vibe\/continuity \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints/);
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

test('buildSummary exposes machine-readable profile foundation snapshots for empty repos', () => {
  const rootDir = makeTempRepo();

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.profileSnapshots, []);
});

test('buildProfileSnapshotSummaries exposes draft files, source provenance, gap summaries, and layer highlights without parsing snapshot text', () => {
  const [snapshot] = buildProfileSnapshotSummaries([
    {
      id: 'jane-doe',
      materialCount: 2,
      materialTypes: { message: 1, talk: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      profile: {
        displayName: 'Jane Doe',
        summary: 'Direct operator with strong execution taste.',
      },
      foundationDraftStatus: {
        generatedAt: '2026-04-20T12:05:00.000Z',
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory'],
      },
      foundationDraftSummaries: {
        memory: {
          generated: true,
          path: 'profiles/jane-doe/memory/long-term/foundation.json',
          generatedAt: '2026-04-20T12:05:00.000Z',
          latestMaterialAt: '2026-04-20T12:00:00.000Z',
          latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
          sourceCount: 2,
          materialTypes: { message: 1, talk: 1 },
          entryCount: 1,
          latestSummaries: ['Push the work loop forward.'],
        },
        voice: {
          generated: true,
          path: 'profiles/jane-doe/voice/README.md',
          generatedAt: '2026-04-20T12:05:00.000Z',
          latestMaterialAt: '2026-04-20T12:00:00.000Z',
          latestMaterialId: '2026-04-20T12-00-00-000Z-message',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/voice-note.txt',
          sourceCount: 2,
          materialTypes: { message: 1, talk: 1 },
          highlights: ['- keep it tight'],
          readySectionCount: 4,
          totalSectionCount: 4,
          readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
          missingSections: [],
          headingAliases: ['voice-should-capture->signature-moves'],
        },
        soul: {
          generated: true,
          path: 'profiles/jane-doe/soul/README.md',
          generatedAt: '2026-04-20T12:05:00.000Z',
          latestMaterialAt: '2026-04-20T12:00:00.000Z',
          latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
          sourceCount: 1,
          materialTypes: { talk: 1 },
          highlights: ['- stay grounded'],
          readySectionCount: 3,
          totalSectionCount: 4,
          readySections: ['core-truths', 'boundaries', 'vibe'],
          missingSections: ['continuity'],
          headingAliases: ['core-values->core-truths'],
        },
        skills: {
          generated: true,
          path: 'profiles/jane-doe/skills/README.md',
          generatedAt: '2026-04-20T12:05:00.000Z',
          latestMaterialAt: '2026-04-20T12:00:00.000Z',
          latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
          latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
          sourceCount: 1,
          materialTypes: { talk: 1 },
          highlights: ['- execution heuristic', '- sample: ignore me'],
          readySectionCount: 2,
          totalSectionCount: 2,
          readySections: ['what-lives-here', 'layout'],
          missingSections: [],
        },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Push the work loop forward.'] },
        voice: { candidateCount: 1, sampleExcerpts: ['fallback voice'] },
        soul: { candidateCount: 1, sampleExcerpts: ['fallback soul'] },
        skills: { candidateCount: 1, sampleExcerpts: ['fallback skill'] },
      },
    },
  ]);

  assert.equal(snapshot.materialCount, 2);
  assert.deepEqual(snapshot.materialTypes, { message: 1, talk: 1 });
  assert.equal(snapshot.latestMaterialAt, '2026-04-20T12:00:00.000Z');
  assert.equal(snapshot.profileSummary, 'Direct operator with strong execution taste.');
  assert.deepEqual(snapshot.draftStatus, {
    generatedAt: '2026-04-20T12:05:00.000Z',
    complete: false,
    needsRefresh: true,
    missingDrafts: ['memory'],
    refreshReasons: [],
  });
  assert.deepEqual(snapshot.readiness, {
    memory: { candidateCount: 1, sampleSummaries: ['Push the work loop forward.'] },
    voice: { candidateCount: 1, sampleExcerpts: ['fallback voice'] },
    soul: { candidateCount: 1, sampleExcerpts: ['fallback soul'] },
    skills: { candidateCount: 1, sampleExcerpts: ['fallback skill'] },
  });
  assert.deepEqual(snapshot.draftFiles, {
    memory: 'profiles/jane-doe/memory/long-term/foundation.json',
    skills: 'profiles/jane-doe/skills/README.md',
    soul: 'profiles/jane-doe/soul/README.md',
    voice: 'profiles/jane-doe/voice/README.md',
  });
  assert.deepEqual(snapshot.draftSources, {
    memory: {
      path: 'profiles/jane-doe/memory/long-term/foundation.json',
      generated: true,
      generatedAt: '2026-04-20T12:05:00.000Z',
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
      latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
      sourceCount: 2,
      materialTypes: { message: 1, talk: 1 },
      entryCount: 1,
    },
    skills: {
      path: 'profiles/jane-doe/skills/README.md',
      generated: true,
      generatedAt: '2026-04-20T12:05:00.000Z',
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
      latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
      sourceCount: 1,
      materialTypes: { talk: 1 },
    },
    soul: {
      path: 'profiles/jane-doe/soul/README.md',
      generated: true,
      generatedAt: '2026-04-20T12:05:00.000Z',
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-talk',
      latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
      sourceCount: 1,
      materialTypes: { talk: 1 },
    },
    voice: {
      path: 'profiles/jane-doe/voice/README.md',
      generated: true,
      generatedAt: '2026-04-20T12:05:00.000Z',
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      latestMaterialId: '2026-04-20T12-00-00-000Z-message',
      latestMaterialSourcePath: 'profiles/jane-doe/imports/voice-note.txt',
      sourceCount: 2,
      materialTypes: { message: 1, talk: 1 },
    },
  });
  assert.deepEqual(snapshot.draftSections, {
    skills: {
      generated: true,
      readySectionCount: 2,
      totalSectionCount: 2,
      readySections: ['what-lives-here', 'layout'],
      missingSections: [],
    },
    soul: {
      generated: true,
      readySectionCount: 3,
      totalSectionCount: 4,
      readySections: ['core-truths', 'boundaries', 'vibe'],
      missingSections: ['continuity'],
      headingAliases: ['core-values->core-truths'],
    },
    voice: {
      generated: true,
      readySectionCount: 4,
      totalSectionCount: 4,
      readySections: ['tone', 'signature-moves', 'avoid', 'language-hints'],
      missingSections: [],
      headingAliases: ['voice-should-capture->signature-moves'],
    },
  });
  assert.equal(snapshot.draftGapCount, 2);
  assert.deepEqual(snapshot.draftGapCounts, {
    memory: 1,
    soul: 1,
  });
  assert.equal(
    snapshot.draftGapSummary,
    'memory missing, 1 candidate (Push the work loop forward.) | soul 3/4 ready (core-truths, boundaries, vibe), missing continuity; aliases core-values->core-truths',
  );
  assert.deepEqual(snapshot.draftGaps, [
    'memory missing, 1 candidate (Push the work loop forward.)',
    'soul 3/4 ready (core-truths, boundaries, vibe), missing continuity; aliases core-values->core-truths',
  ]);
  assert.deepEqual(snapshot.highlights, {
    memory: ['Push the work loop forward.'],
    voice: ['keep it tight'],
    soul: ['stay grounded'],
    skills: ['execution heuristic'],
  });
  assert.match(snapshot.snapshot, /draft files: memory @ profiles\/jane-doe\/memory\/long-term\/foundation\.json/);
  assert.match(snapshot.snapshot, /draft sections: skills 2\/2 ready \(what-lives-here, layout\) \| soul 3\/4 ready \(core-truths, boundaries, vibe\), missing continuity; aliases core-values->core-truths \| voice 4\/4 ready \(tone, signature-moves, avoid, language-hints\); aliases voice-should-capture->signature-moves/);
  assert.match(
    snapshot.snapshot,
    /draft sources: memory 2 sources \(message:1, talk:1\), 1 entry, latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| skills 1 source \(talk:1\), latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| soul 1 source \(talk:1\), latest @ profiles\/jane-doe\/imports\/call-notes\.txt \| voice 2 sources \(message:1, talk:1\), latest @ profiles\/jane-doe\/imports\/voice-note\.txt/,
  );
  assert.match(snapshot.snapshot, /refresh paths: profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md/);
  assert.match(snapshot.snapshot, /draft gaps: memory missing, 1 candidate \(Push the work loop forward\.\) \| soul 3\/4 ready \(core-truths, boundaries, vibe\), missing continuity; aliases core-values->core-truths/);
});

test('buildProfileSnapshotSummaries humanizes slug-only profile ids when display names are missing', () => {
  const [snapshot] = buildProfileSnapshotSummaries([
    {
      id: 'jane-doe',
      materialCount: 1,
      materialTypes: { message: 1 },
      latestMaterialAt: '2026-04-20T12:00:00.000Z',
      profile: {
        summary: 'Direct operator with strong execution taste.',
      },
    },
  ]);

  assert.equal(snapshot.label, 'Jane Doe (jane-doe)');
  assert.match(snapshot.snapshot, /^- Jane Doe \(jane-doe\): 1 material \(message:1\)/);
});

test('buildProfileSnapshotSummaries keeps stale draft source paths visible in the prompt snapshot', () => {
  const [snapshot] = buildProfileSnapshotSummaries([
    {
      id: 'jane-doe',
      materialCount: 1,
      materialTypes: { talk: 1 },
      foundationDraftStatus: {
        complete: false,
        needsRefresh: true,
        missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      },
      foundationDraftSummaries: {
        memory: {
          generated: false,
          path: 'profiles/jane-doe/memory/long-term/foundation.json',
          latestSummaries: [],
        },
        voice: {
          generated: false,
          path: 'profiles/jane-doe/voice/README.md',
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['tone'],
          missingSections: ['signature-moves', 'avoid', 'language-hints'],
          highlights: [],
        },
        soul: {
          generated: false,
          path: 'profiles/jane-doe/soul/README.md',
          readySectionCount: 1,
          totalSectionCount: 4,
          readySections: ['core-truths'],
          missingSections: ['boundaries', 'vibe', 'continuity'],
          highlights: [],
        },
        skills: {
          generated: false,
          path: 'profiles/jane-doe/skills/README.md',
          readySectionCount: 1,
          totalSectionCount: 3,
          readySections: ['candidate-skills'],
          missingSections: ['evidence', 'gaps-to-validate'],
          highlights: [],
        },
      },
      foundationReadiness: {
        memory: { candidateCount: 1, sampleSummaries: ['Keep the loop tight | but honest.'] },
      },
    },
  ]);

  assert.deepEqual(snapshot.draftStatus, {
    complete: false,
    needsRefresh: true,
    missingDrafts: ['memory', 'skills', 'soul', 'voice'],
    refreshReasons: [],
  });
  assert.deepEqual(snapshot.readiness, {
    memory: { candidateCount: 1, sampleSummaries: ['Keep the loop tight | but honest.'] },
    voice: {},
    soul: {},
    skills: {},
  });
  assert.deepEqual(snapshot.draftFiles, {
    memory: 'profiles/jane-doe/memory/long-term/foundation.json',
    skills: 'profiles/jane-doe/skills/README.md',
    soul: 'profiles/jane-doe/soul/README.md',
    voice: 'profiles/jane-doe/voice/README.md',
  });
  assert.deepEqual(snapshot.draftSources, {
    memory: {
      path: 'profiles/jane-doe/memory/long-term/foundation.json',
      generated: false,
    },
    skills: {
      path: 'profiles/jane-doe/skills/README.md',
      generated: false,
    },
    soul: {
      path: 'profiles/jane-doe/soul/README.md',
      generated: false,
    },
    voice: {
      path: 'profiles/jane-doe/voice/README.md',
      generated: false,
    },
  });
  assert.deepEqual(snapshot.draftSections, {
    skills: {
      generated: false,
      readySectionCount: 1,
      totalSectionCount: 3,
      readySections: ['candidate-skills'],
      missingSections: ['evidence', 'gaps-to-validate'],
    },
    soul: {
      generated: false,
      readySectionCount: 1,
      totalSectionCount: 4,
      readySections: ['core-truths'],
      missingSections: ['boundaries', 'vibe', 'continuity'],
    },
    voice: {
      generated: false,
      readySectionCount: 1,
      totalSectionCount: 4,
      readySections: ['tone'],
      missingSections: ['signature-moves', 'avoid', 'language-hints'],
    },
  });
  assert.equal(snapshot.draftGapCount, 9);
  assert.deepEqual(snapshot.draftGapCounts, {
    memory: 1,
    skills: 2,
    soul: 3,
    voice: 3,
  });
  assert.equal(
    snapshot.draftGapSummary,
    'memory missing, 1 candidate (Keep the loop tight | but honest.) | skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate | soul 1/4 ready (core-truths), missing boundaries/vibe/continuity | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints',
  );
  assert.doesNotMatch(snapshot.snapshot, /draft files:/);
  assert.match(snapshot.snapshot, /draft sections: skills 1\/3 ready \(candidate-skills\), missing evidence\/gaps-to-validate \| soul 1\/4 ready \(core-truths\), missing boundaries\/vibe\/continuity \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints/);
  assert.match(snapshot.snapshot, /draft sources: memory @ profiles\/jane-doe\/memory\/long-term\/foundation\.json \| skills @ profiles\/jane-doe\/skills\/README\.md \| soul @ profiles\/jane-doe\/soul\/README\.md \| voice @ profiles\/jane-doe\/voice\/README\.md/);
  assert.deepEqual(snapshot.draftGaps, [
    'memory missing, 1 candidate (Keep the loop tight | but honest.)',
    'skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate',
    'soul 1/4 ready (core-truths), missing boundaries/vibe/continuity',
    'voice 1/4 ready (tone), missing signature-moves/avoid/language-hints',
  ]);
  assert.match(snapshot.snapshot, /draft gaps: memory missing, 1 candidate \(Keep the loop tight \| but honest\.\)/);
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
  assert.deepEqual((profile.foundationDraftSummaries.voice as any).missingSections ?? [], []);
  assert.deepEqual((profile.foundationDraftSummaries.soul as any).missingSections ?? [], []);
  assert.deepEqual((profile.foundationDraftSummaries.skills as any).missingSections ?? [], []);
});

test('loadProfilesIndex ignores heading-only and fenced template sections when evaluating profile foundation drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importTalkSnippet({
    personId: 'Jane Doe',
    text: 'Tight loops beat big plans.',
    notes: 'execution heuristic',
  });
  ingestion.updateProfile({
    personId: 'Jane Doe',
    displayName: 'Jane Doe',
    summary: 'Imported materials waiting on a refresh.',
  });

  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'soul'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'skills'), { recursive: true });

  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'jane-doe', 'voice', 'README.md'),
    [
      '# Voice draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Imported materials waiting on a refresh.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Tone',
      '',
      '```md',
      '## Signature moves',
      '- Example template only.',
      '',
      '## Avoid',
      '- Example template only.',
      '',
      '## Language hints',
      '- Example template only.',
      '```',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'jane-doe', 'soul', 'README.md'),
    [
      '# Soul draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Imported materials waiting on a refresh.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Core values',
      '- Tight loops beat big plans.',
      '',
      '~~~md',
      '## Boundaries',
      '- Example template only.',
      '',
      '## Decision rules',
      '- Example template only.',
      '~~~',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'jane-doe', 'skills', 'README.md'),
    [
      '# Skills draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Imported materials waiting on a refresh.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Candidate skills',
      '',
      '```md',
      '## Evidence',
      '- Example template only.',
      '',
      '## Gaps to validate',
      '- Example template only.',
      '```',
    ].join('\n'),
  );

  const [profile] = loader.loadProfilesIndex();
  const summary = buildSummary(rootDir);

  assert.equal(profile.foundationDraftStatus.complete, false);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, ['memory', 'skills', 'soul', 'voice']);
  assert.equal(profile.foundationDraftSummaries.voice.generated, false);
  assert.deepEqual((profile.foundationDraftSummaries.voice as any).readySections ?? [], []);
  assert.deepEqual((profile.foundationDraftSummaries.voice as any).missingSections ?? [], ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.equal(profile.foundationDraftSummaries.soul.generated, false);
  assert.deepEqual((profile.foundationDraftSummaries.soul as any).readySections ?? [], ['core-truths']);
  assert.deepEqual((profile.foundationDraftSummaries.soul as any).missingSections ?? [], ['boundaries', 'vibe', 'continuity']);
  assert.equal(profile.foundationDraftSummaries.skills.generated, false);
  assert.deepEqual((profile.foundationDraftSummaries.skills as any).readySections ?? [], []);
  assert.deepEqual((profile.foundationDraftSummaries.skills as any).missingSections ?? [], ['candidate-skills', 'evidence', 'gaps-to-validate']);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\).*gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills 0\/3 ready, missing candidate-skills\/evidence\/gaps-to-validate \| soul 1\/4 ready \(core-truths\), missing boundaries\/vibe\/continuity; aliases core-values->core-truths \| voice 0\/4 ready, missing tone\/signature-moves\/avoid\/language-hints/);
});

test('loadProfilesIndex ignores indented template sections when evaluating profile foundation drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importTalkSnippet({
    personId: 'Jane Doe',
    text: 'Tight loops beat big plans.',
    notes: 'execution heuristic',
  });
  ingestion.updateProfile({
    personId: 'Jane Doe',
    displayName: 'Jane Doe',
    summary: 'Imported materials waiting on a refresh.',
  });

  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'soul'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'skills'), { recursive: true });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'jane-doe', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'jane-doe', 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', 'jane-doe', 'skills', 'README.md');

  fs.writeFileSync(
    voiceDraftPath,
    [
      '# Voice draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Imported materials waiting on a refresh.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '>     ## Tone',
      '>     - Example template only.',
      '',
      '## Signature moves',
      '- Lead with the operating takeaway.',
      '',
      '    ## Avoid',
      '    - Example template only.',
      '',
      '\t## Language hints',
      '\t- Example template only.',
    ].join('\n'),
  );
  fs.writeFileSync(
    soulDraftPath,
    [
      '# Soul draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Imported materials waiting on a refresh.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Core values',
      '- Tight loops beat big plans.',
      '',
      '    ## Boundaries',
      '    - Example template only.',
      '',
      '>     ## Vibe',
      '>     - Example template only.',
      '',
      '\t## Decision rules',
      '\t- Example template only.',
    ].join('\n'),
  );
  fs.writeFileSync(
    skillsDraftPath,
    [
      '# Skills draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Imported materials waiting on a refresh.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '    ## Candidate skills',
      '    - Example template only.',
      '',
      '>     ## Evidence',
      '>     - Example template only.',
      '',
      '\t## Gaps to validate',
      '\t- Example template only.',
    ].join('\n'),
  );

  assert.equal(hasValidFoundationMarkdownDraft(voiceDraftPath), false);
  assert.equal(hasValidFoundationMarkdownDraft(soulDraftPath), false);
  assert.equal(hasValidFoundationMarkdownDraft(skillsDraftPath), false);

  const [profile] = loader.loadProfilesIndex();
  const summary = buildSummary(rootDir);

  assert.equal(profile.foundationDraftStatus.complete, false);
  assert.equal(profile.foundationDraftStatus.needsRefresh, true);
  assert.deepEqual(profile.foundationDraftStatus.missingDrafts, ['memory', 'skills', 'soul', 'voice']);
  assert.equal(profile.foundationDraftSummaries.voice.generated, false);
  assert.deepEqual((profile.foundationDraftSummaries.voice as any).readySections ?? [], ['signature-moves']);
  assert.deepEqual((profile.foundationDraftSummaries.voice as any).missingSections ?? [], ['tone', 'avoid', 'language-hints']);
  assert.equal(profile.foundationDraftSummaries.soul.generated, false);
  assert.deepEqual((profile.foundationDraftSummaries.soul as any).readySections ?? [], ['core-truths']);
  assert.deepEqual((profile.foundationDraftSummaries.soul as any).missingSections ?? [], ['boundaries', 'vibe', 'continuity']);
  assert.equal(profile.foundationDraftSummaries.skills.generated, false);
  assert.deepEqual((profile.foundationDraftSummaries.skills as any).readySections ?? [], []);
  assert.deepEqual((profile.foundationDraftSummaries.skills as any).missingSections ?? [], ['candidate-skills', 'evidence', 'gaps-to-validate']);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\).*gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills 0\/3 ready, missing candidate-skills\/evidence\/gaps-to-validate \| soul 1\/4 ready \(core-truths\), missing boundaries\/vibe\/continuity; aliases core-values->core-truths \| voice 1\/4 ready \(signature-moves\), missing tone\/avoid\/language-hints/);
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
  assert.equal(profile.materialCount, 1);
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
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'soul'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'skills'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'jane-doe', 'voice', 'README.md'),
    [
      '# Voice draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Not set.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Tone',
      'Keep replies direct.',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'jane-doe', 'soul', 'README.md'),
    [
      '# Soul draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Not set.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Core values',
      '- Tight loops beat big plans.',
      '',
      '## Boundaries',
      '- Avoid planning theater.',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'jane-doe', 'skills', 'README.md'),
    [
      '# Skills draft',
      '',
      'Profile: jane-doe',
      'Display name: Jane Doe',
      'Summary: Not set.',
      'Generated at: 2026-04-16T00:00:00.000Z',
      'Latest material: 2026-04-16T00:00:00.000Z (legacy-talk)',
      'Source materials: 1 (talk:1)',
      '',
      '## Candidate skills',
      '- execution heuristic',
    ].join('\n'),
  );
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
  assert.equal(summary.ingestion.intakeImportAllCommand, 'node src/index.js import intake --all');
  assert.equal(summary.ingestion.intakeImportAllAndRefreshCommand, 'node src/index.js import intake --all --refresh-foundation');
  assert.equal(summary.ingestion.intakeImportStaleCommand, 'node src/index.js import intake --stale');
  assert.equal(summary.ingestion.intakeImportStaleAndRefreshCommand, 'node src/index.js import intake --stale --refresh-foundation');
  assert.equal(summary.ingestion.intakeImportImportedCommand, 'node src/index.js import intake --imported');
  assert.equal(summary.ingestion.intakeImportImportedAndRefreshCommand, 'node src/index.js import intake --imported --refresh-foundation');
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
  assert.equal(summary.ingestion.sampleStarterSource, 'samples/harry-materials.json');
  assert.equal(summary.ingestion.sampleStarterLabel, 'Harry Han (harry-han)');
  assert.equal(summary.ingestion.sampleManifestInspectCommand, "node src/index.js import manifest --file 'samples/harry-materials.json'");
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/harry-materials.json' --refresh-foundation");
  assert.equal(summary.ingestion.sampleTextPath, 'samples/harry-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'harry-han');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.equal(summary.ingestion.refreshAllFoundationCommand, 'node src/index.js update foundation --all');
  assert.equal(summary.ingestion.staleRefreshCommand, 'node src/index.js update foundation --stale');
  assert.equal(summary.ingestion.refreshFoundationBundleCommand, "node src/index.js update foundation --person 'jane-doe'");
  assert.equal(summary.ingestion.recommendedProfileId, 'jane-doe');
  assert.equal(summary.ingestion.recommendedLabel, 'Jane Doe (jane-doe)');
  assert.equal(summary.ingestion.recommendedAction, 'refresh stale or incomplete target profiles');
  assert.equal(summary.ingestion.recommendedCommand, "node src/index.js update foundation --person 'jane-doe'");
  assert.deepEqual(summary.ingestion.recommendedPaths, [
    'profiles/jane-doe/memory/long-term/foundation.json',
    'profiles/jane-doe/skills/README.md',
    'profiles/jane-doe/soul/README.md',
    'profiles/jane-doe/voice/README.md',
  ]);
  assert.deepEqual(summary.ingestion.helperCommands, {
    bootstrap: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
    scaffoldAll: 'node src/index.js update intake --all',
    scaffoldStale: 'node src/index.js update intake --stale',
    scaffoldImported: 'node src/index.js update intake --imported',
    scaffoldBundle: "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    scaffoldImportedBundle: null,
    repairInvalidBundle: null,
    repairImportedInvalidBundle: null,
    importManifest: 'node src/index.js import manifest --file <manifest.json>',
    importManifestAndRefresh: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
    importIntakeAll: 'node src/index.js import intake --all',
    importIntakeAllAndRefresh: 'node src/index.js import intake --all --refresh-foundation',
    importIntakeStale: 'node src/index.js import intake --stale',
    importIntakeStaleAndRefresh: 'node src/index.js import intake --stale --refresh-foundation',
    importIntakeImported: 'node src/index.js import intake --imported',
    importIntakeImportedAndRefresh: 'node src/index.js import intake --imported --refresh-foundation',
    importIntakeBundle: null,
    inspectImportedStarterBundle: "(node src/index.js import intake --person 'jane-doe') && (node src/index.js import intake --person 'harry-han')",
    replayImportedStarterBundle: "(node src/index.js import intake --person 'jane-doe' --refresh-foundation) && (node src/index.js import intake --person 'harry-han' --refresh-foundation)",
    starterImportBundle: "(node src/index.js import text --person jane-doe --file 'profiles/jane-doe/imports/sample.txt' --refresh-foundation) && (node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation)",
    updateProfileBundle: "(node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe') && (node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.')",
    updateProfileAndRefreshBundle: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
    refreshAllFoundation: 'node src/index.js update foundation --all',
    refreshStaleFoundation: 'node src/index.js update foundation --stale',
    refreshFoundationBundle: "node src/index.js update foundation --person 'jane-doe'",
    sampleStarter: 'node src/index.js import sample',
    sampleManifestInspect: "node src/index.js import manifest --file 'samples/harry-materials.json'",
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
  assert.equal(readyProfileCommand?.refreshFoundationCommand, "node src/index.js update foundation --person 'harry-han'");

  assert.deepEqual(janeCommand.materialTypes, { talk: 1 });
  assert.equal(janeCommand.personId, 'jane-doe');
  assert.equal(janeCommand.displayName, 'Jane Doe');
  assert.equal(janeCommand.label, 'Jane Doe (jane-doe)');
  assert.equal(janeCommand.materialCount, 1);
  assert.equal(janeCommand.needsRefresh, true);
  assert.deepEqual(janeCommand.missingDrafts, ['memory', 'skills', 'soul', 'voice']);
  assert.equal(janeCommand.draftGapSummary, 'memory missing, 1 candidate (Tight loops beat big plans.) | skills 1/3 ready (candidate-skills), missing evidence/gaps-to-validate | soul 2/4 ready (core-truths, boundaries), missing vibe/continuity; aliases core-values->core-truths | voice 1/4 ready (tone), missing signature-moves/avoid/language-hints');
  assert.equal(janeCommand.latestMaterialAt, summary.profiles.find((profile) => profile.id === 'jane-doe')?.latestMaterialAt ?? null);
  assert.match(janeCommand.latestMaterialAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(janeCommand.updateProfileCommand, "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'");
  assert.equal(janeCommand.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation");
  assert.equal(janeCommand.refreshFoundationCommand, "node src/index.js update foundation --person 'jane-doe'");
  assert.equal(janeCommand.starterImportCommand, "node src/index.js import text --person jane-doe --file 'profiles/jane-doe/imports/sample.txt' --refresh-foundation");
  assert.equal(janeCommand.importAfterEditingWithoutRefreshCommand, "node src/index.js import intake --person 'jane-doe'");
  assert.equal(janeCommand.importAfterEditingCommand, "node src/index.js import intake --person 'jane-doe' --refresh-foundation");
  assert.equal(janeCommand.importMaterialCommand, null);
  assert.deepEqual(janeCommand.importCommands, {
    text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
    message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
    talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
    screenshot: "node src/index.js import screenshot --person jane-doe --file 'profiles/jane-doe/imports/images/chat.png' --refresh-foundation",
  });
  assert.deepEqual(janeCommand.helperCommands, {
    scaffold: "node src/index.js update intake --person 'jane-doe' --display-name 'Jane Doe'",
    importIntakeWithoutRefresh: null,
    importIntake: null,
    importManifestWithoutRefresh: "node src/index.js import manifest --file 'profiles/jane-doe/imports/materials.template.json'",
    importManifest: "node src/index.js import manifest --file 'profiles/jane-doe/imports/materials.template.json' --refresh-foundation",
    starterImport: "node src/index.js import text --person jane-doe --file 'profiles/jane-doe/imports/sample.txt' --refresh-foundation",
    importAfterEditingWithoutRefresh: "node src/index.js import intake --person 'jane-doe'",
    importAfterEditing: "node src/index.js import intake --person 'jane-doe' --refresh-foundation",
    updateProfile: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
    refreshFoundation: "node src/index.js update foundation --person 'jane-doe'",
    directImports: {
      text: 'node src/index.js import text --person jane-doe --file <sample.txt> --refresh-foundation',
      message: 'node src/index.js import message --person jane-doe --text <message> --refresh-foundation',
      talk: 'node src/index.js import talk --person jane-doe --text <snippet> --refresh-foundation',
      screenshot: "node src/index.js import screenshot --person jane-doe --file 'profiles/jane-doe/imports/images/chat.png' --refresh-foundation",
    },
  });

  assert.deepEqual(metadataOnlyCommand, {
    personId: 'metadata-only',
    displayName: 'Metadata Only',
    label: 'Metadata Only (metadata-only)',
    materialCount: 0,
    materialTypes: {},
    latestMaterialAt: null,
    latestMaterialId: null,
    latestMaterialSourcePath: null,
    needsRefresh: false,
    missingDrafts: [],
    draftGapSummary: null,
    updateProfileCommand: "node src/index.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    updateProfileAndRefreshCommand: null,
    updateIntakeCommand: "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'",
    importIntakeWithoutRefreshCommand: null,
    importIntakeCommand: null,
    starterImportCommand: null,
    followUpImportIntakeWithoutRefreshCommand: null,
    followUpImportIntakeCommand: null,
    importAfterEditingWithoutRefreshCommand: null,
    importAfterEditingCommand: null,
    intakeReady: false,
    intakeCompletion: 'missing',
    intakeStatusSummary: 'missing — create imports, images, README.md, materials.template.json, sample.txt',
    intakeManifestStatus: 'missing',
    intakeManifestPath: 'profiles/metadata-only/imports/materials.template.json',
    intakeManifestError: null,
    intakeManifestEntryTemplateTypes: [],
    intakeManifestEntryTemplateDetails: [],
    intakeManifestEntryTemplateCount: 0,
    intakePaths: [
      'profiles/metadata-only/imports',
      'profiles/metadata-only/imports/images',
      'profiles/metadata-only/imports/README.md',
      'profiles/metadata-only/imports/materials.template.json',
      'profiles/metadata-only/imports/sample.txt',
    ],
    intakeMissingPaths: [
      'profiles/metadata-only/imports',
      'profiles/metadata-only/imports/images',
      'profiles/metadata-only/imports/README.md',
      'profiles/metadata-only/imports/materials.template.json',
      'profiles/metadata-only/imports/sample.txt',
    ],
    importManifestWithoutRefreshCommand: null,
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
      importIntakeWithoutRefresh: null,
      importIntake: null,
      importManifestWithoutRefresh: null,
      importManifest: null,
      starterImport: null,
      importAfterEditingWithoutRefresh: null,
      importAfterEditing: null,
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
  assert.equal(
    summary.workLoop.priorities.find((priority) => priority.id === 'ingestion')?.summary,
    '2 imported, 1 metadata-only, drafts 1 ready, 1 queued for refresh, 2 imported intake starter scaffolds available',
  );
  assert.match(summary.promptPreview, /metadata-only intake scaffolds: 0 import-ready, 0 starter templates, 0 partial, 1 missing/);
  assert.match(summary.promptPreview, /imported intake: 0 ready, 2 starter templates, 0 backfills, 0 invalid manifests/);
  assert.match(summary.promptPreview, /imports: message, screenshot, talk, text/);
  assert.match(summary.promptPreview, /next intake: refresh stale or incomplete target profiles; command node src\/index\.js update foundation --person 'jane-doe'; latest material \d{4}-\d{2}-\d{2}T[^ ]+ \([^)]*\) @ profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md/);
  assert.match(summary.promptPreview, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-all node src\/index\.js update intake --all.*scaffold-stale node src\/index\.js update intake --stale.*scaffold-bundle node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'.*import-imported node src\/index\.js import intake --imported.*import-imported\+refresh node src\/index\.js import intake --imported --refresh-foundation/);
  assert.match(summary.promptPreview, /helpers: .*update-bundle \(node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe'\) && \(node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'\).*sync-bundle node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation/);
  assert.match(summary.promptPreview, /helpers: .*manifest\+refresh node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation.*refresh-bundle node src\/index\.js update foundation --person 'jane-doe'.*sample-message node src\/index\.js import message --person harry-han --text 'Ship the thin slice first\.' --refresh-foundation/);
  assert.match(summary.promptPreview, /commands: node src\/index\.js import manifest --file <manifest\.json> \| node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation \| node src\/index\.js update foundation --all \| node src\/index\.js update foundation --stale/);
  assert.match(summary.promptPreview, /sample import: node src\/index\.js import text --person <person-id> --file <sample\.txt> --refresh-foundation/);
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[samples\/harry-materials\.json\] for Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /sample manifest: 2 entries for Harry Han \(harry-han\) \(message:1, text:1\) -> node src\/index\.js import manifest --file 'samples\/harry-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /sample text: harry-han -> node src\/index\.js import text --person harry-han --file 'samples\/harry-post\.txt' --refresh-foundation/);
  assert.match(summary.promptPreview, /Jane Doe \(jane-doe\): 1 material \(talk:1\), latest \d{4}-\d{2}-\d{2}T[^,]+ \([^)]+\)(?: @ [^,]+)?, intake starter template — add entries before import \(templates: message, screenshot, talk, text\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt; gaps memory missing, 1 candidate \(Tight loops beat big plans\.\) \| skills 1\/3 ready \(candidate-skills\), missing evidence\/gaps-to-validate \| soul 2\/4 ready \(core-truths, boundaries\), missing vibe\/continuity; aliases core-values->core-truths \| voice 1\/4 ready \(tone\), missing signature-moves\/avoid\/language-hints \| refresh-intake node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe'(?: --summary 'Tight loops beat big plans\.')? \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/jane-doe\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/jane-doe\/imports\/materials\.template\.json' --refresh-foundation \| inspect-after-edit node src\/index\.js import intake --person 'jane-doe' \| replay-after-edit node src\/index\.js import intake --person 'jane-doe' --refresh-foundation \| import node src\/index\.js import text --person jane-doe --file 'profiles\/jane-doe\/imports\/sample\.txt' --refresh-foundation \| refresh node src\/index\.js update foundation --person 'jane-doe' \| sync node src\/index\.js update profile --person 'jane-doe' --display-name 'Jane Doe'(?: --summary 'Tight loops beat big plans\.')? --refresh-foundation/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake missing — create imports, images, README\.md, materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.' \| import node src\/index\.js import message --person metadata-only --text <message> --refresh-foundation \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
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

  assert.equal(summary.ingestion.importedIntakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.importedStarterIntakeProfileCount, 1);
  assert.equal(summary.ingestion.inspectImportedStarterBundleCommand, null);
  assert.equal(summary.ingestion.replayImportedStarterBundleCommand, null);
  assert.equal(summary.ingestion.starterImportBundleCommand, null);
  assert.equal(summary.ingestion.helperCommands?.inspectImportedStarterBundle, null);
  assert.equal(summary.ingestion.helperCommands?.replayImportedStarterBundle, null);
  assert.equal(summary.ingestion.helperCommands?.starterImportBundle, null);
  assert.equal(summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han')?.starterImportCommand, "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation");
  assert.equal(summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han')?.importManifestWithoutRefreshCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'");
  assert.equal(summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han')?.importManifestCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.equal(summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han')?.followUpImportIntakeWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han')?.followUpImportIntakeCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.match(summary.promptPreview, /imported intake: 0 ready, 1 starter template, 0 backfills, 0 invalid manifests/);
  assert.doesNotMatch(summary.promptPreview, /intake missing — create imports/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^,]+ \([^)]+\)(?: @ [^,]+)?, intake starter template — add entries before import \(templates: message, screenshot, talk, text\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt; gaps memory missing, 1 candidate \(Ship the first slice before polishing the plan\.\) \| refresh-intake node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.' \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation \| inspect-after-edit node src\/index\.js import intake --person 'harry-han' \| replay-after-edit node src\/index\.js import intake --person 'harry-han' --refresh-foundation \| import node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation \| refresh node src\/index\.js update foundation --person 'harry-han' \| sync node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.' --refresh-foundation/);
});

test('buildSummary recommends populating imported starter intake manifests once drafts are fresh', () => {
  const rootDir = makeTempRepo();

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the first slice before polishing the plan.\n');
  const ingestion = new MaterialIngestion(rootDir);
  ingestion.importTextDocument({
    personId: 'harry-han',
    sourceFile: path.join(rootDir, 'samples', 'harry-post.txt'),
  });
  ingestion.refreshFoundationDrafts({ personId: 'harry-han' });

  const summary = buildSummary(rootDir);
  const harry = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');

  assert.ok(harry);
  assert.equal(summary.ingestion.importedIntakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.importedStarterIntakeProfileCount, 1);
  assert.equal(harry.importAfterEditingWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(harry.importAfterEditingCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.equal(harry.helperCommands?.importAfterEditingWithoutRefresh, "node src/index.js import intake --person 'harry-han'");
  assert.equal(harry.helperCommands?.importAfterEditing, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.equal(summary.ingestion.recommendedProfileId, 'harry-han');
  assert.equal(summary.ingestion.recommendedLabel, 'Harry Han (harry-han)');
  assert.equal(summary.ingestion.recommendedAction, 'populate the imported intake starter manifest for Harry Han (harry-han)');
  assert.equal(summary.ingestion.recommendedLatestMaterialAt, harry.latestMaterialAt);
  assert.equal(summary.ingestion.recommendedLatestMaterialId, harry.latestMaterialId);
  assert.equal(summary.ingestion.recommendedLatestMaterialSourcePath, harry.latestMaterialSourcePath);
  assert.equal(summary.ingestion.recommendedCommand, null);
  assert.equal(summary.ingestion.inspectImportedStarterBundleCommand, null);
  assert.equal(summary.ingestion.replayImportedStarterBundleCommand, null);
  assert.equal(summary.ingestion.starterImportBundleCommand, null);
  assert.equal(summary.ingestion.helperCommands?.inspectImportedStarterBundle, null);
  assert.equal(summary.ingestion.helperCommands?.replayImportedStarterBundle, null);
  assert.equal(summary.ingestion.helperCommands?.starterImportBundle, null);
  assert.equal(
    summary.ingestion.recommendedFallbackCommand,
    "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation",
  );
  assert.equal(summary.ingestion.recommendedEditPath, 'profiles/harry-han/imports/materials.template.json');
  assert.deepEqual(summary.ingestion.recommendedEditPaths, [
    'profiles/harry-han/imports/materials.template.json',
    'profiles/harry-han/imports/images/chat.png',
    'profiles/harry-han/imports/sample.txt',
  ]);
  assert.match(
    summary.ingestion.recommendedRefreshIntakeCommand ?? '',
    /^node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'(?: --summary '.*')?$/,
  );
  assert.equal(summary.ingestion.recommendedManifestInspectCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'");
  assert.equal(summary.ingestion.recommendedManifestImportCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.ingestion.recommendedIntakeManifestEntryTemplateTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.deepEqual(summary.ingestion.recommendedIntakeManifestEntryTemplateDetails, [
    { type: 'message', source: 'text', path: null, preview: '<paste a representative short message>' },
    { type: 'screenshot', source: 'file', path: 'images/chat.png', preview: null },
    { type: 'talk', source: 'text', path: null, preview: '<paste a transcript snippet>' },
    { type: 'text', source: 'file', path: 'sample.txt', preview: null },
  ]);
  assert.equal(summary.ingestion.recommendedIntakeManifestEntryTemplateCount, 4);
  assert.equal(
    summary.ingestion.recommendedInspectCommand,
    "node src/index.js import intake --person 'harry-han'",
  );
  assert.equal(
    summary.ingestion.recommendedFollowUpCommand,
    "node src/index.js import intake --person 'harry-han' --refresh-foundation",
  );
  assert.deepEqual(summary.ingestion.recommendedPaths, [
    'profiles/harry-han/imports',
    'profiles/harry-han/imports/images',
    'profiles/harry-han/imports/README.md',
    'profiles/harry-han/imports/materials.template.json',
    'profiles/harry-han/imports/sample.txt',
  ]);
  const expectedLatestMaterialSummary = `latest material ${harry.latestMaterialAt} (${harry.latestMaterialId}) @ ${harry.latestMaterialSourcePath}`;
  assert.ok(
    summary.promptPreview.includes(
      `next intake: populate the imported intake starter manifest for Harry Han (harry-han); ${expectedLatestMaterialSummary}; edit paths profiles/harry-han/imports/materials.template.json, profiles/harry-han/imports/images/chat.png, profiles/harry-han/imports/sample.txt;`,
    ),
  );
  assert.match(
    summary.promptPreview,
    /refresh intake node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'(?: --summary '.*')?; starter templates message, screenshot, talk, text \(4 total\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt; manifest inspect node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json'; manifest node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation; inspect after editing node src\/index\.js import intake --person 'harry-han'; then run node src\/index\.js import intake --person 'harry-han' --refresh-foundation; fallback node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation @ profiles\/harry-han\/imports, profiles\/harry-han\/imports\/images, profiles\/harry-han\/imports\/README\.md, profiles\/harry-han\/imports\/materials\.template\.json, profiles\/harry-han\/imports\/sample\.txt/,
  );
  assert.doesNotMatch(summary.promptPreview, /helpers: .*starter-import-bundle/);
});

test('buildSummary accepts UTF-8 BOM-prefixed imported intake starter manifests', () => {
  const rootDir = makeTempRepo();

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the first slice before polishing the plan.\n');

  const ingestion = new MaterialIngestion(rootDir);
  ingestion.importTextDocument({
    personId: 'harry-han',
    sourceFile: path.join(rootDir, 'samples', 'harry-post.txt'),
  });
  ingestion.refreshFoundationDrafts({ personId: 'harry-han' });

  const intakeManifestPath = path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json');
  fs.writeFileSync(
    intakeManifestPath,
    `\uFEFF${fs.readFileSync(intakeManifestPath, 'utf8')}`,
  );

  const summary = buildSummary(rootDir);
  const harry = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');

  assert.ok(harry);
  assert.equal(harry.intakeManifestStatus, 'starter');
  assert.equal(summary.ingestion.importedStarterIntakeProfileCount, 1);
  assert.equal(summary.ingestion.importedInvalidIntakeManifestProfileCount, 0);
  assert.equal(summary.ingestion.recommendedFallbackCommand, "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation");
  assert.equal(summary.ingestion.recommendedEditPath, 'profiles/harry-han/imports/materials.template.json');
  assert.equal(summary.ingestion.recommendedManifestInspectCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'");
  assert.equal(summary.ingestion.recommendedManifestImportCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.ingestion.recommendedIntakeManifestEntryTemplateTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.deepEqual(summary.ingestion.recommendedIntakeManifestEntryTemplateDetails, [
    { type: 'message', source: 'text', path: null, preview: '<paste a representative short message>' },
    { type: 'screenshot', source: 'file', path: 'images/chat.png', preview: null },
    { type: 'talk', source: 'text', path: null, preview: '<paste a transcript snippet>' },
    { type: 'text', source: 'file', path: 'sample.txt', preview: null },
  ]);
  assert.equal(summary.ingestion.recommendedIntakeManifestEntryTemplateCount, 4);
  assert.equal(summary.ingestion.recommendedInspectCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(summary.ingestion.recommendedFollowUpCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
});

test('buildSummary uses the imported intake replay bundle after multiple imported starter manifests are edited', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  for (const profile of [
    {
      person: 'harry-han',
      displayName: 'Harry Han',
      summary: 'Direct operator with a bias for momentum.',
      sampleFile: 'samples/harry-post.txt',
      sampleText: 'Ship the first slice before polishing the plan.\n',
      starterTemplates: {
        message: { text: 'Keep the operating note concise.' },
        text: { file: 'sample.txt' },
      },
    },
    {
      person: 'jane-doe',
      displayName: 'Jane Doe',
      summary: 'Fast feedback beats polished drift.',
      sampleFile: 'samples/jane-post.txt',
      sampleText: 'Turn sharp notes into the next visible step.\n',
      starterTemplates: {
        screenshot: { file: 'images/chat.png' },
        talk: { text: 'Ship the correction while it is still fresh.' },
        text: { file: 'sample.txt' },
      },
    },
  ]) {
    runUpdateCommand(rootDir, 'profile', {
      person: profile.person,
      'display-name': profile.displayName,
      summary: profile.summary,
    });
    fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, profile.sampleFile), profile.sampleText);
    ingestion.importTextDocument({
      personId: profile.person,
      sourceFile: path.join(rootDir, profile.sampleFile),
    });
    ingestion.refreshFoundationDrafts({ personId: profile.person });
    fs.writeFileSync(
      path.join(rootDir, 'profiles', profile.person, 'imports', 'materials.template.json'),
      `${JSON.stringify({
        version: 1,
        personId: profile.person,
        entries: [],
        entryTemplates: profile.starterTemplates,
      }, null, 2)}\n`,
    );
  }

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.importedStarterIntakeProfileCount, 2);
  assert.equal(summary.ingestion.recommendedProfileId, 'harry-han');
  assert.equal(summary.ingestion.recommendedAction, 'populate imported intake starter manifests — starting with Harry Han (harry-han)');
  assert.equal(summary.ingestion.recommendedCommand, null);
  assert.equal(summary.ingestion.starterImportBundleCommand, "(node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation) && (node src/index.js import text --person jane-doe --file 'profiles/jane-doe/imports/sample.txt' --refresh-foundation)");
  assert.equal(summary.ingestion.helperCommands?.starterImportBundle, "(node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation) && (node src/index.js import text --person jane-doe --file 'profiles/jane-doe/imports/sample.txt' --refresh-foundation)");
  assert.equal(summary.ingestion.recommendedFallbackCommand, "(node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation) && (node src/index.js import text --person jane-doe --file 'profiles/jane-doe/imports/sample.txt' --refresh-foundation)");
  assert.equal(summary.ingestion.recommendedEditPath, 'profiles/harry-han/imports/materials.template.json');
  assert.deepEqual(summary.ingestion.recommendedEditPaths, [
    'profiles/harry-han/imports/materials.template.json',
    'profiles/harry-han/imports/sample.txt',
    'profiles/jane-doe/imports/materials.template.json',
    'profiles/jane-doe/imports/images/chat.png',
    'profiles/jane-doe/imports/sample.txt',
  ]);
  assert.match(
    summary.ingestion.recommendedRefreshIntakeCommand ?? '',
    /^\(node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'(?: --summary '.*')?\) && \(node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe'(?: --summary '.*')?\)$/,
  );
  assert.equal(summary.ingestion.recommendedManifestInspectCommand, "(node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json') && (node src/index.js import manifest --file 'profiles/jane-doe/imports/materials.template.json')");
  assert.equal(summary.ingestion.recommendedManifestImportCommand, "(node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation) && (node src/index.js import manifest --file 'profiles/jane-doe/imports/materials.template.json' --refresh-foundation)");
  const harryCommand = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');
  const janeCommand = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'jane-doe');
  assert.deepEqual(summary.ingestion.recommendedProfileSlices, [
    {
      personId: 'harry-han',
      label: 'Harry Han (harry-han)',
      latestMaterialAt: harryCommand?.latestMaterialAt ?? null,
      latestMaterialId: harryCommand?.latestMaterialId ?? null,
      latestMaterialSourcePath: harryCommand?.latestMaterialSourcePath ?? null,
      fallbackCommand: harryCommand?.starterImportCommand ?? null,
      refreshIntakeCommand: harryCommand?.updateIntakeCommand ?? null,
      editPath: harryCommand?.intakeManifestPath ?? null,
      editPaths: [
        'profiles/harry-han/imports/materials.template.json',
        'profiles/harry-han/imports/sample.txt',
      ],
      manifestInspectCommand: harryCommand?.importManifestWithoutRefreshCommand ?? null,
      manifestImportCommand: harryCommand?.importManifestCommand ?? null,
      intakeManifestEntryTemplateTypes: harryCommand?.intakeManifestEntryTemplateTypes ?? [],
      intakeManifestEntryTemplateDetails: harryCommand?.intakeManifestEntryTemplateDetails ?? [],
      intakeManifestEntryTemplateCount: harryCommand?.intakeManifestEntryTemplateCount ?? 0,
      inspectCommand: harryCommand?.followUpImportIntakeWithoutRefreshCommand ?? null,
      followUpCommand: harryCommand?.followUpImportIntakeCommand ?? null,
      paths: [
        'profiles/harry-han/imports',
        'profiles/harry-han/imports/images',
        'profiles/harry-han/imports/README.md',
        'profiles/harry-han/imports/materials.template.json',
        'profiles/harry-han/imports/sample.txt',
      ],
    },
    {
      personId: 'jane-doe',
      label: 'Jane Doe (jane-doe)',
      latestMaterialAt: janeCommand?.latestMaterialAt ?? null,
      latestMaterialId: janeCommand?.latestMaterialId ?? null,
      latestMaterialSourcePath: janeCommand?.latestMaterialSourcePath ?? null,
      fallbackCommand: janeCommand?.starterImportCommand ?? null,
      refreshIntakeCommand: janeCommand?.updateIntakeCommand ?? null,
      editPath: janeCommand?.intakeManifestPath ?? null,
      editPaths: [
        'profiles/jane-doe/imports/materials.template.json',
        'profiles/jane-doe/imports/images/chat.png',
        'profiles/jane-doe/imports/sample.txt',
      ],
      manifestInspectCommand: janeCommand?.importManifestWithoutRefreshCommand ?? null,
      manifestImportCommand: janeCommand?.importManifestCommand ?? null,
      intakeManifestEntryTemplateTypes: janeCommand?.intakeManifestEntryTemplateTypes ?? [],
      intakeManifestEntryTemplateDetails: janeCommand?.intakeManifestEntryTemplateDetails ?? [],
      intakeManifestEntryTemplateCount: janeCommand?.intakeManifestEntryTemplateCount ?? 0,
      inspectCommand: janeCommand?.followUpImportIntakeWithoutRefreshCommand ?? null,
      followUpCommand: janeCommand?.followUpImportIntakeCommand ?? null,
      paths: [
        'profiles/jane-doe/imports',
        'profiles/jane-doe/imports/images',
        'profiles/jane-doe/imports/README.md',
        'profiles/jane-doe/imports/materials.template.json',
        'profiles/jane-doe/imports/sample.txt',
      ],
    },
  ]);
  assert.deepEqual(summary.ingestion.recommendedIntakeManifestEntryTemplateTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.deepEqual(summary.ingestion.recommendedIntakeManifestEntryTemplateDetails, [
    { type: 'message', source: 'text', path: null, preview: 'Keep the operating note concise.' },
    { type: 'screenshot', source: 'file', path: 'images/chat.png', preview: null },
    { type: 'talk', source: 'text', path: null, preview: 'Ship the correction while it is still fresh.' },
    { type: 'text', source: 'file', path: 'sample.txt', preview: null },
  ]);
  assert.equal(summary.ingestion.recommendedIntakeManifestEntryTemplateCount, 4);
  assert.equal(summary.ingestion.helperCommands?.inspectImportedStarterBundle, "(node src/index.js import intake --person 'harry-han') && (node src/index.js import intake --person 'jane-doe')");
  assert.equal(summary.ingestion.helperCommands?.replayImportedStarterBundle, "(node src/index.js import intake --person 'harry-han' --refresh-foundation) && (node src/index.js import intake --person 'jane-doe' --refresh-foundation)");
  assert.equal(summary.ingestion.recommendedInspectCommand, "(node src/index.js import intake --person 'harry-han') && (node src/index.js import intake --person 'jane-doe')");
  assert.equal(summary.ingestion.recommendedFollowUpCommand, "(node src/index.js import intake --person 'harry-han' --refresh-foundation) && (node src/index.js import intake --person 'jane-doe' --refresh-foundation)");
  assert.deepEqual(summary.ingestion.recommendedPaths, [
    'profiles/harry-han/imports',
    'profiles/harry-han/imports/images',
    'profiles/harry-han/imports/README.md',
    'profiles/harry-han/imports/materials.template.json',
    'profiles/harry-han/imports/sample.txt',
    'profiles/jane-doe/imports',
    'profiles/jane-doe/imports/images',
    'profiles/jane-doe/imports/README.md',
    'profiles/jane-doe/imports/materials.template.json',
    'profiles/jane-doe/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next intake: populate imported intake starter manifests — starting with Harry Han \(harry-han\); latest material \d{4}-\d{2}-\d{2}T[^ ]+ \([^)]*\) @ samples\/harry-post\.txt/);
  assert.match(summary.promptPreview, /starter profiles: Harry Han \(harry-han\) -> profiles\/harry-han\/imports\/materials\.template\.json \| Jane Doe \(jane-doe\) -> profiles\/jane-doe\/imports\/materials\.template\.json/);
  assert.match(summary.promptPreview, /edit paths profiles\/harry-han\/imports\/materials\.template\.json, profiles\/harry-han\/imports\/sample\.txt, profiles\/jane-doe\/imports\/materials\.template\.json, profiles\/jane-doe\/imports\/images\/chat\.png, profiles\/jane-doe\/imports\/sample\.txt/);
  assert.match(summary.promptPreview, /starter details message Keep the operating note concise\. \| screenshot images\/chat\.png \| talk Ship the correction while it is still fresh\. \| text sample\.txt/);
  assert.match(summary.promptPreview, /helpers: .*inspect-starter-bundle \(node src\/index\.js import intake --person 'harry-han'\) && \(node src\/index\.js import intake --person 'jane-doe'\)/);
  assert.match(summary.promptPreview, /helpers: .*replay-starter-bundle \(node src\/index\.js import intake --person 'harry-han' --refresh-foundation\) && \(node src\/index\.js import intake --person 'jane-doe' --refresh-foundation\)/);
  assert.match(summary.promptPreview, /helpers: .*starter-import-bundle \(node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation\) && \(node src\/index\.js import text --person jane-doe --file 'profiles\/jane-doe\/imports\/sample\.txt' --refresh-foundation\)/);
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

  assert.equal(summary.ingestion.importedIntakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.importedIntakeBackfillProfileCount, 1);
  assert.equal(summary.ingestion.helperCommands?.scaffoldImported, 'node src/index.js update intake --imported');
  assert.equal(summary.ingestion.helperCommands?.importIntakeAllAndRefresh, 'node src/index.js import intake --all --refresh-foundation');
  assert.equal(summary.ingestion.helperCommands?.importIntakeStaleAndRefresh, 'node src/index.js import intake --stale --refresh-foundation');
  assert.equal(summary.ingestion.helperCommands?.importIntakeImported, 'node src/index.js import intake --imported');
  assert.equal(summary.ingestion.helperCommands?.importIntakeImportedAndRefresh, 'node src/index.js import intake --imported --refresh-foundation');
  assert.equal(summary.ingestion.helperCommands?.scaffoldImportedBundle, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(harry?.intakeReady, false);
  assert.equal(harry?.intakeStatusSummary, 'missing — create imports, images, README.md, materials.template.json, sample.txt');
  assert.equal(harry?.helperCommands?.scaffold, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.match(summary.promptPreview, /- intake backfill: 1 imported profile queued/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-imported-bundle node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^;]+, intake missing — create imports, images, README\.md, materials\.template\.json, sample\.txt; gaps memory missing, 1 candidate \(Ship the first slice before polishing the plan\.\); scaffold node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
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

  assert.equal(summary.ingestion.importedIntakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.importedIntakeBackfillProfileCount, 2);
  assert.equal(summary.ingestion.helperCommands?.scaffoldImported, 'node src/index.js update intake --imported');
  assert.equal(summary.ingestion.helperCommands?.importIntakeImported, 'node src/index.js import intake --imported');
  assert.equal(summary.ingestion.helperCommands?.importIntakeImportedAndRefresh, 'node src/index.js import intake --imported --refresh-foundation');
  assert.match(summary.ingestion.helperCommands?.scaffoldImportedBundle ?? '', /node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.ingestion.helperCommands?.scaffoldImportedBundle ?? '', /node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe' --summary 'Fast feedback beats polished drift\.'/);
  assert.match(summary.promptPreview, /- intake backfill: 2 imported profiles queued/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-imported node src\/index\.js update intake --imported/);
  assert.match(summary.promptPreview, /helpers: .*scaffold-imported-bundle /);
  assert.match(summary.promptPreview, /helpers: .*node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.promptPreview, /helpers: .*node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe' --summary 'Fast feedback beats polished drift\.'/);
});

test('buildSummary keeps imported profiles with invalid intake manifests in the actionable ingestion queue', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  runUpdateCommand(rootDir, 'intake', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  ingestion.importMessage({
    personId: 'harry-han',
    text: 'Ship the first slice before polishing the plan.',
  });
  runUpdateCommand(rootDir, 'foundation', { person: 'harry-han' });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'), '{ invalid json\n');

  const summary = buildSummary(rootDir);
  const harry = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');

  assert.equal(summary.ingestion.importedIntakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.importedInvalidIntakeManifestProfileCount, 1);
  assert.equal(summary.ingestion.invalidMetadataOnlyIntakeManifestProfileCount, 0);
  assert.equal(summary.ingestion.profileCommands.some((profile) => profile.personId === 'harry-han'), true);
  assert.equal(summary.ingestion.helperCommands?.repairImportedInvalidBundle, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(harry?.intakeReady, true);
  assert.equal(harry?.intakeManifestStatus, 'invalid');
  assert.equal(harry?.intakeStatusSummary, 'invalid manifest — repair materials.template.json (invalid JSON)');
  assert.match(summary.promptPreview, /- invalid intake manifests: 1 imported profile queued/);
  assert.match(summary.promptPreview, /repair-imported-invalid-bundle node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^|]+, intake invalid manifest — repair materials\.template\.json \(invalid JSON\)/);
});

test('buildSummary treats imported starter manifests with mismatched profile ownership as invalid', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  runUpdateCommand(rootDir, 'intake', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  ingestion.importMessage({
    personId: 'harry-han',
    text: 'Starter scaffolds should not quietly point at another profile.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'jane-doe',
      entries: [],
      entryTemplates: {
        text: {
          type: 'text',
          file: 'sample.txt',
          notes: 'starter text import',
        },
      },
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const harry = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');

  assert.equal(summary.ingestion.importedStarterIntakeProfileCount, 0);
  assert.equal(summary.ingestion.importedInvalidIntakeManifestProfileCount, 1);
  assert.equal(harry?.intakeManifestStatus, 'invalid');
  assert.equal(harry?.intakeStatusSummary, 'invalid manifest — repair materials.template.json (targets a different profile)');
  assert.match(summary.promptPreview, /imported intake: 0 ready, 0 starter templates, 0 backfills, 1 invalid manifest/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^|]+, intake invalid manifest — repair materials\.template\.json \(targets a different profile\)/);
});

test('buildSummary treats starter manifests with missing starter-template files as invalid before surfacing import helpers', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

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
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [],
      entryTemplates: {
        text: {
          type: 'text',
          file: 'missing-post.txt',
          notes: 'starter text import',
        },
      },
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const metadataOnly = summary.ingestion.metadataProfileCommands.find((profile) => profile.personId === 'metadata-only');

  assert.equal(summary.ingestion.intakeStarterProfileCount, 0);
  assert.equal(summary.ingestion.invalidMetadataOnlyIntakeManifestProfileCount, 1);
  assert.equal(metadataOnly?.intakeManifestStatus, 'invalid');
  assert.match(metadataOnly?.intakeManifestError ?? '', /missing file: missing-post\.txt/);
  assert.equal(metadataOnly?.intakeStatusSummary, 'invalid manifest — repair materials.template.json (missing file: missing-post.txt)');
  assert.equal(metadataOnly?.importManifestWithoutRefreshCommand, null);
  assert.equal(metadataOnly?.importManifestCommand, null);
  assert.equal(metadataOnly?.importMaterialCommand, null);
  assert.equal(metadataOnly?.helperCommands.importManifestWithoutRefresh, null);
  assert.equal(metadataOnly?.helperCommands.importManifest, null);
  assert.match(summary.promptPreview, /metadata-only intake scaffolds: 0 import-ready, 0 starter templates, 0 partial, 0 missing/);
  assert.match(summary.promptPreview, /- invalid intake manifests: 1 metadata-only profile queued/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake invalid manifest — repair materials\.template\.json \(missing file: missing-post\.txt\)/);
  assert.doesNotMatch(summary.promptPreview, /manifest-inspect node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json'/);
  assert.doesNotMatch(summary.promptPreview, /manifest node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
});

test('buildSummary keeps metadata-only profiles with invalid intake manifests visible in the ingestion entrance diagnostics', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

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
  fs.writeFileSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'), '{ invalid json\n');

  const summary = buildSummary(rootDir);
  const metadataOnly = summary.ingestion.metadataProfileCommands.find((profile) => profile.personId === 'metadata-only');

  assert.equal(summary.ingestion.intakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.invalidMetadataOnlyIntakeManifestProfileCount, 1);
  assert.equal(summary.ingestion.intakeScaffoldProfileCount, 1);
  assert.equal(summary.ingestion.helperCommands?.repairInvalidBundle, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.equal(metadataOnly?.intakeManifestStatus, 'invalid');
  assert.match(summary.promptPreview, /metadata-only intake scaffolds: 0 import-ready, 0 starter templates, 0 partial, 0 missing/);
  assert.match(summary.promptPreview, /- invalid intake manifests: 1 metadata-only profile queued/);
  assert.match(summary.promptPreview, /repair-invalid-bundle node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake invalid manifest — repair materials\.template\.json/);
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
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake missing — create imports, images, README\.md, materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.' \| import node src\/index\.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest\.' --refresh-foundation/);
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

  assert.equal(summary.ingestion.intakeReadyProfileCount, 0);
  assert.equal(summary.ingestion.intakeStarterProfileCount, 1);
  assert.equal(summary.ingestion.intakeImportAllCommand, 'node src/index.js import intake --all');
  assert.equal(metadataOnlyCommand.personId, 'metadata-only');
  assert.equal(metadataOnlyCommand.intakeReady, true);
  assert.equal(metadataOnlyCommand.intakeCompletion, 'ready');
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'starter template — add entries before import (templates: message, screenshot, talk, text)');
  assert.deepEqual(metadataOnlyCommand.intakeManifestEntryTemplateTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.equal(metadataOnlyCommand.intakeManifestEntryTemplateCount, 4);
  assert.equal(metadataOnlyCommand.importIntakeWithoutRefreshCommand, null);
  assert.equal(metadataOnlyCommand.importIntakeCommand, null);
  assert.equal(metadataOnlyCommand.importManifestWithoutRefreshCommand, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json'");
  assert.equal(metadataOnlyCommand.importManifestCommand, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.equal(metadataOnlyCommand.importMaterialCommand, "node src/index.js import text --person metadata-only --file 'profiles/metadata-only/imports/sample.txt' --refresh-foundation");
  assert.deepEqual(metadataOnlyCommand.intakePaths, [
    'profiles/metadata-only/imports',
    'profiles/metadata-only/imports/images',
    'profiles/metadata-only/imports/README.md',
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake starter template — add entries before import \(templates: message, screenshot, talk, text\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt \| refresh-intake node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.' \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation \| import node src\/index\.js import text --person metadata-only --file 'profiles\/metadata-only\/imports\/sample\.txt' --refresh-foundation \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
});

test('buildSummary surfaces the profile-local intake shortcut for imported profiles when the refresh shortcut is unavailable', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum and fast feedback loops.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum and fast feedback loops.',
  });
  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first, then tighten it with real feedback.',
  });

  const summary = buildSummary(rootDir);
  const importedCommand = summary.ingestion.allProfileCommands.find((entry) => entry.personId === 'harry-han');

  assert.ok(importedCommand);
  assert.equal(importedCommand.importIntakeWithoutRefreshCommand, null);
  assert.equal(importedCommand.importIntakeCommand, null);
  assert.equal(importedCommand.importManifestWithoutRefreshCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'");
  assert.equal(importedCommand.importManifestCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.equal(importedCommand.followUpImportIntakeWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(importedCommand.followUpImportIntakeCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.match(
    summary.promptPreview,
    /Harry Han \(harry-han\): 1 material \(message:1\), latest \d{4}-\d{2}-\d{2}T[^,]+ \([^)]+\)(?: @ [^,]+)?, intake starter template — add entries before import \(templates: message, screenshot, talk, text\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt; gaps memory missing, 1 candidate \(Ship the thin slice first, then tighten it with real feedback\.\) \| refresh-intake node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'(?: --summary '.*')? \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation \| inspect-after-edit node src\/index\.js import intake --person 'harry-han' \| replay-after-edit node src\/index\.js import intake --person 'harry-han' --refresh-foundation \| import node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation \| refresh node src\/index\.js update foundation --person 'harry-han' \| sync node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han'(?: --summary '.*')? --refresh-foundation/
  );
});

test('buildSummary prefers customized profile-local intake manifest imports over matching checked-in sample imports once intake scaffolding is ready', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'metadata-only.txt'), 'Sample text that should yield to the customized profile-local intake manifest.');
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
  fs.writeFileSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'local-note.txt'), 'Use the profile-local intake manifest first.');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'local-note.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(metadataOnlyCommand.personId, 'metadata-only');
  assert.equal(metadataOnlyCommand.importCommands?.text, "node src/index.js import text --person metadata-only --file 'samples/metadata-only.txt' --refresh-foundation");
  assert.equal(metadataOnlyCommand.importManifestCommand, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.equal(metadataOnlyCommand.importMaterialCommand, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
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
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'partial — missing images, materials.template.json, sample.txt');
  assert.match(
    summary.promptPreview,
    /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake partial — missing images, materials\.template\.json, sample\.txt; scaffold node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/,
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
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'invalid manifest — repair materials.template.json (missing file: missing-post.txt)');
  assert.deepEqual(metadataOnlyCommand.intakePaths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/missing-post.txt',
  ]);
  assert.equal(metadataOnlyCommand.importIntakeCommand, null);
  assert.equal(metadataOnlyCommand.importManifestCommand, null);
  assert.equal(metadataOnlyCommand.importMaterialCommand, null);
  assert.equal(metadataOnlyCommand.helperCommands.importIntake, null);
  assert.equal(metadataOnlyCommand.helperCommands.importManifest, null);
  assert.equal(summary.ingestion.helperCommands.importIntakeBundle, null);
  assert.match(
    summary.promptPreview,
    /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake invalid manifest — repair materials\.template\.json \(missing file: missing-post\.txt\) \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/,
  );
  assert.doesNotMatch(summary.promptPreview, /shortcut node src\/index\.js import intake --person 'metadata-only' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /import node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
});

test('buildSummary treats starter manifests with missing screenshot template files as invalid intake scaffolds', () => {
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
      entries: [],
      entryTemplates: {
        text: { file: 'sample.txt' },
        message: { text: '<paste a representative short message>' },
        talk: { text: '<paste a transcript snippet>' },
        screenshot: { file: 'images/missing-chat.png' },
      },
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands[0];

  assert.equal(metadataOnlyCommand.intakeReady, true);
  assert.equal(metadataOnlyCommand.intakeManifestStatus, 'invalid');
  assert.match(metadataOnlyCommand.intakeManifestError, /missing file/i);
  assert.equal(metadataOnlyCommand.intakeStatusSummary, 'invalid manifest — repair materials.template.json (missing file: images/missing-chat.png)');
  assert.deepEqual(metadataOnlyCommand.intakeManifestEntryTemplateTypes, ['message', 'screenshot', 'talk', 'text']);
  assert.equal(metadataOnlyCommand.intakeManifestEntryTemplateCount, 4);
  assert.deepEqual(metadataOnlyCommand.intakeManifestEntryTemplateDetails, [
    { type: 'message', source: 'text', path: null, preview: '<paste a representative short message>' },
    { type: 'screenshot', source: 'file', path: 'images/missing-chat.png', preview: null },
    { type: 'talk', source: 'text', path: null, preview: '<paste a transcript snippet>' },
    { type: 'text', source: 'file', path: 'sample.txt', preview: null },
  ]);
  assert.deepEqual(metadataOnlyCommand.intakePaths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/images/missing-chat.png',
  ]);
  assert.equal(metadataOnlyCommand.importIntakeCommand, null);
  assert.equal(metadataOnlyCommand.importManifestCommand, null);
  assert.equal(metadataOnlyCommand.importMaterialCommand, null);
  assert.equal(metadataOnlyCommand.helperCommands.importIntake, null);
  assert.equal(metadataOnlyCommand.helperCommands.importManifest, null);
  assert.equal(summary.ingestion.helperCommands.importIntakeBundle, null);
  assert.match(
    summary.promptPreview,
    /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake invalid manifest — repair materials\.template\.json \(missing file: images\/missing-chat\.png\); starter details message <paste a representative short message> \| screenshot images\/missing-chat\.png \| talk <paste a transcript snippet> \| text sample\.txt \| update node src\/index\.js update profile --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/,
  );
  assert.doesNotMatch(summary.promptPreview, /starter template — add entries before import/);
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
    importedIntakeReadyProfileCount: 0,
    importedStarterIntakeProfileCount: 0,
    importedIntakeBackfillProfileCount: 0,
    importedInvalidIntakeManifestProfileCount: 0,
    invalidMetadataOnlyIntakeManifestProfileCount: 0,
    intakeReadyProfileCount: 0,
    intakeStarterProfileCount: 0,
    intakePartialProfileCount: 0,
    intakeMissingProfileCount: 0,
    intakeScaffoldProfileCount: 0,
    intakeStaleProfileCount: 0,
    intakeImportAllCommand: 'node src/index.js import intake --all',
    intakeImportAllAndRefreshCommand: 'node src/index.js import intake --all --refresh-foundation',
    intakeImportStaleCommand: 'node src/index.js import intake --stale',
    intakeImportStaleAndRefreshCommand: 'node src/index.js import intake --stale --refresh-foundation',
    intakeImportImportedCommand: 'node src/index.js import intake --imported',
    intakeImportImportedAndRefreshCommand: 'node src/index.js import intake --imported --refresh-foundation',
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
    sampleManifestInspectCommand: null,
    sampleManifestCommand: null,
    sampleTextPath: null,
    sampleTextPresent: false,
    sampleTextPersonId: null,
    sampleTextCommand: null,
    sampleFileCommands: [],
    sampleInlineCommands: [],
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    refreshFoundationBundleCommand: null,
    starterImportBundleCommand: null,
    inspectImportedStarterBundleCommand: null,
    replayImportedStarterBundleCommand: null,
    repairInvalidIntakeBundleCommand: null,
    repairImportedInvalidIntakeBundleCommand: null,
    updateProfileBundleCommand: null,
    updateProfileAndRefreshBundleCommand: null,
    recommendedProfileId: null,
    recommendedLabel: null,
    recommendedAction: 'bootstrap a target profile',
    recommendedLatestMaterialAt: null,
    recommendedLatestMaterialId: null,
    recommendedLatestMaterialSourcePath: null,
    recommendedCommand: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
    recommendedFallbackCommand: null,
    recommendedRefreshIntakeCommand: null,
    recommendedEditPath: null,
    recommendedEditPaths: [],
    recommendedManifestInspectCommand: null,
    recommendedManifestImportCommand: null,
    recommendedIntakeManifestEntryTemplateTypes: [],
    recommendedIntakeManifestEntryTemplateDetails: [],
    recommendedIntakeManifestEntryTemplateCount: 0,
    recommendedProfileSlices: [],
    recommendedInspectCommand: null,
    recommendedFollowUpCommand: null,
    recommendedPaths: [],
    helperCommands: {
      bootstrap: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"',
      scaffoldAll: 'node src/index.js update intake --all',
      scaffoldStale: 'node src/index.js update intake --stale',
      scaffoldImported: 'node src/index.js update intake --imported',
      scaffoldBundle: null,
      scaffoldImportedBundle: null,
      repairInvalidBundle: null,
      repairImportedInvalidBundle: null,
      importManifest: 'node src/index.js import manifest --file <manifest.json>',
      importManifestAndRefresh: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
      importIntakeAll: 'node src/index.js import intake --all',
      importIntakeAllAndRefresh: 'node src/index.js import intake --all --refresh-foundation',
      importIntakeStale: 'node src/index.js import intake --stale',
      importIntakeStaleAndRefresh: 'node src/index.js import intake --stale --refresh-foundation',
      importIntakeImported: 'node src/index.js import intake --imported',
      importIntakeImportedAndRefresh: 'node src/index.js import intake --imported --refresh-foundation',
      importIntakeBundle: null,
      inspectImportedStarterBundle: null,
      replayImportedStarterBundle: null,
      starterImportBundle: null,
      updateProfileBundle: null,
      updateProfileAndRefreshBundle: null,
      refreshAllFoundation: 'node src/index.js update foundation --all',
      refreshStaleFoundation: 'node src/index.js update foundation --stale',
      refreshFoundationBundle: null,
      sampleStarter: null,
      sampleManifestInspect: null,
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
  assert.match(summary.promptPreview, /metadata-only intake scaffolds: 0 import-ready, 0 starter templates, 0 partial, 0 missing/);
  assert.match(summary.promptPreview, /imports: message, screenshot, talk, text/);
  assert.match(summary.promptPreview, /next intake: bootstrap a target profile; command node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(summary.promptPreview, /bootstrap: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(summary.promptPreview, /helpers: scaffold-all node src\/index\.js update intake --all \| scaffold-stale node src\/index\.js update intake --stale \| scaffold-imported node src\/index\.js update intake --imported \| manifest node src\/index\.js import manifest --file <manifest\.json> \| manifest\+refresh node src\/index\.js import manifest --file <manifest\.json> --refresh-foundation \| import-all node src\/index\.js import intake --all \| import-all\+refresh node src\/index\.js import intake --all --refresh-foundation \| import-stale node src\/index\.js import intake --stale \| import-stale\+refresh node src\/index\.js import intake --stale --refresh-foundation \| import-imported node src\/index\.js import intake --imported \| import-imported\+refresh node src\/index\.js import intake --imported --refresh-foundation/);
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
  assert.equal(summary.ingestion.sampleManifestInspectCommand, "node src/index.js import manifest --file 'samples/starter-materials.json'");
  assert.equal(summary.ingestion.sampleManifestCommand, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.equal(summary.ingestion.recommendedAction, 'import the checked-in sample target profile for Starter Person (starter-person)');
  assert.equal(summary.ingestion.recommendedCommand, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.equal(summary.ingestion.recommendedManifestInspectCommand, "node src/index.js import manifest --file 'samples/starter-materials.json'");
  assert.equal(summary.ingestion.recommendedManifestImportCommand, "node src/index.js import manifest --file 'samples/starter-materials.json' --refresh-foundation");
  assert.deepEqual(summary.ingestion.sampleManifestMaterialTypes, { text: 1 });
  assert.equal(summary.ingestion.sampleTextPath, 'samples/starter-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'starter-person');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person starter-person --file 'samples/starter-post.txt' --refresh-foundation");
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[samples\/starter-materials\.json\] for Starter Person \(starter-person\)/);
  assert.match(summary.promptPreview, /sample manifest: 1 entry for Starter Person \(starter-person\) \(text:1\) -> node src\/index\.js import manifest --file 'samples\/starter-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /next intake: import the checked-in sample target profile for Starter Person \(starter-person\); command node src\/index\.js import manifest --file 'samples\/starter-materials\.json' --refresh-foundation; manifest inspect node src\/index\.js import manifest --file 'samples\/starter-materials\.json' @ samples\/starter-materials\.json, samples\/starter-post\.txt/);
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
  assert.equal(summary.ingestion.sampleStarterSource, 'samples/harry-materials.json');
  assert.equal(summary.ingestion.sampleTextPath, 'samples/harry-post.txt');
  assert.equal(summary.ingestion.sampleTextPresent, true);
  assert.equal(summary.ingestion.sampleTextPersonId, 'harry-han');
  assert.equal(summary.ingestion.sampleTextCommand, "node src/index.js import text --person harry-han --file 'samples/harry-post.txt' --refresh-foundation");
  assert.equal(summary.ingestion.sampleStarterLabel, 'Anna Ace (anna-ace), Harry Han (harry-han)');
  assert.match(summary.promptPreview, /- starter: node src\/index\.js import sample \[samples\/harry-materials\.json\] for Anna Ace \(anna-ace\), Harry Han \(harry-han\)/);
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
  assert.match(summary.promptPreview, /starter: node src\/index\.js import sample \[samples\/harry sample materials\.json\] for Harry Han \(harry-han\)/);
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

test('buildSummary treats sample manifests with undeclared entry targets as invalid and hides broken starter commands', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      profiles: [{ personId: 'Harry Han', displayName: 'Harry Han' }],
      entries: [{ personId: 'Jane Doe', type: 'message', text: 'Ship the thin slice first.' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.deepEqual(summary.ingestion.sampleManifestProfileIds, []);
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, []);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 targets undeclared profile: jane-doe/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 targets undeclared profile: jane-doe @ samples\/harry-materials\.json/);
  assert.doesNotMatch(summary.promptPreview, /starter: node src\/index\.js import sample/);
});

test('buildSummary treats shorthand sample manifests with conflicting entry targets as invalid', () => {
  const rootDir = makeTempRepo();
  const sampleDir = path.join(rootDir, 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  fs.writeFileSync(
    path.join(sampleDir, 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      displayName: 'Harry Han',
      entries: [{ personId: 'Jane Doe', type: 'message', text: 'Ship the thin slice first.' }],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.ingestion.sampleStarterCommand, null);
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 targets a different profile than manifest\.personId: expected harry-han/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 targets a different profile than manifest\.personId: expected harry-han @ samples\/harry-materials\.json/);
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
  assert.equal(summary.ingestion.sampleManifestInspectCommand, "node src/index.js import manifest --file 'samples/harry-materials.json'");
  assert.equal(summary.ingestion.sampleManifestCommand, null);
  assert.equal(summary.ingestion.recommendedManifestInspectCommand, "node src/index.js import manifest --file 'samples/harry-materials.json'");
  assert.equal(summary.ingestion.sampleTextPersonId, null);
  assert.equal(summary.ingestion.sampleTextCommand, null);
  assert.match(summary.ingestion.sampleManifestError, /Manifest entry 0 references a missing file: missing-post\.txt/);
  assert.match(summary.promptPreview, /sample manifest invalid: Manifest entry 0 references a missing file: missing-post\.txt @ samples\/harry-materials\.json/);
  assert.match(summary.promptPreview, /next intake: fix the checked-in sample manifest for first imports — missing file: missing-post\.txt; manifest inspect node src\/index\.js import manifest --file 'samples\/harry-materials\.json' @ samples\/harry-materials\.json/);
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

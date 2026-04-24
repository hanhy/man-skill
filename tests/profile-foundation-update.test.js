import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FileSystemLoader } from '../src/core/fs-loader.js';
import { MaterialIngestion } from '../src/core/material-ingestion.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-foundation-update-'));
}

const cliEntrypoint = fileURLToPath(new URL('../src/index.js', import.meta.url));
const repoRoot = path.resolve(path.dirname(cliEntrypoint), '..');

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
  assert.equal(result.refreshFoundationCommand, "node src/index.js update foundation --person 'harry-han'");
  assert.equal(result.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation");
  assert.equal(result.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.importIntakeWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(result.importIntakeCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.deepEqual(result.helperCommands, {
    refreshFoundation: "node src/index.js update foundation --person 'harry-han'",
    updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
    updateIntake: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
    importIntakeWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
    importIntake: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
  });

  const memoryDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json');
  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'skills', 'README.md');

  assert.equal(fs.existsSync(memoryDraftPath), true);
  assert.equal(fs.existsSync(voiceDraftPath), true);
  assert.equal(fs.existsSync(soulDraftPath), true);
  assert.equal(fs.existsSync(skillsDraftPath), true);

  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  assert.equal(result.latestMaterialSourcePath, memoryDraft.latestMaterialSourcePath);
  assert.equal(result.latestMaterialAt, memoryDraft.latestMaterialAt);
  assert.equal(result.latestMaterialId, memoryDraft.latestMaterialId);
  assert.deepEqual(result.materialTypes, {
    message: 1,
    talk: 1,
    text: 1,
  });
  assert.equal(result.entryCount, 3);
  assert.deepEqual(result.draftSources, {
    memory: {
      path: path.join('profiles', 'harry-han', 'memory', 'long-term', 'foundation.json'),
      generatedAt: result.generatedAt,
      latestMaterialAt: result.latestMaterialAt,
      latestMaterialId: result.latestMaterialId,
      latestMaterialSourcePath: memoryDraft.latestMaterialSourcePath,
      sourceCount: 3,
      materialTypes: {
        message: 1,
        talk: 1,
        text: 1,
      },
      entryCount: 3,
    },
    voice: {
      path: path.join('profiles', 'harry-han', 'voice', 'README.md'),
      generatedAt: result.generatedAt,
      latestMaterialAt: result.latestMaterialAt,
      latestMaterialId: result.latestMaterialId,
      latestMaterialSourcePath: memoryDraft.latestMaterialSourcePath,
      sourceCount: 3,
      materialTypes: {
        message: 1,
        talk: 1,
        text: 1,
      },
    },
    soul: {
      path: path.join('profiles', 'harry-han', 'soul', 'README.md'),
      generatedAt: result.generatedAt,
      latestMaterialAt: result.latestMaterialAt,
      latestMaterialId: result.latestMaterialId,
      latestMaterialSourcePath: memoryDraft.latestMaterialSourcePath,
      sourceCount: 3,
      materialTypes: {
        message: 1,
        talk: 1,
        text: 1,
      },
    },
    skills: {
      path: path.join('profiles', 'harry-han', 'skills', 'README.md'),
      generatedAt: result.generatedAt,
      latestMaterialAt: result.latestMaterialAt,
      latestMaterialId: result.latestMaterialId,
      latestMaterialSourcePath: memoryDraft.latestMaterialSourcePath,
      sourceCount: 3,
      materialTypes: {
        message: 1,
        talk: 1,
        text: 1,
      },
    },
  });
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
  assert.match(voiceDraft, /## Tone/);
  assert.match(voiceDraft, /Direct operator with a bias for momentum\./);
  assert.match(voiceDraft, /## Signature moves/);
  assert.match(voiceDraft, /- \[message\] Ship the thin slice first\./);
  assert.match(voiceDraft, /- \[talk\] Cut the scope, keep the momentum/);
  assert.match(voiceDraft, /## Avoid/);
  assert.match(voiceDraft, /padding, hedging, or over-explaining/i);
  assert.match(voiceDraft, /## Language hints/);
  assert.match(voiceDraft, /Preserve bilingual, dialect, or code-switching patterns/i);

  const soulDraft = fs.readFileSync(soulDraftPath, 'utf8');
  assert.match(soulDraft, /## Core truths/);
  assert.match(soulDraft, /- \[text\] Harry prefers blunt execution over long debate\./);
  assert.match(soulDraft, /## Boundaries/);
  assert.match(soulDraft, /Stay within the evidence from imported materials/i);
  assert.match(soulDraft, /## Continuity/);
  assert.match(soulDraft, /strongest repeated values and tradeoff language/i);

  const skillsDraft = fs.readFileSync(skillsDraftPath, 'utf8');
  assert.match(skillsDraft, /## Candidate skills/);
  assert.match(skillsDraft, /- product execution heuristic/);
  assert.match(skillsDraft, /## Evidence/);
  assert.match(skillsDraft, /- sample: Cut the scope, keep the momentum, and fix the rough edges tomorrow\./);
  assert.match(skillsDraft, /## Gaps to validate/);
  assert.match(skillsDraft, /Promote repeated procedures into reusable skills/i);
});

test('refreshFoundationDrafts persists latest material source provenance into generated draft artifacts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  const sourceTextPath = path.join(rootDir, 'latest-source.txt');
  fs.writeFileSync(sourceTextPath, 'Keep the operator loop inspectable.');

  ingestion.importMessage({
    personId: 'Source Provenance',
    text: 'Start with the quick signal.',
  });
  ingestion.importTextDocument({
    personId: 'Source Provenance',
    sourceFile: sourceTextPath,
    notes: 'latest writing sample',
  });

  ingestion.refreshFoundationDrafts({ personId: 'Source Provenance' });

  const memoryDraftPath = path.join(rootDir, 'profiles', 'source-provenance', 'memory', 'long-term', 'foundation.json');
  const voiceDraftPath = path.join(rootDir, 'profiles', 'source-provenance', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'source-provenance', 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', 'source-provenance', 'skills', 'README.md');

  const expectedSourcePath = 'latest-source.txt';
  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  assert.equal(memoryDraft.latestMaterialSourcePath, expectedSourcePath);

  const sourcePathPattern = new RegExp(`Latest material source: ${expectedSourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  assert.match(fs.readFileSync(voiceDraftPath, 'utf8'), sourcePathPattern);
  assert.match(fs.readFileSync(soulDraftPath, 'utf8'), sourcePathPattern);
  assert.match(fs.readFileSync(skillsDraftPath, 'utf8'), sourcePathPattern);

  const [profile] = loader.loadProfilesIndex();
  assert.equal(profile.foundationDraftSummaries.memory.latestMaterialSourcePath, expectedSourcePath);
  assert.equal(profile.foundationDraftSummaries.voice.latestMaterialSourcePath, expectedSourcePath);
  assert.equal(profile.foundationDraftSummaries.soul.latestMaterialSourcePath, expectedSourcePath);
  assert.equal(profile.foundationDraftSummaries.skills.latestMaterialSourcePath, expectedSourcePath);
});

test('refreshFoundationDrafts rewrites a memory foundation draft when its stored personId drifts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
    notes: 'short chat sample',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const memoryDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json');
  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  memoryDraft.personId = 'someone-else';
  fs.writeFileSync(memoryDraftPath, JSON.stringify(memoryDraft, null, 2));

  const result = ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });
  const repairedDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));

  assert.equal(result.personId, 'harry-han');
  assert.equal(repairedDraft.personId, 'harry-han');
  assert.equal(repairedDraft.displayName, 'Harry Han');
  assert.equal(repairedDraft.summary, 'Direct operator with a bias for momentum.');
});

test('scaffoldProfileIntake hides imported-profile intake shortcuts until the local manifest has real entries', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
    notes: 'short chat sample',
  });

  const intakeReadmePath = path.join(rootDir, 'profiles', 'harry-han', 'imports', 'README.md');
  const intakeReadme = fs.readFileSync(intakeReadmePath, 'utf8');

  assert.match(intakeReadme, /Recommended helper commands:/);
  assert.match(intakeReadme, /Starter manifest: profiles\/harry-han\/imports\/materials\.template\.json/);
  assert.match(intakeReadme, /refresh this intake scaffold: node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'/);
  assert.match(intakeReadme, /Inspect after editing: node src\/index\.js import intake --person 'harry-han'/);
  assert.match(intakeReadme, /Import after editing: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(intakeReadme, /after editing, replay the profile-local intake without refreshing drafts: node src\/index\.js import intake --person 'harry-han'/);
  assert.match(intakeReadme, /after editing, replay the profile-local intake and refresh drafts: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(intakeReadme, /inspect the edited manifest without refreshing drafts: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json'/);
  assert.match(intakeReadme, /import the edited manifest and refresh drafts: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(intakeReadme, /Rerun safety:/);
  assert.match(intakeReadme, /re-running `node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'` preserves starter entries, entry templates, and the managed Custom notes block/i);
  assert.match(intakeReadme, /if `materials\.template\.json` becomes invalid JSON, the same rerun snapshots it to `profiles\/harry-han\/imports\/materials\.template\.json\.invalid-<timestamp>\.bak` before rebuilding the starter scaffold/i);
  assert.match(intakeReadme, /sync target-profile metadata and refresh drafts: node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation/);
  assert.match(intakeReadme, /manifest inspect: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json'/);
  assert.match(intakeReadme, /manifest: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/);
});

test('scaffoldProfileIntake labels loaded manifests as profile-local reruns and surfaces both intake shortcuts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
    notes: 'short chat sample',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'harry-han',
      displayName: 'Harry Han',
      summary: 'Direct operator with a bias for momentum.',
      entries: [
        {
          type: 'text',
          file: 'sample.txt',
          notes: 'local rerun fixture',
        },
      ],
    }, null, 2),
  );

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });

  const intakeReadmePath = path.join(rootDir, 'profiles', 'harry-han', 'imports', 'README.md');
  const intakeReadme = fs.readFileSync(intakeReadmePath, 'utf8');

  assert.match(intakeReadme, /Profile-local manifest: profiles\/harry-han\/imports\/materials\.template\.json/);
  assert.match(intakeReadme, /profile-local intake shortcut without refreshing drafts: node src\/index\.js import intake --person 'harry-han'/);
  assert.match(intakeReadme, /profile-local intake shortcut and refresh drafts: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(intakeReadme, /inspect the edited manifest without refreshing drafts: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json'/);
  assert.match(intakeReadme, /import the edited manifest and refresh drafts: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(intakeReadme, /Rerun safety:/);
  assert.match(intakeReadme, /re-running `node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'` preserves starter entries, entry templates, and the managed Custom notes block/i);
  assert.match(intakeReadme, /if `materials\.template\.json` becomes invalid JSON, the same rerun snapshots it to `profiles\/harry-han\/imports\/materials\.template\.json\.invalid-<timestamp>\.bak` before rebuilding the starter scaffold/i);
  assert.match(intakeReadme, /manifest inspect: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json'/);
  assert.match(intakeReadme, /manifest: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/);
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
  assert.equal(result.refreshFoundationCommand, "node src/index.js update foundation --person 'harry-han'");
  assert.equal(result.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'");
  assert.equal(result.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation");
  assert.equal(result.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'");
  assert.equal(result.importIntakeWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(result.importIntakeCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.deepEqual(result.helperCommands, {
    refreshFoundation: "node src/index.js update foundation --person 'harry-han'",
    updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation",
    updateIntake: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'",
    importIntakeWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
    importIntake: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
  });
  assert.match(result.voiceDraftPath, /profiles\/harry-han\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, result.voiceDraftPath)), true);
});

test('CLI --help explains the stale/imported intake replay defaults and refresh variants', () => {
  const output = execFileSync('node', [cliEntrypoint, '--help'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.match(output, /import intake --stale \[--refresh-foundation\].*still need first imports/i);
  assert.match(output, /import intake --imported \[--refresh-foundation\].*already-imported profiles/i);
  assert.match(output, /import intake --all \[--refresh-foundation\].*including already-imported profiles/i);
  assert.match(output, /update intake --stale \[--refresh-foundation\].*metadata-only profiles with missing or partial imports\/ assets/i);
  assert.match(output, /update intake --imported \[--refresh-foundation\].*already-imported profiles missing imports\/ assets/i);
  assert.match(output, /update intake --all \[--refresh-foundation\].*every metadata-only profile/i);
  assert.doesNotMatch(output, /"foundation"\s*:/);
});

test('CLI update intake --stale scaffolds only metadata-only profiles with incomplete intake landing zones', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Alpha Missing',
    displayName: 'Alpha Missing',
    summary: 'No intake scaffold yet.',
  });
  ingestion.updateProfile({
    personId: 'Zeta Partial',
    displayName: 'Zeta Partial',
    summary: 'Needs the intake scaffold completed.',
  });
  fs.mkdirSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports', 'README.md'), '# Partial intake scaffold\n');
  ingestion.scaffoldProfileIntake({
    personId: 'Beta Ready',
    displayName: 'Beta Ready',
    summary: 'Already has a complete intake scaffold.',
  });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'intake', '--stale'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['zeta-partial', 'alpha-missing']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-missing', 'imports', 'materials.template.json')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports', 'sample.txt')), true);
});

test('CLI update intake --stale keeps foundation refresh empty when only metadata-only profiles are touched', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Alpha Missing',
    displayName: 'Alpha Missing',
    summary: 'No imported materials yet.',
  });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'intake', '--stale', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['alpha-missing']);
  assert.deepEqual(result.foundationRefresh, {
    profileCount: 0,
    results: [],
  });
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-missing', 'voice', 'README.md')), false);
});

test('CLI update intake --all reruns intake scaffolding for every metadata-only profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Alpha Missing',
    displayName: 'Alpha Missing',
    summary: 'No intake scaffold yet.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Beta Ready',
    displayName: 'Beta Ready',
    summary: 'Already has a complete intake scaffold.',
  });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'intake', '--all'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['alpha-missing', 'beta-ready']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'materials.template.json')), true);
});

test('CLI update intake --imported backfills imported profiles with missing intake landing zones', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Imported Missing',
    displayName: 'Imported Missing',
    summary: 'Imported already but still missing the intake landing zone.',
  });
  ingestion.importMessage({
    personId: 'Imported Missing',
    text: 'This profile already has imported material.',
  });
  fs.rmSync(path.join(rootDir, 'profiles', 'imported-missing', 'imports'), { recursive: true, force: true });
  const importedMissingProfilePath = path.join(rootDir, 'profiles', 'imported-missing', 'profile.json');
  const importedMissingProfileBefore = JSON.parse(fs.readFileSync(importedMissingProfilePath, 'utf8'));

  ingestion.updateProfile({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Still metadata-only, so --imported should skip it.',
  });

  ingestion.scaffoldProfileIntake({
    personId: 'Imported Ready',
    displayName: 'Imported Ready',
    summary: 'Imported profile with an intact intake scaffold.',
  });
  ingestion.importMessage({
    personId: 'Imported Ready',
    text: 'Already imported and already scaffolded.',
  });

  await new Promise((resolve) => setTimeout(resolve, 15));

  const output = execFileSync('node', [cliEntrypoint, 'update', 'intake', '--imported'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);
  const importedMissingProfileAfter = JSON.parse(fs.readFileSync(importedMissingProfilePath, 'utf8'));

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['imported-missing']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'imported-missing', 'imports', 'materials.template.json')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json')), false);
  assert.equal(importedMissingProfileAfter.updatedAt, importedMissingProfileBefore.updatedAt);
});

test('CLI update intake refreshes foundation drafts for imported profiles when --refresh-foundation is passed', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Imported Already',
    text: 'Already imported, but the intake backfill should also refresh drafts.',
  });
  fs.rmSync(path.join(rootDir, 'profiles', 'imported-already', 'imports'), { recursive: true, force: true });

  const output = execFileSync('node', [cliEntrypoint, 'update', 'intake', '--imported', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.profileCount, 1);
  assert.equal(result.results[0].personId, 'imported-already');
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.deepEqual(result.foundationRefresh.results.map((entry) => entry.personId), ['imported-already']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'imported-already', 'voice', 'README.md')), true);
});

test('CLI import intake --person loads a profile-local starter manifest without refreshing foundation drafts by default', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'sample.txt'),
    'Metadata Only prefers tight feedback loops.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      entries: [
        {
          type: 'text',
          file: 'sample.txt',
        },
        {
          type: 'message',
          text: 'Ship the narrow slice first.',
        },
      ],
    }, null, 2),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--person', 'Metadata Only'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.manifestFile, 'profiles/metadata-only/imports/materials.template.json');
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['metadata-only']);
  assert.equal(result.foundationRefresh ?? null, null);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'metadata-only', 'voice', 'README.md')), false);
});

test('CLI import intake --person refreshes foundation drafts when --refresh-foundation is passed', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Metadata Only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'sample.txt'),
    'Metadata Only prefers tight feedback loops.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      entries: [
        {
          type: 'text',
          file: 'sample.txt',
        },
        {
          type: 'message',
          text: 'Ship the narrow slice first.',
        },
      ],
    }, null, 2),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--person', 'Metadata Only', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.manifestFile, 'profiles/metadata-only/imports/materials.template.json');
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['metadata-only']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.match(result.foundationRefresh.results[0].memoryDraftPath, /profiles\/metadata-only\/memory\/long-term\/foundation\.json$/);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'metadata-only', 'voice', 'README.md')), true);
});

test('CLI direct import message reruns report skipped status and avoid duplicate records', () => {
  const rootDir = makeTempRepo();

  const firstOutput = execFileSync('node', [cliEntrypoint, 'import', 'message', '--person', 'Harry Han', '--text', 'Ship the thin slice first.', '--notes', 'chat sample', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const firstResult = JSON.parse(firstOutput);

  const secondOutput = execFileSync('node', [cliEntrypoint, 'import', 'message', '--person', 'Harry Han', '--text', 'Ship the thin slice first.', '--notes', 'chat sample', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const secondResult = JSON.parse(secondOutput);

  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.skipped, false);
  assert.equal(typeof firstResult.recordPath, 'string');
  assert.equal(firstResult.foundationRefresh.personId, 'harry-han');

  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.skipped, true);
  assert.equal(secondResult.recordPath, null);
  assert.equal(secondResult.assetPath, null);
  assert.equal(secondResult.foundationRefresh.personId, 'harry-han');

  const materialRecords = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materialRecords.length, 1);
});

test('CLI import intake --person reruns a ready profile-local starter manifest for an already-imported profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Imported Already',
    displayName: 'Imported Already',
    summary: 'Should be rerunnable through the intake shortcut.',
  });
  ingestion.importMessage({
    personId: 'Imported Already',
    text: 'Already imported, but the intake shortcut should still work.',
  });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'imported-already', 'imports', 'sample.txt'), 'Imported intake rerun.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'imported-already', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Imported Already',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  const firstOutput = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--person', 'Imported Already', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const firstResult = JSON.parse(firstOutput);
  const secondOutput = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--person', 'Imported Already', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const secondResult = JSON.parse(secondOutput);

  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.manifestFile, 'profiles/imported-already/imports/materials.template.json');
  assert.equal(firstResult.entryCount, 1);
  assert.equal(firstResult.manifestEntryCount, 1);
  assert.equal(firstResult.skippedEntryCount, 0);
  assert.deepEqual(firstResult.profileIds, ['imported-already']);
  assert.equal(firstResult.foundationRefresh.profileCount, 1);

  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.manifestFile, 'profiles/imported-already/imports/materials.template.json');
  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.manifestEntryCount, 1);
  assert.equal(secondResult.skippedEntryCount, 1);
  assert.deepEqual(secondResult.profileIds, ['imported-already']);
  assert.equal(secondResult.foundationRefresh.profileCount, 1);

  const materialRecords = fs
    .readdirSync(path.join(rootDir, 'profiles', 'imported-already', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materialRecords.length, 2);
});

test('CLI import intake --all loads every ready profile-local starter manifest, including already-imported profiles, and skips incomplete intake scaffolds', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Alpha Ready',
    displayName: 'Alpha Ready',
    summary: 'Ready intake manifest.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Beta Ready',
    displayName: 'Beta Ready',
    summary: 'Another ready intake manifest.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Starter Only',
    displayName: 'Starter Only',
    summary: 'Still has the untouched starter manifest and should be skipped.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Imported Already',
    displayName: 'Imported Already',
    summary: 'Ready intake manifest with existing materials.',
  });
  ingestion.importMessage({
    personId: 'Imported Already',
    text: 'Already imported, so --all should rerun this intake manifest too.',
  });
  ingestion.updateProfile({
    personId: 'Gamma Missing',
    displayName: 'Gamma Missing',
    summary: 'Needs intake scaffolding first.',
  });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'alpha-ready', 'imports', 'sample.txt'), 'Alpha sample.\n');
  fs.writeFileSync(path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'sample.txt'), 'Beta sample.\n');
  fs.writeFileSync(path.join(rootDir, 'profiles', 'imported-already', 'imports', 'sample.txt'), 'Imported again.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'alpha-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Alpha Ready',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Beta Ready',
      entries: [{ type: 'message', text: 'Beta keeps it terse.' }],
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'imported-already', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Imported Already',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--all', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 3);
  assert.equal(result.entryCount, 3);
  assert.deepEqual(result.profileIds, ['alpha-ready', 'beta-ready', 'imported-already']);
  assert.equal(result.results.length, 3);
  assert.deepEqual(result.profileSummaries.map((entry) => entry.personId), ['alpha-ready', 'beta-ready', 'imported-already']);
  assert.equal(result.profileSummaries[0].label, 'Alpha Ready (alpha-ready)');
  assert.equal(result.profileSummaries[0].materialCount, 1);
  assert.deepEqual(result.profileSummaries[0].missingDrafts, []);
  assert.equal(result.profileSummaries[1].label, 'Beta Ready (beta-ready)');
  assert.equal(result.profileSummaries[1].materialCount, 1);
  assert.deepEqual(result.profileSummaries[1].missingDrafts, []);
  assert.equal(result.profileSummaries[2].label, 'Imported Already (imported-already)');
  assert.equal(result.profileSummaries[2].materialCount, 1);
  assert.deepEqual(result.profileSummaries[2].materialTypes, { text: 1 });
  assert.equal(result.foundationRefresh.profileCount, 3);
  assert.deepEqual(result.foundationRefresh.results.map((entry) => entry.personId), ['alpha-ready', 'beta-ready', 'imported-already']);
  assert.match(result.foundationRefresh.results[0].voiceDraftPath, /profiles\/alpha-ready\/voice\/README\.md$/);
  assert.match(result.foundationRefresh.results[2].voiceDraftPath, /profiles\/imported-already\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-ready', 'voice', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'beta-ready', 'voice', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'imported-already', 'voice', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'starter-only', 'voice', 'README.md')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'gamma-missing', 'voice', 'README.md')), false);
});

test('CLI import intake --imported reruns only ready already-imported profile-local starter manifests without refreshing drafts by default', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Imported Ready',
    displayName: 'Imported Ready',
    summary: 'Already imported and ready for local manifest reruns.',
  });
  ingestion.importMessage({
    personId: 'Imported Ready',
    text: 'Existing imported material.',
  });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'imported-ready', 'imports', 'sample.txt'), 'Imported rerun sample.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'imported-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Imported Ready',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  ingestion.scaffoldProfileIntake({
    personId: 'Metadata Ready',
    displayName: 'Metadata Ready',
    summary: 'Ready intake manifest but still metadata-only.',
  });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'metadata-ready', 'imports', 'sample.txt'), 'Metadata-only sample.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Metadata Ready',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  const firstOutput = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--imported'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const firstResult = JSON.parse(firstOutput);
  const secondOutput = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--imported'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const secondResult = JSON.parse(secondOutput);

  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.profileCount, 1);
  assert.equal(firstResult.entryCount, 1);
  assert.deepEqual(firstResult.profileIds, ['imported-ready']);
  assert.deepEqual(firstResult.profileSummaries.map((entry) => entry.personId), ['imported-ready']);
  assert.equal(firstResult.foundationRefresh ?? null, null);
  assert.equal(firstResult.results.length, 1);
  assert.equal(firstResult.results[0].manifestFile, 'profiles/imported-ready/imports/materials.template.json');

  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.profileCount, 1);
  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.skippedEntryCount, 1);
  assert.deepEqual(secondResult.profileIds, ['imported-ready']);
  assert.deepEqual(secondResult.profileSummaries.map((entry) => entry.personId), ['imported-ready']);
  assert.equal(secondResult.profileSummaries[0].materialCount, 0);
  assert.deepEqual(secondResult.profileSummaries[0].materialTypes, {});
  assert.equal(secondResult.foundationRefresh ?? null, null);
  assert.equal(secondResult.results.length, 1);
  assert.equal(secondResult.results[0].entryCount, 0);
  assert.equal(secondResult.results[0].skippedEntryCount, 1);

  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'imported-ready', 'voice', 'README.md')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'metadata-ready', 'voice', 'README.md')), false);
});

function seedReadyStaleIntakeFixture(rootDir, ingestion) {
  ingestion.scaffoldProfileIntake({
    personId: 'Alpha Ready',
    displayName: 'Alpha Ready',
    summary: 'Ready intake manifest.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Beta Ready',
    displayName: 'Beta Ready',
    summary: 'Another ready intake manifest.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Starter Only',
    displayName: 'Starter Only',
    summary: 'Should be skipped because the local intake manifest still has no entries.',
  });
  ingestion.importMessage({
    personId: 'Imported Already',
    text: 'Already imported, so no intake rerun needed.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Imported Already',
    displayName: 'Imported Already',
    summary: 'Should be skipped because materials already exist.',
  });
  ingestion.updateProfile({
    personId: 'Gamma Missing',
    displayName: 'Gamma Missing',
    summary: 'Needs intake scaffolding first.',
  });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'alpha-ready', 'imports', 'sample.txt'), 'Alpha sample.\n');
  fs.writeFileSync(path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'sample.txt'), 'Beta sample.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'alpha-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Alpha Ready',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Beta Ready',
      entries: [{ type: 'message', text: 'Beta keeps it terse.' }],
    }, null, 2),
  );
}

test('CLI import intake --stale loads only ready metadata-only profile-local starter manifests without refreshing foundation drafts by default', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  seedReadyStaleIntakeFixture(rootDir, ingestion);

  const output = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--stale'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 2);
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['alpha-ready', 'beta-ready']);
  assert.deepEqual(result.results.map((entry) => entry.manifestFile), [
    'profiles/alpha-ready/imports/materials.template.json',
    'profiles/beta-ready/imports/materials.template.json',
  ]);
  assert.equal(result.foundationRefresh ?? null, null);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-ready', 'voice', 'README.md')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'beta-ready', 'voice', 'README.md')), false);
  assert.equal(result.results.some((entry) => entry.profileIds.includes('imported-already')), false);
});

test('CLI import intake --stale refreshes foundation drafts when --refresh-foundation is passed', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  seedReadyStaleIntakeFixture(rootDir, ingestion);

  const output = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--stale', '--refresh-foundation'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.profileCount, 2);
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['alpha-ready', 'beta-ready']);
  assert.equal(result.foundationRefresh.profileCount, 2);
  assert.deepEqual(result.foundationRefresh.results.map((entry) => entry.personId), ['alpha-ready', 'beta-ready']);
  assert.match(result.foundationRefresh.results[0].voiceDraftPath, /profiles\/alpha-ready\/voice\/README\.md$/);
  assert.match(result.foundationRefresh.results[1].voiceDraftPath, /profiles\/beta-ready\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-ready', 'voice', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'beta-ready', 'voice', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'imported-already', 'voice', 'README.md')), false);
});

test('CLI import sample command loads the checked-in sample manifest and refreshes foundation drafts', () => {
  const rootDir = makeTempRepo();
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
        {
          type: 'message',
          text: 'Keep the feedback loop short.',
        },
      ],
    }, null, 2),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'sample'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.manifestFile, 'samples/harry-materials.json');
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['harry-han']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.match(result.foundationRefresh.results[0].voiceDraftPath, /profiles\/harry-han\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, result.foundationRefresh.results[0].voiceDraftPath)), true);
});

test('CLI import sample command falls back to another valid sample manifest when the canonical one is invalid', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-materials.json'), '{not valid json');
  fs.writeFileSync(path.join(rootDir, 'samples', 'starter-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'starter-materials.json'),
    JSON.stringify({
      personId: 'Starter Person',
      entries: [
        {
          type: 'text',
          file: 'starter-post.txt',
        },
        {
          type: 'message',
          text: 'Keep the feedback loop short.',
        },
      ],
    }, null, 2),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'sample'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.manifestFile, 'samples/starter-materials.json');
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['starter-person']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.match(result.foundationRefresh.results[0].voiceDraftPath, /profiles\/starter-person\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, result.foundationRefresh.results[0].voiceDraftPath)), true);
});

test('CLI import sample command accepts an explicit sample manifest path override', () => {
  const rootDir = makeTempRepo();
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
  fs.writeFileSync(path.join(rootDir, 'samples', 'starter-post.txt'), 'Keep the feedback loop short.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'starter-materials.json'),
    JSON.stringify({
      personId: 'Starter Person',
      entries: [
        {
          type: 'text',
          file: 'starter-post.txt',
        },
        {
          type: 'message',
          text: 'Keep the feedback loop short.',
        },
      ],
    }, null, 2),
  );

  const output = execFileSync('node', [cliEntrypoint, 'import', 'sample', '--file', 'samples/starter-materials.json'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.ok, true);
  assert.equal(result.manifestFile, 'samples/starter-materials.json');
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['starter-person']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.match(result.foundationRefresh.results[0].voiceDraftPath, /profiles\/starter-person\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, result.foundationRefresh.results[0].voiceDraftPath)), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han')), false);
});

test('CLI import manifest rejects manifest entries that point outside the repo root', () => {
  const rootDir = makeTempRepo();
  const outsideFilePath = path.join(os.tmpdir(), `man-skill-cli-outside-${Date.now()}.txt`);
  fs.writeFileSync(outsideFilePath, 'Outside repo content should not be importable.');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: outsideFilePath,
        },
      ],
    }, null, 2),
  );

  assert.throws(
    () => execFileSync('node', [cliEntrypoint, 'import', 'manifest', '--file', 'materials.json'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
    }),
    /outside the repo root/,
  );
  const materialsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials');
  const materialFiles = fs.existsSync(materialsDir)
    ? fs.readdirSync(materialsDir).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json')), false);
});

test('CLI --help prints a concise usage guide instead of the repo summary JSON', () => {
  const rootDir = makeTempRepo();

  const output = execFileSync('node', [cliEntrypoint, '--help'], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  assert.match(output, /^Usage: node src\/index\.js /);
  assert.match(output, /Commands:/);
  assert.match(output, /node src\/index\.js import sample/);
  assert.match(output, /import intake --stale \[--refresh-foundation\]\s+Import ready intake manifests for metadata-only profiles that still need first imports/);
  assert.match(output, /import intake --imported \[--refresh-foundation\]\s+Import ready intake manifests only for already-imported profiles/);
  assert.match(output, /import intake --all \[--refresh-foundation\]\s+Import every ready profile-local intake manifest, including already-imported profiles/);
  assert.match(output, /update intake --stale \[--refresh-foundation\]\s+Complete intake scaffolds only for metadata-only profiles with missing or partial imports\/ assets/);
  assert.match(output, /update intake --imported \[--refresh-foundation\]\s+Backfill intake scaffolds only for already-imported profiles missing imports\/ assets/);
  assert.match(output, /update intake --all \[--refresh-foundation\]\s+Rebuild intake scaffolds for every metadata-only profile/);
  assert.doesNotMatch(output, /"profile": \{/);
});

test('CLI command errors print a concise usage hint without a stack trace', () => {
  const rootDir = makeTempRepo();

  assert.throws(
    () => execFileSync('node', [cliEntrypoint, 'import', 'manifest'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
    }),
    (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /Error: manifestFile is required for manifest import/);
      assert.match(error.stderr, /Usage: node src\/index\.js import manifest --file <manifest\.json>/);
      assert.doesNotMatch(error.stderr, /at MaterialIngestion\.importManifest/);
      return true;
    },
  );
});

test('CLI update intake errors advertise the full usage surface for person, stale, imported, and all modes', () => {
  const rootDir = makeTempRepo();

  assert.throws(
    () => execFileSync('node', [cliEntrypoint, 'update', 'intake'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
    }),
    (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /Error: update intake requires exactly one of --person, --stale, --imported, or --all/);
      assert.match(error.stderr, /Usage: node src\/index\.js update intake --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\] \| --stale \[--refresh-foundation\] \| --imported \[--refresh-foundation\] \| --all \[--refresh-foundation\]/);
      assert.match(error.stderr, /Examples:/);
      assert.match(error.stderr, /node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
      assert.match(error.stderr, /node src\/index\.js update intake --stale/);
      assert.match(error.stderr, /node src\/index\.js update intake --imported --refresh-foundation/);
      assert.match(error.stderr, /node src\/index\.js update intake --all --refresh-foundation/);
      assert.doesNotMatch(error.stderr, /at runUpdateCommand/);
      return true;
    },
  );
});

test('CLI import intake and update foundation errors advertise the full batch-capable usage surface', () => {
  const rootDir = makeTempRepo();

  const cases = [
    {
      args: ['import', 'intake'],
      expectedError: /Error: import intake requires exactly one of --person, --stale, --imported, or --all/,
      expectedUsage: /Usage: node src\/index\.js import intake --person <person-id> \[--refresh-foundation\] \| --stale \[--refresh-foundation\] \| --imported \[--refresh-foundation\] \| --all \[--refresh-foundation\]/,
      expectedExamples: [
        /Examples:/,
        /node src\/index\.js import intake --person 'harry-han' --refresh-foundation/,
        /\n  node src\/index\.js import intake --stale\n/,
        /\n  node src\/index\.js import intake --imported\n/,
        /\n  node src\/index\.js import intake --all(?:\n|$)/,
      ],
    },
    {
      args: ['update', 'foundation'],
      expectedError: /Error: update foundation requires exactly one of --person, --stale, or --all/,
      expectedUsage: /Usage: node src\/index\.js update foundation --person <person-id> \| --stale \| --all/,
      expectedExamples: [
        /Examples:/,
        /node src\/index\.js update foundation --person 'harry-han'/,
        /node src\/index\.js update foundation --stale/,
        /node src\/index\.js update foundation --all/,
      ],
    },
  ];

  cases.forEach(({ args, expectedError, expectedUsage, expectedExamples }) => {
    assert.throws(
      () => execFileSync('node', [cliEntrypoint, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr, expectedError);
        assert.match(error.stderr, expectedUsage);
        expectedExamples.forEach((pattern) => {
          assert.match(error.stderr, pattern);
        });
        assert.doesNotMatch(error.stderr, /at (runImportCommand|runUpdateCommand)/);
        return true;
      },
    );
  });
});

test('CLI batch-capable intake and foundation commands reject ambiguous mode selectors with the same usage hints', () => {
  const rootDir = makeTempRepo();

  const cases = [
    {
      args: ['import', 'intake', '--person', 'harry-han', '--all'],
      expectedError: /Error: import intake requires exactly one of --person, --stale, --imported, or --all/,
      expectedUsage: /Usage: node src\/index\.js import intake --person <person-id> \[--refresh-foundation\] \| --stale \[--refresh-foundation\] \| --imported \[--refresh-foundation\] \| --all \[--refresh-foundation\]/,
    },
    {
      args: ['update', 'intake', '--person', 'harry-han', '--stale'],
      expectedError: /Error: update intake requires exactly one of --person, --stale, --imported, or --all/,
      expectedUsage: /Usage: node src\/index\.js update intake --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\] \| --stale \[--refresh-foundation\] \| --imported \[--refresh-foundation\] \| --all \[--refresh-foundation\]/,
    },
    {
      args: ['update', 'foundation', '--person', 'harry-han', '--all'],
      expectedError: /Error: update foundation requires exactly one of --person, --stale, or --all/,
      expectedUsage: /Usage: node src\/index\.js update foundation --person <person-id> \| --stale \| --all/,
    },
  ];

  cases.forEach(({ args, expectedError, expectedUsage }) => {
    assert.throws(
      () => execFileSync('node', [cliEntrypoint, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr, expectedError);
        assert.match(error.stderr, expectedUsage);
        assert.doesNotMatch(error.stderr, /at (runImportCommand|runUpdateCommand)/);
        return true;
      },
    );
  });
});

test('CLI import command errors keep usage hints aligned with optional refresh and notes flags', () => {
  const rootDir = makeTempRepo();

  const cases = [
    {
      args: ['import', 'manifest'],
      expectedError: /Error: manifestFile is required for manifest import/,
      expectedUsage: /Usage: node src\/index\.js import manifest --file <manifest\.json> \[--refresh-foundation\]/,
    },
    {
      args: ['import', 'manifest', '--file'],
      expectedError: /Error: Missing value for --file/,
      expectedUsage: /Usage: node src\/index\.js import manifest --file <manifest\.json> \[--refresh-foundation\]/,
    },
    {
      args: ['import', 'sample', '--file'],
      expectedError: /Error: Missing value for --file/,
      expectedUsage: /Usage: node src\/index\.js import sample \[--file <manifest\.json>\]/,
    },
    {
      args: ['import', 'sample', '--file', '   '],
      expectedError: /Error: Missing value for --file/,
      expectedUsage: /Usage: node src\/index\.js import sample \[--file <manifest\.json>\]/,
    },
    {
      args: ['import', 'text'],
      expectedError: /Error: Missing required --person argument/,
      expectedUsage: /Usage: node src\/index\.js import text --person <person-id> --file <sample\.txt> \[--notes <text>\] \[--refresh-foundation\]/,
    },
    {
      args: ['import', 'message'],
      expectedError: /Error: Missing required --person argument/,
      expectedUsage: /Usage: node src\/index\.js import message --person <person-id> --text <message> \[--notes <text>\] \[--refresh-foundation\]/,
    },
    {
      args: ['import', 'talk'],
      expectedError: /Error: Missing required --person argument/,
      expectedUsage: /Usage: node src\/index\.js import talk --person <person-id> --text <snippet> \[--notes <text>\] \[--refresh-foundation\]/,
    },
    {
      args: ['import', 'screenshot'],
      expectedError: /Error: Missing required --person argument/,
      expectedUsage: /Usage: node src\/index\.js import screenshot --person <person-id> --file <image\.png> \[--notes <text>\] \[--refresh-foundation\]/,
    },
  ];

  cases.forEach(({ args, expectedError, expectedUsage }) => {
    assert.throws(
      () => execFileSync('node', [cliEntrypoint, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr, expectedError);
        assert.match(error.stderr, expectedUsage);
        assert.doesNotMatch(error.stderr, /at runImportCommand/);
        return true;
      },
    );
  });
});

test('CLI unsupported import and update subcommands fail with family-level usage hints', () => {
  const rootDir = makeTempRepo();

  const cases = [
    {
      args: ['import', 'csv'],
      expectedError: /Error: Unsupported import type: csv/,
      expectedUsageLines: [
        /Usage:/,
        /node src\/index\.js import sample \[--file <manifest\.json>\]/,
        /node src\/index\.js import intake --person <person-id> \[--refresh-foundation\]/,
        /node src\/index\.js import manifest --file <manifest\.json> \[--refresh-foundation\]/,
        /node src\/index\.js import text --person <person-id> --file <sample\.txt> \[--notes <text>\] \[--refresh-foundation\]/,
      ],
      stackTracePattern: /at runImportCommand/,
    },
    {
      args: ['update', 'csv'],
      expectedError: /Error: Unsupported update type: csv/,
      expectedUsageLines: [
        /Usage:/,
        /node src\/index\.js update profile --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\]/,
        /node src\/index\.js update intake --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\]/,
        /node src\/index\.js update intake --stale \[--refresh-foundation\]/,
        /node src\/index\.js update foundation --all/,
      ],
      stackTracePattern: /at runUpdateCommand/,
    },
  ];

  cases.forEach(({ args, expectedError, expectedUsageLines, stackTracePattern }) => {
    assert.throws(
      () => execFileSync('node', [cliEntrypoint, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr, expectedError);
        expectedUsageLines.forEach((pattern) => {
          assert.match(error.stderr, pattern);
        });
        assert.doesNotMatch(error.stderr, stackTracePattern);
        return true;
      },
    );
  });
});

test('CLI import and update subcommands reject unsupported option combinations before acting', () => {
  const rootDir = makeTempRepo();

  const cases = [
    {
      args: ['import', 'text', '--person', 'harry-han', '--file', 'sample.txt', '--all'],
      expectedError: /Error: Unsupported option --all for import text/,
      expectedUsage: /Usage: node src\/index\.js import text --person <person-id> --file <sample\.txt> \[--notes <text>\] \[--refresh-foundation\]/,
    },
    {
      args: ['import', 'text', '--person', 'harry-han', '--file', 'sample.txt', '--refresh-foundtion'],
      expectedError: /Error: Unsupported option --refresh-foundtion for import text/,
      expectedUsage: /Usage: node src\/index\.js import text --person <person-id> --file <sample\.txt> \[--notes <text>\] \[--refresh-foundation\]/,
    },
    {
      args: ['update', 'profile', '--person', 'harry-han', '--display-name', 'Harry Han', '--stale'],
      expectedError: /Error: Unsupported option --stale for update profile/,
      expectedUsage: /Usage: node src\/index\.js update profile --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\]/,
    },
    {
      args: ['update', 'intake', '--stale', '--summary', 'ignored'],
      expectedError: /Error: Unsupported option --summary for update intake/,
      expectedUsage: /Usage: node src\/index\.js update intake --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\] \| --stale \[--refresh-foundation\] \| --imported \[--refresh-foundation\] \| --all \[--refresh-foundation\]/,
    },
    {
      args: ['update', 'intake', '--imported', '--display-name', 'Ignored'],
      expectedError: /Error: Unsupported option --display-name for update intake/,
      expectedUsage: /Usage: node src\/index\.js update intake --person <person-id> \[--display-name <name>\] \[--summary <text>\] \[--refresh-foundation\] \| --stale \[--refresh-foundation\] \| --imported \[--refresh-foundation\] \| --all \[--refresh-foundation\]/,
    },
    {
      args: ['update', 'foundation', '--person', 'harry-han', '--notes', 'test'],
      expectedError: /Error: Unsupported option --notes for update foundation/,
      expectedUsage: /Usage: node src\/index\.js update foundation --person <person-id> \| --stale \| --all/,
    },
  ];

  cases.forEach(({ args, expectedError, expectedUsage }) => {
    assert.throws(
      () => execFileSync('node', [cliEntrypoint, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr, expectedError);
        assert.match(error.stderr, expectedUsage);
        assert.doesNotMatch(error.stderr, /at (runImportCommand|runUpdateCommand)/);
        return true;
      },
    );
  });
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

test('refreshStaleFoundationDrafts follows the same stale-foundation status as loadProfilesIndex', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  ingestion.importMessage({
    personId: 'Fresh Person',
    text: 'Keep it steady.',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Fresh Person' });

  ingestion.importMessage({
    personId: 'Missing Drafts',
    text: 'Draft this next.',
  });

  ingestion.updateProfile({
    personId: 'Metadata Drift',
    displayName: 'Metadata Drift',
    summary: 'First summary.',
  });
  ingestion.importMessage({
    personId: 'Metadata Drift',
    text: 'Keep the staged rollout honest.',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Metadata Drift' });
  ingestion.updateProfile({
    personId: 'Metadata Drift',
    displayName: 'Metadata Drift',
    summary: 'Updated summary after draft generation.',
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

  const staleByLoader = loader.loadProfilesIndex()
    .filter((profile) => profile.foundationDraftStatus.needsRefresh)
    .map((profile) => ({
      personId: profile.id,
      refreshReasons: profile.foundationDraftStatus.refreshReasons,
    }))
    .sort((left, right) => left.personId.localeCompare(right.personId));
  const staleByRefresh = ingestion.refreshStaleFoundationDrafts().results
    .map((entry) => entry.personId)
    .sort();

  assert.deepEqual(staleByRefresh, staleByLoader.map((entry) => entry.personId));
  assert.deepEqual(staleByLoader, [
    {
      personId: 'metadata-drift',
      refreshReasons: ['profile metadata drift', 'draft metadata drift'],
    },
    {
      personId: 'missing-drafts',
      refreshReasons: ['missing drafts', 'new materials'],
    },
    {
      personId: 'stale-person',
      refreshReasons: ['new materials', 'draft metadata drift'],
    },
  ]);
});

test('refreshStaleFoundationDrafts refreshes profiles when memory draft personId metadata drifts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.updateProfile({
    personId: 'Memory Drift',
    displayName: 'Memory Drift',
    summary: 'Needs the stored profile id repaired.',
  });
  ingestion.importMessage({
    personId: 'Memory Drift',
    text: 'Ship the first slice.',
  });
  const initial = ingestion.refreshFoundationDrafts({ personId: 'Memory Drift' });

  const memoryDraftPath = path.join(rootDir, 'profiles', 'memory-drift', 'memory', 'long-term', 'foundation.json');
  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  memoryDraft.personId = 'someone-else';
  fs.writeFileSync(memoryDraftPath, JSON.stringify(memoryDraft, null, 2));

  const result = ingestion.refreshStaleFoundationDrafts();
  const repairedDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['memory-drift']);
  assert.equal(result.results[0].generatedAt >= initial.generatedAt, true);
  assert.equal(repairedDraft.personId, 'memory-drift');
});

test('refreshStaleFoundationDrafts repairs legacy markdown foundation drafts that miss structured sections', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Repair Person',
    text: 'Ship the first slice.',
  });
  ingestion.importTalkSnippet({
    personId: 'Repair Person',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Repair Person' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'repair-person', 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', 'repair-person', 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', 'repair-person', 'skills', 'README.md');
  const legacyVoiceDraft = '# Voice draft\n\nProfile: repair-person\nDisplay name: Repair Person\nSummary: Not set.\nGenerated at: 2026-04-16T00:00:00.000Z\nLatest material: 2026-04-16T00:00:00.000Z (legacy-message)\nSource materials: 1 (message:1)\n\nRepresentative voice excerpts:\n- [message] Ship the first slice.\n';
  const legacySoulDraft = '# Soul draft\n\nProfile: repair-person\nDisplay name: Repair Person\nSummary: Not set.\nGenerated at: 2026-04-16T00:00:00.000Z\nLatest material: 2026-04-16T00:00:00.000Z (legacy-message)\nSource materials: 2 (message:1, talk:1)\n\nCandidate soul signals:\n- [talk] Keep the feedback loop short.\n';
  const legacySkillsDraft = '# Skills draft\n\nProfile: repair-person\nDisplay name: Repair Person\nSummary: Not set.\nGenerated at: 2026-04-16T00:00:00.000Z\nLatest material: 2026-04-16T00:00:00.000Z (legacy-message)\nSource materials: 2 (message:1, talk:1)\n\nCandidate procedural skills:\n- execution heuristic\n  - sample: Keep the feedback loop short.\n';
  fs.writeFileSync(voiceDraftPath, legacyVoiceDraft);
  fs.writeFileSync(soulDraftPath, legacySoulDraft);
  fs.writeFileSync(skillsDraftPath, legacySkillsDraft);

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['repair-person']);

  const repairedVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  assert.notEqual(repairedVoiceDraft, legacyVoiceDraft);
  assert.match(repairedVoiceDraft, /## Tone/);
  assert.match(repairedVoiceDraft, /## Signature moves/);

  const repairedSoulDraft = fs.readFileSync(soulDraftPath, 'utf8');
  assert.notEqual(repairedSoulDraft, legacySoulDraft);
  assert.match(repairedSoulDraft, /## Core truths/);
  assert.match(repairedSoulDraft, /## Boundaries/);
  assert.match(repairedSoulDraft, /## Continuity/);

  const repairedSkillsDraft = fs.readFileSync(skillsDraftPath, 'utf8');
  assert.notEqual(repairedSkillsDraft, legacySkillsDraft);
  assert.match(repairedSkillsDraft, /## Candidate skills/);
  assert.match(repairedSkillsDraft, /## Evidence/);
  assert.match(repairedSkillsDraft, /## Gaps to validate/);
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

test('refreshStaleFoundationDrafts refreshes profiles when markdown draft metadata drifts from the target profile', async () => {
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

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const staleVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8')
    .replace('Display name: Harry Han', 'Display name: Old Harry')
    .replace('Summary: Direct operator with a bias for momentum.', 'Summary: Outdated summary.');
  fs.writeFileSync(voiceDraftPath, staleVoiceDraft);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['harry-han']);
  assert.equal(result.results[0].generatedAt > initial.generatedAt, true);

  const refreshedVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  assert.match(refreshedVoiceDraft, /Display name: Harry Han/);
  assert.match(refreshedVoiceDraft, /Summary: Direct operator with a bias for momentum\./);
  assert.doesNotMatch(refreshedVoiceDraft, /Display name: Old Harry/);
  assert.doesNotMatch(refreshedVoiceDraft, /Summary: Outdated summary\./);
});

test('refreshStaleFoundationDrafts refreshes profiles when markdown draft material metadata drifts from imported materials', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  ingestion.importTalkSnippet({
    personId: 'Harry Han',
    text: 'Keep the feedback loop short.',
    notes: 'execution heuristic',
  });
  const initial = ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const staleVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8')
    .replace(/Latest material: .*\(.+\)/, 'Latest material: 2026-04-16T00:00:00.000Z (legacy-message)')
    .replace(/Source materials: .*$/, 'Source materials: 1 (message:1)');
  fs.writeFileSync(voiceDraftPath, staleVoiceDraft);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['harry-han']);
  assert.equal(result.results[0].generatedAt > initial.generatedAt, true);

  const refreshedVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  assert.match(refreshedVoiceDraft, /Source materials: 2 \(message:1, talk:1\)/);
  assert.doesNotMatch(refreshedVoiceDraft, /Latest material: 2026-04-16T00:00:00.000Z \(legacy-message\)/);
  assert.doesNotMatch(refreshedVoiceDraft, /Source materials: 1 \(message:1\)/);
});

test('refreshStaleFoundationDrafts refreshes profiles when markdown draft latest material source provenance drifts', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const sourceTextPath = path.join(rootDir, 'latest-source.txt');
  fs.writeFileSync(sourceTextPath, 'Keep the operator loop inspectable.');

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Ship the thin slice first.',
  });
  ingestion.importTextDocument({
    personId: 'Harry Han',
    sourceFile: sourceTextPath,
    notes: 'latest writing sample',
  });
  const initial = ingestion.refreshFoundationDrafts({ personId: 'Harry Han' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'harry-han', 'voice', 'README.md');
  const staleVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8')
    .replace(/Latest material source: .*$/m, 'Latest material source: stale-source.txt');
  fs.writeFileSync(voiceDraftPath, staleVoiceDraft);

  await new Promise((resolve) => setTimeout(resolve, 15));

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['harry-han']);
  assert.equal(result.results[0].generatedAt > initial.generatedAt, true);

  const refreshedVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  assert.match(refreshedVoiceDraft, /Latest material source: latest-source\.txt/);
  assert.doesNotMatch(refreshedVoiceDraft, /Latest material source: stale-source\.txt/);
});

test('refreshStaleFoundationDrafts refreshes profiles when memory draft latest material source provenance drifts', async () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const sourceTextPath = path.join(rootDir, 'latest-source.txt');
  fs.writeFileSync(sourceTextPath, 'Keep the operator loop inspectable.');

  ingestion.importMessage({
    personId: 'Memory Drift',
    text: 'Ship the first slice.',
  });
  ingestion.importTextDocument({
    personId: 'Memory Drift',
    sourceFile: sourceTextPath,
    notes: 'latest writing sample',
  });
  const initial = ingestion.refreshFoundationDrafts({ personId: 'Memory Drift' });

  const memoryDraftPath = path.join(rootDir, 'profiles', 'memory-drift', 'memory', 'long-term', 'foundation.json');
  const memoryDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  memoryDraft.latestMaterialSourcePath = 'stale-source.txt';
  fs.writeFileSync(memoryDraftPath, JSON.stringify(memoryDraft, null, 2));

  await new Promise((resolve) => setTimeout(resolve, 15));

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['memory-drift']);
  assert.equal(result.results[0].generatedAt > initial.generatedAt, true);

  const repairedDraft = JSON.parse(fs.readFileSync(memoryDraftPath, 'utf8'));
  assert.equal(repairedDraft.latestMaterialSourcePath, 'latest-source.txt');
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

test('CLI update profile skips foundation refresh when metadata-only profiles have no imported materials', () => {
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
      'Metadata only profile.',
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
  assert.equal(result.profile.displayName, 'Harry Han');
  assert.equal(result.profile.summary, 'Metadata only profile.');
  assert.equal(result.foundationRefresh, null);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'memory')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'voice')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'soul')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'skills')), false);
});

test('CLI update intake scaffolds starter manifest files for a target person', () => {
  const rootDir = makeTempRepo();

  const output = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
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
  assert.equal(result.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.importIntakeWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(result.importIntakeCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.equal(result.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation");
  assert.equal(result.importManifestWithoutRefreshCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'");
  assert.equal(result.importManifestCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.equal(result.importAfterEditingWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(result.importAfterEditingCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.deepEqual(result.helperCommands, {
    scaffold: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
    importIntakeWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
    importIntake: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
    importManifest: "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'",
    importManifestAndRefresh: "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation",
    importAfterEditingWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
    importAfterEditing: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
    updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
    refreshFoundation: "node src/index.js update foundation --person 'harry-han'",
    directImports: {
      text: "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation",
      message: 'node src/index.js import message --person harry-han --text <message> --refresh-foundation',
      talk: 'node src/index.js import talk --person harry-han --text <snippet> --refresh-foundation',
      screenshot: 'node src/index.js import screenshot --person harry-han --file <image.png> --refresh-foundation',
    },
  });
  assert.deepEqual(result.importCommands, {
    text: "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation",
    message: 'node src/index.js import message --person harry-han --text <message> --refresh-foundation',
    talk: 'node src/index.js import talk --person harry-han --text <snippet> --refresh-foundation',
    screenshot: 'node src/index.js import screenshot --person harry-han --file <image.png> --refresh-foundation',
  });
  assert.match(result.starterManifestPath, /profiles\/harry-han\/imports\/materials\.template\.json$/);
  assert.match(result.intakeReadmePath, /profiles\/harry-han\/imports\/README\.md$/);
  assert.match(result.sampleTextPath, /profiles\/harry-han\/imports\/sample\.txt$/);

  const template = JSON.parse(fs.readFileSync(path.join(rootDir, result.starterManifestPath), 'utf8'));
  assert.equal(template.personId, 'harry-han');
  assert.equal(template.displayName, 'Harry Han');
  assert.equal(template.summary, 'Direct operator with a bias for momentum.');
  assert.deepEqual(template.entries, []);
  assert.deepEqual(template.entryTemplates, {
    text: {
      type: 'text',
      file: 'sample.txt',
      notes: 'long-form writing sample',
    },
    message: {
      type: 'message',
      text: '<paste a representative short message>',
      notes: 'chat sample',
    },
    talk: {
      type: 'talk',
      text: '<paste a transcript snippet>',
      notes: 'voice memo transcript',
    },
    screenshot: {
      type: 'screenshot',
      file: 'images/chat.png',
      notes: 'chat screenshot',
    },
  });

  const intakeReadme = fs.readFileSync(path.join(rootDir, result.intakeReadmePath), 'utf8');
  assert.match(intakeReadme, /Recommended helper commands:/);
  assert.match(intakeReadme, /node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(intakeReadme, /without refreshing drafts: node src\/index\.js import intake --person 'harry-han'/);
  assert.match(intakeReadme, /and refresh drafts: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import intake --person 'harry-han'/);
  assert.match(intakeReadme, /node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(intakeReadme, /node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.' --refresh-foundation/);
  assert.match(intakeReadme, /Direct import commands:/);
  assert.match(intakeReadme, /node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation/);
});

test('CLI update intake preserves existing starter entries and customized entry templates on rerun', () => {
  const rootDir = makeTempRepo();

  const initialOutput = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
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
  const initial = JSON.parse(initialOutput);
  fs.writeFileSync(
    path.join(rootDir, initial.starterManifestPath),
    JSON.stringify({
      personId: 'harry-han',
      displayName: 'Harry Han',
      summary: 'Direct operator with a bias for momentum.',
      entries: [
        {
          type: 'message',
          text: 'Ship the thin slice first.',
          notes: 'favorite chat sample',
        },
      ],
      entryTemplates: {
        text: {
          type: 'text',
          file: 'writing-sample.md',
          notes: 'custom long-form sample',
        },
        talk: {
          type: 'talk',
          text: '<paste a transcript with pauses>',
          notes: 'custom transcript note',
        },
      },
    }, null, 2),
  );

  const output = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
      '--person',
      'Harry Han',
      '--display-name',
      'Harry Forward',
      '--summary',
      'Direct operator with faster loops.',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  const result = JSON.parse(output);

  const template = JSON.parse(fs.readFileSync(path.join(rootDir, result.starterManifestPath), 'utf8'));
  assert.equal(template.personId, 'harry-han');
  assert.equal(template.displayName, 'Harry Forward');
  assert.equal(template.summary, 'Direct operator with faster loops.');
  assert.deepEqual(template.entries, [
    {
      type: 'message',
      text: 'Ship the thin slice first.',
      notes: 'favorite chat sample',
    },
  ]);
  assert.deepEqual(template.entryTemplates, {
    text: {
      type: 'text',
      file: 'writing-sample.md',
      notes: 'custom long-form sample',
    },
    message: {
      type: 'message',
      text: '<paste a representative short message>',
      notes: 'chat sample',
    },
    talk: {
      type: 'talk',
      text: '<paste a transcript with pauses>',
      notes: 'custom transcript note',
    },
    screenshot: {
      type: 'screenshot',
      file: 'images/chat.png',
      notes: 'chat screenshot',
    },
  });
});

test('CLI update intake preserves legacy array-form starter manifests on rerun', () => {
  const rootDir = makeTempRepo();

  const initialOutput = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
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
  const initial = JSON.parse(initialOutput);
  fs.writeFileSync(
    path.join(rootDir, initial.starterManifestPath),
    JSON.stringify([
      {
        type: 'message',
        text: 'Keep this legacy entry intact.',
        notes: 'legacy array manifest sample',
      },
    ], null, 2),
  );

  const output = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
      '--person',
      'Harry Han',
      '--display-name',
      'Harry Forward',
      '--summary',
      'Direct operator with faster loops.',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  const result = JSON.parse(output);

  const template = JSON.parse(fs.readFileSync(path.join(rootDir, result.starterManifestPath), 'utf8'));
  assert.equal(template.personId, 'harry-han');
  assert.equal(template.displayName, 'Harry Forward');
  assert.equal(template.summary, 'Direct operator with faster loops.');
  assert.deepEqual(template.entries, [
    {
      type: 'message',
      text: 'Keep this legacy entry intact.',
      notes: 'legacy array manifest sample',
    },
  ]);
  assert.deepEqual(template.entryTemplates, {
    text: {
      type: 'text',
      file: 'sample.txt',
      notes: 'long-form writing sample',
    },
    message: {
      type: 'message',
      text: '<paste a representative short message>',
      notes: 'chat sample',
    },
    talk: {
      type: 'talk',
      text: '<paste a transcript snippet>',
      notes: 'voice memo transcript',
    },
    screenshot: {
      type: 'screenshot',
      file: 'images/chat.png',
      notes: 'chat screenshot',
    },
  });
});

test('CLI update intake preserves custom README notes on rerun while refreshing generated commands', () => {
  const rootDir = makeTempRepo();

  const initialOutput = execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
      '--person',
      'Harry Han',
      '--display-name',
      'Harry Han',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );
  const initial = JSON.parse(initialOutput);
  const readmePath = path.join(rootDir, initial.intakeReadmePath);
  const originalReadme = fs.readFileSync(readmePath, 'utf8');
  const customizedReadme = originalReadme.replace(
    'Add notes about where future materials should come from.',
    '- Keep pulling from the founder memo folder.\n- Weekly voice notes live in iCloud Drive.',
  );
  fs.writeFileSync(readmePath, customizedReadme);

  execFileSync(
    'node',
    [
      cliEntrypoint,
      'update',
      'intake',
      '--person',
      'Harry Han',
      '--display-name',
      'Harry Forward',
      '--summary',
      'Direct operator with faster loops.',
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
    },
  );

  const rerunReadme = fs.readFileSync(readmePath, 'utf8');
  assert.match(rerunReadme, /# Intake scaffold for Harry Forward/);
  assert.match(rerunReadme, /node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(rerunReadme, /- Keep pulling from the founder memo folder\./);
  assert.match(rerunReadme, /- Weekly voice notes live in iCloud Drive\./);
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
  assert.deepEqual(result.profileSummaries, [
    {
      personId: 'harry-han',
      displayName: 'Harry Han',
      label: 'Harry Han (harry-han)',
      summary: 'Direct operator with a bias for momentum.',
      materialCount: 2,
      materialTypes: {
        message: 1,
        text: 1,
      },
      needsRefresh: false,
      missingDrafts: [],
      importCommand: "node src/index.js import manifest --file 'materials.json'",
      importManifestAndRefreshCommand: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
      updateProfileCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
      updateProfileAndRefreshCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
      refreshFoundationCommand: "node src/index.js update foundation --person 'harry-han'",
      importIntakeWithoutRefreshCommand: "node src/index.js import intake --person 'harry-han'",
      helperCommands: {
        scaffold: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
        importIntakeWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
        importIntake: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
        importManifest: "node src/index.js import manifest --file 'materials.json'",
        importManifestAndRefresh: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
        updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
        updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
        refreshFoundation: "node src/index.js update foundation --person 'harry-han'",
      },
    },
  ]);

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json'), 'utf8'));
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');

  const memoryDraft = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'memory', 'long-term', 'foundation.json'), 'utf8'),
  );
  assert.equal(memoryDraft.displayName, 'Harry Han');
  assert.equal(memoryDraft.entryCount, 2);
});

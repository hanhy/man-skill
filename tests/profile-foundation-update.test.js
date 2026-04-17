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
  assert.equal(result.refreshFoundationCommand, 'node src/index.js update foundation --person harry-han');
  assert.equal(result.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation");
  assert.equal(result.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.importIntakeCommand, 'node src/index.js import intake --person harry-han');
  assert.deepEqual(result.helperCommands, {
    refreshFoundation: 'node src/index.js update foundation --person harry-han',
    updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
    updateIntake: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
    importIntake: 'node src/index.js import intake --person harry-han',
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
  assert.equal(result.refreshFoundationCommand, 'node src/index.js update foundation --person harry-han');
  assert.equal(result.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'");
  assert.equal(result.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation");
  assert.equal(result.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'");
  assert.equal(result.importIntakeCommand, 'node src/index.js import intake --person harry-han');
  assert.deepEqual(result.helperCommands, {
    refreshFoundation: 'node src/index.js update foundation --person harry-han',
    updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'",
    updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation",
    updateIntake: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'",
    importIntake: 'node src/index.js import intake --person harry-han',
  });
  assert.match(result.voiceDraftPath, /profiles\/harry-han\/voice\/README\.md$/);
  assert.equal(fs.existsSync(path.join(rootDir, result.voiceDraftPath)), true);
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

test('CLI import intake --person loads a profile-local starter manifest and refreshes foundation drafts', () => {
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
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.match(result.foundationRefresh.results[0].memoryDraftPath, /profiles\/metadata-only\/memory\/long-term\/foundation\.json$/);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'metadata-only', 'voice', 'README.md')), true);
});

test('CLI import intake --all loads every ready profile-local starter manifest and skips incomplete intake scaffolds', () => {
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

  const output = execFileSync('node', [cliEntrypoint, 'import', 'intake', '--all'], {
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
  assert.deepEqual(result.results.map((entry) => entry.profileIds), [['alpha-ready'], ['beta-ready']]);
  assert.deepEqual(result.results.flatMap((entry) => entry.profileIds), ['alpha-ready', 'beta-ready']);
});

test('CLI import intake --stale loads only ready metadata-only profile-local starter manifests', () => {
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
  assert.equal(result.results.some((entry) => entry.profileIds.includes('imported-already')), false);
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

test('refreshStaleFoundationDrafts repairs malformed markdown foundation drafts', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Repair Person',
    text: 'Ship the first slice.',
  });
  ingestion.refreshFoundationDrafts({ personId: 'Repair Person' });

  const voiceDraftPath = path.join(rootDir, 'profiles', 'repair-person', 'voice', 'README.md');
  const malformedVoiceDraft = '# Voice draft\n\nRepresentative voice excerpts:\n- [message] Ship the first slice.\n';
  fs.writeFileSync(voiceDraftPath, malformedVoiceDraft);

  const result = ingestion.refreshStaleFoundationDrafts();

  assert.equal(result.profileCount, 1);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['repair-person']);

  const repairedVoiceDraft = fs.readFileSync(voiceDraftPath, 'utf8');
  assert.notEqual(repairedVoiceDraft, malformedVoiceDraft);
  assert.match(repairedVoiceDraft, /Generated at: /);
  assert.match(repairedVoiceDraft, /Latest material: .*\(.+\)/);
  assert.match(repairedVoiceDraft, /Source materials: 1 \(message:1\)/);
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
  assert.equal(result.importIntakeCommand, 'node src/index.js import intake --person harry-han');
  assert.equal(result.importManifestCommand, 'node src/index.js import manifest --file profiles/harry-han/imports/materials.template.json --refresh-foundation');
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
      file: '<relative-path-to-image.png>',
      notes: 'chat screenshot',
    },
  });

  const intakeReadme = fs.readFileSync(path.join(rootDir, result.intakeReadmePath), 'utf8');
  assert.match(intakeReadme, /Recommended helper commands:/);
  assert.match(intakeReadme, /node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(intakeReadme, /node src\/index\.js import intake --person harry-han/);
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
      file: '<relative-path-to-image.png>',
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
  assert.match(rerunReadme, /node src\/index\.js import manifest --file profiles\/harry-han\/imports\/materials\.template\.json --refresh-foundation/);
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
      importCommand: 'node src/index.js import manifest --file materials.json',
      updateProfileCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
      updateProfileAndRefreshCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
      refreshFoundationCommand: 'node src/index.js update foundation --person harry-han',
      helperCommands: {
        scaffold: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
        importIntake: 'node src/index.js import intake --person harry-han',
        importManifest: 'node src/index.js import manifest --file materials.json',
        updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
        updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation",
        refreshFoundation: 'node src/index.js update foundation --person harry-han',
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

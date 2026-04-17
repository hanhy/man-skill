import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MaterialIngestion } from '../src/core/material-ingestion.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-test-'));
}

test('imports text, message, talk, and screenshot materials into a profile-specific structure', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const sourceTextPath = path.join(rootDir, 'sample.txt');
  fs.writeFileSync(sourceTextPath, 'Harry writes in short, direct bursts.');

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

  const textMaterial = ingestion.importTextDocument({
    personId: 'harry-han',
    sourceFile: sourceTextPath,
    notes: 'blog fragment',
  });

  const messageMaterial = ingestion.importMessage({
    personId: 'harry-han',
    text: 'I will be there in ten minutes.',
    notes: 'short message sample',
  });

  const talkMaterial = ingestion.importTalkSnippet({
    personId: 'harry-han',
    text: 'We can ship the first slice today and refine tomorrow.',
    notes: 'voice memo transcript',
  });

  const screenshotMaterial = ingestion.importScreenshotSource({
    personId: 'harry-han',
    sourceFile: screenshotPath,
    notes: 'chat screenshot',
  });

  const profilePath = path.join(rootDir, 'profiles', 'harry-han', 'profile.json');
  assert.equal(fs.existsSync(profilePath), true);

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  assert.equal(profile.id, 'harry-han');

  const materialsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials');
  const entries = fs.readdirSync(materialsDir);
  assert.ok(entries.length >= 4);

  const textRecord = JSON.parse(fs.readFileSync(textMaterial.recordPath, 'utf8'));
  assert.equal(textRecord.type, 'text');
  assert.equal(textRecord.personId, 'harry-han');
  assert.match(textRecord.content, /short, direct bursts/);

  const messageRecord = JSON.parse(fs.readFileSync(messageMaterial.recordPath, 'utf8'));
  assert.equal(messageRecord.type, 'message');
  assert.equal(messageRecord.content, 'I will be there in ten minutes.');

  const talkRecord = JSON.parse(fs.readFileSync(talkMaterial.recordPath, 'utf8'));
  assert.equal(talkRecord.type, 'talk');
  assert.equal(talkRecord.content, 'We can ship the first slice today and refine tomorrow.');

  const screenshotRecord = JSON.parse(fs.readFileSync(screenshotMaterial.recordPath, 'utf8'));
  assert.equal(screenshotRecord.type, 'screenshot');
  assert.equal(fs.existsSync(screenshotMaterial.assetPath), true);
  assert.match(screenshotRecord.assetPath, /materials\/screenshots\//);
});

test('importManifest imports mixed material entries across profiles from a JSON manifest', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const textSourcePath = path.join(rootDir, 'post.txt');
  fs.writeFileSync(textSourcePath, 'Move fast, but keep the edges clean.');

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

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
          {
            personId: 'Jane Doe',
            type: 'screenshot',
            file: './chat.png',
            notes: 'visual chat reference',
          },
        ],
      },
      null,
      2,
    ),
  );

  const result = ingestion.importManifest({ manifestFile: manifestPath });

  assert.equal(result.entryCount, 3);
  assert.deepEqual(result.profileIds, ['harry-han', 'jane-doe']);
  assert.deepEqual(result.profileSummaries, [
    {
      personId: 'harry-han',
      displayName: 'Harry Han',
      label: 'Harry Han (harry-han)',
      summary: null,
      materialCount: 2,
      materialTypes: {
        message: 1,
        text: 1,
      },
      needsRefresh: true,
      missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      importCommand: 'node src/index.js import manifest --file materials.json',
      updateProfileCommand: 'node src/index.js update profile --person harry-han',
      refreshFoundationCommand: 'node src/index.js update foundation --person harry-han',
    },
    {
      personId: 'jane-doe',
      displayName: 'Jane Doe',
      label: 'Jane Doe (jane-doe)',
      summary: null,
      materialCount: 1,
      materialTypes: {
        screenshot: 1,
      },
      needsRefresh: true,
      missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      importCommand: 'node src/index.js import manifest --file materials.json',
      updateProfileCommand: 'node src/index.js update profile --person jane-doe',
      refreshFoundationCommand: 'node src/index.js update foundation --person jane-doe',
    },
  ]);
  assert.equal(result.results.map((entry) => entry.type).sort().join(','), 'message,screenshot,text');

  const harryMaterials = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(harryMaterials.length, 2);

  const janeMaterials = fs
    .readdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(janeMaterials.length, 1);
});

test('importManifest supports a single-target shorthand profile and inherits personId into entries', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

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
            notes: 'chat sample',
          },
          {
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

  const result = ingestion.importManifest({ manifestFile: manifestPath });

  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['harry-han']);
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
      needsRefresh: true,
      missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      importCommand: 'node src/index.js import manifest --file materials.json',
      updateProfileCommand: 'node src/index.js update profile --person harry-han',
      refreshFoundationCommand: 'node src/index.js update foundation --person harry-han',
    },
  ]);
  assert.equal(result.results.every((entry) => entry.personId === 'harry-han'), true);

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json'), 'utf8'));
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');

  const materials = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materials.length, 2);
});

test('importManifest rejects manifest entries that reference files outside the repo root', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const outsideFilePath = path.join(os.tmpdir(), `man-skill-outside-${Date.now()}.txt`);
  fs.writeFileSync(outsideFilePath, 'Outside repo content should not be importable.');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        personId: 'Harry Han',
        entries: [
          {
            type: 'text',
            file: outsideFilePath,
          },
        ],
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => ingestion.importManifest({ manifestFile: manifestPath }),
    /outside the repo root/,
  );
  const materialsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials');
  const materialFiles = fs.existsSync(materialsDir)
    ? fs.readdirSync(materialsDir).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json')), false);
});

test('importManifest rejects manifest entries whose symlink targets escape the repo root', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const outsideFilePath = path.join(os.tmpdir(), `man-skill-symlink-outside-${Date.now()}.txt`);
  fs.writeFileSync(outsideFilePath, 'Symlink escape content should not be importable.');

  const samplesDir = path.join(rootDir, 'samples');
  fs.mkdirSync(samplesDir, { recursive: true });
  const symlinkPath = path.join(samplesDir, 'outside-link.txt');
  fs.symlinkSync(outsideFilePath, symlinkPath);

  const manifestPath = path.join(samplesDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        personId: 'Harry Han',
        entries: [
          {
            type: 'text',
            file: './outside-link.txt',
          },
        ],
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => ingestion.importManifest({ manifestFile: manifestPath }),
    /outside the repo root/,
  );
  const materialsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials');
  const materialFiles = fs.existsSync(materialsDir)
    ? fs.readdirSync(materialsDir).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json')), false);
});

test('importManifest resolves relative entry files from the real manifest location when invoked through a symlink', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const samplesDir = path.join(rootDir, 'samples');
  fs.mkdirSync(samplesDir, { recursive: true });
  fs.writeFileSync(path.join(samplesDir, 'post.txt'), 'Ship the thin slice first.');
  fs.writeFileSync(
    path.join(samplesDir, 'materials.json'),
    JSON.stringify(
      {
        personId: 'Harry Han',
        entries: [
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
  const symlinkManifestPath = path.join(rootDir, 'linked-materials.json');
  fs.symlinkSync(path.join(samplesDir, 'materials.json'), symlinkManifestPath);

  const result = ingestion.importManifest({ manifestFile: symlinkManifestPath });

  assert.equal(result.entryCount, 1);
  assert.deepEqual(result.profileIds, ['harry-han']);
  const materialFiles = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materialFiles.length, 1);
});

test('importManifest profile summaries keep current manifest counts while surfacing cumulative refresh state', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Older material that should not change this import summary.',
    notes: 'existing sample',
  });

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        entries: [
          {
            personId: 'Harry Han',
            type: 'talk',
            text: 'Ship the thin slice first, then refine.',
            notes: 'execution heuristic',
          },
        ],
      },
      null,
      2,
    ),
  );

  const result = ingestion.importManifest({ manifestFile: manifestPath });

  assert.deepEqual(result.profileSummaries, [
    {
      personId: 'harry-han',
      displayName: 'Harry Han',
      label: 'Harry Han (harry-han)',
      summary: null,
      materialCount: 1,
      materialTypes: {
        talk: 1,
      },
      needsRefresh: true,
      missingDrafts: ['memory', 'skills', 'soul', 'voice'],
      importCommand: 'node src/index.js import manifest --file materials.json',
      updateProfileCommand: 'node src/index.js update profile --person harry-han',
      refreshFoundationCommand: 'node src/index.js update foundation --person harry-han',
    },
  ]);
});

test('importManifest can refresh foundation drafts before returning profile summaries', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

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
        ],
      },
      null,
      2,
    ),
  );

  const result = ingestion.importManifest({ manifestFile: manifestPath, refreshFoundation: true });

  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.equal(result.foundationRefresh.results[0].personId, 'harry-han');
  assert.deepEqual(result.profileSummaries, [
    {
      personId: 'harry-han',
      displayName: 'Harry Han',
      label: 'Harry Han (harry-han)',
      summary: 'Direct operator with a bias for momentum.',
      materialCount: 1,
      materialTypes: {
        message: 1,
      },
      needsRefresh: false,
      missingDrafts: [],
      importCommand: 'node src/index.js import manifest --file materials.json',
      updateProfileCommand: 'node src/index.js update profile --person harry-han',
      refreshFoundationCommand: 'node src/index.js update foundation --person harry-han',
    },
  ]);
});

test('updateProfile stores display name and summary metadata for a target person', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const result = ingestion.updateProfile({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });

  assert.equal(result.personId, 'harry-han');
  assert.equal(result.profile.displayName, 'Harry Han');
  assert.equal(result.profile.summary, 'Direct operator with a bias for momentum.');

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json'), 'utf8'));
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');
  assert.match(profile.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('scaffoldProfileIntake creates starter intake files without importing placeholder materials', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const result = ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });

  assert.equal(result.personId, 'harry-han');
  assert.equal(result.profile.displayName, 'Harry Han');
  assert.equal(result.profile.summary, 'Direct operator with a bias for momentum.');
  assert.equal(result.importManifestCommand, 'node src/index.js import manifest --file profiles/harry-han/imports/materials.template.json --refresh-foundation');
  assert.deepEqual(result.importCommands, {
    text: "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation",
    message: 'node src/index.js import message --person harry-han --text <message> --refresh-foundation',
    talk: 'node src/index.js import talk --person harry-han --text <snippet> --refresh-foundation',
    screenshot: 'node src/index.js import screenshot --person harry-han --file <image.png> --refresh-foundation',
  });

  const templatePath = path.join(rootDir, result.starterManifestPath);
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
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
  assert.match(intakeReadme, /Direct import commands:/);
  assert.match(intakeReadme, /node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import message --person harry-han --text <message> --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import talk --person harry-han --text <snippet> --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import screenshot --person harry-han --file <image\.png> --refresh-foundation/);

  const sampleText = fs.readFileSync(path.join(rootDir, result.sampleTextPath), 'utf8');
  assert.match(sampleText, /Replace this file with a real writing sample for Harry Han/i);

  const materialsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials');
  const materialFiles = fs.existsSync(materialsDir)
    ? fs.readdirSync(materialsDir).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
});

test('scaffoldProfileIntake preserves existing starter entries and customized entry templates on rerun', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const initial = ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  const templatePath = path.join(rootDir, initial.starterManifestPath);
  fs.writeFileSync(
    templatePath,
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

  const rerun = ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Forward',
    summary: 'Direct operator with faster loops.',
  });
  const template = JSON.parse(fs.readFileSync(path.join(rootDir, rerun.starterManifestPath), 'utf8'));

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

test('scaffoldStaleProfileIntakes refreshes only metadata-only profiles with missing or partial intake scaffolds', () => {
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

  const result = ingestion.scaffoldStaleProfileIntakes();

  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['zeta-partial', 'alpha-missing']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports', 'materials.template.json')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports', 'sample.txt')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-missing', 'imports', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'README.md')), true);
});

test('scaffoldAllProfileIntakes reruns intake scaffolding for every metadata-only profile', () => {
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

  const result = ingestion.scaffoldAllProfileIntakes();

  assert.equal(result.profileCount, 2);
  assert.deepEqual(result.results.map((entry) => entry.personId), ['alpha-missing', 'beta-ready']);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'alpha-missing', 'imports', 'materials.template.json')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'beta-ready', 'imports', 'materials.template.json')), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSummary } from '../src/index.js';
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
  assert.equal(profile.displayName, 'Harry Han');

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

test('direct message imports skip unchanged reruns and keep material records flat', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const firstResult = ingestion.importMessage({
    personId: 'harry-han',
    text: 'I will be there in ten minutes.',
    notes: 'short message sample',
  });
  const secondResult = ingestion.importMessage({
    personId: 'harry-han',
    text: 'I will be there in ten minutes.',
    notes: 'short message sample',
  });

  assert.equal(typeof firstResult.recordPath, 'string');
  assert.equal(firstResult.skipped, false);
  assert.equal(secondResult.recordPath, null);
  assert.equal(secondResult.assetPath, null);
  assert.equal(secondResult.skipped, true);
  assert.equal(typeof secondResult.fingerprint, 'string');

  const materialRecords = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materialRecords.length, 1);
});

test('direct screenshot imports skip unchanged reruns before copying duplicate assets', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

  const firstResult = ingestion.importScreenshotSource({
    personId: 'harry-han',
    sourceFile: screenshotPath,
    notes: 'chat screenshot',
  });
  const screenshotAssetsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials', 'screenshots');
  const firstAssetNames = fs.readdirSync(screenshotAssetsDir);

  const secondResult = ingestion.importScreenshotSource({
    personId: 'harry-han',
    sourceFile: screenshotPath,
    notes: 'chat screenshot',
  });
  const secondAssetNames = fs.readdirSync(screenshotAssetsDir);

  assert.equal(firstResult.skipped, false);
  assert.equal(fs.existsSync(firstResult.assetPath), true);
  assert.equal(firstAssetNames.length, 1);
  assert.equal(secondResult.skipped, true);
  assert.equal(secondResult.recordPath, null);
  assert.equal(secondResult.assetPath, null);
  assert.deepEqual(secondAssetNames, firstAssetNames);

  const materialRecords = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materialRecords.length, 1);
});

test('direct message and talk imports reject whitespace-only text without writing records', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  assert.throws(
    () => ingestion.importMessage({
      personId: 'harry-han',
      text: '   ',
    }),
    /text is required for message import/,
  );

  assert.throws(
    () => ingestion.importTalkSnippet({
      personId: 'harry-han',
      text: '   ',
    }),
    /text is required for talk import/,
  );

  const materialsDir = path.join(rootDir, 'profiles', 'harry-han', 'materials');
  assert.equal(fs.existsSync(materialsDir), false);
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
      importCommand: "node src/index.js import manifest --file 'materials.json'",
      importManifestAndRefreshCommand: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
      updateProfileCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'",
      updateProfileAndRefreshCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation",
      refreshFoundationCommand: "node src/index.js update foundation --person 'harry-han'",
      importIntakeWithoutRefreshCommand: "node src/index.js import intake --person 'harry-han'",
      helperCommands: {
        scaffold: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'",
        importIntakeWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
        importIntake: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
        importManifest: "node src/index.js import manifest --file 'materials.json'",
        importManifestAndRefresh: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
        updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'",
        updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation",
        refreshFoundation: "node src/index.js update foundation --person 'harry-han'",
      },
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
      importCommand: "node src/index.js import manifest --file 'materials.json'",
      importManifestAndRefreshCommand: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
      updateProfileCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'",
      updateProfileAndRefreshCommand: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
      refreshFoundationCommand: "node src/index.js update foundation --person 'jane-doe'",
      importIntakeWithoutRefreshCommand: "node src/index.js import intake --person 'jane-doe'",
      helperCommands: {
        scaffold: "node src/index.js update intake --person 'jane-doe' --display-name 'Jane Doe'",
        importIntakeWithoutRefresh: "node src/index.js import intake --person 'jane-doe'",
        importIntake: "node src/index.js import intake --person 'jane-doe' --refresh-foundation",
        importManifest: "node src/index.js import manifest --file 'materials.json'",
        importManifestAndRefresh: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
        updateProfile: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe'",
        updateProfileAndRefresh: "node src/index.js update profile --person 'jane-doe' --display-name 'Jane Doe' --refresh-foundation",
        refreshFoundation: "node src/index.js update foundation --person 'jane-doe'",
      },
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

test('importManifest accepts UTF-8 BOM-prefixed manifest files', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const textSourcePath = path.join(rootDir, 'post.txt');
  fs.writeFileSync(textSourcePath, 'Move fast, but keep the edges clean.');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    `\uFEFF${JSON.stringify({
      entries: [
        {
          personId: 'Harry Han',
          type: 'text',
          file: './post.txt',
          notes: 'blog fragment',
        },
      ],
    }, null, 2)}`,
  );

  const result = ingestion.importManifest({ manifestFile: manifestPath });

  assert.equal(result.entryCount, 1);
  assert.deepEqual(result.profileIds, ['harry-han']);
  assert.deepEqual(result.profileSummaries.map((entry) => entry.personId), ['harry-han']);
});

test('importManifest skips unchanged entries when the same manifest is rerun', () => {
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

  const firstResult = ingestion.importManifest({ manifestFile: manifestPath });
  const secondResult = ingestion.importManifest({ manifestFile: manifestPath });

  assert.equal(firstResult.entryCount, 3);
  assert.equal(firstResult.manifestEntryCount, 3);
  assert.equal(firstResult.skippedEntryCount, 0);
  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.manifestEntryCount, 3);
  assert.equal(secondResult.skippedEntryCount, 3);
  assert.deepEqual(secondResult.results, []);
  assert.deepEqual(secondResult.profileIds, []);
  assert.deepEqual(secondResult.profileSummaries, []);

  const harryMaterials = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(harryMaterials.length, 2);

  const janeMaterials = fs
    .readdirSync(path.join(rootDir, 'profiles', 'jane-doe', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(janeMaterials.length, 1);
});

test('importManifest skips legacy screenshot entries when an existing screenshot record is missing fingerprint', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        entries: [
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

  const firstResult = ingestion.importManifest({ manifestFile: manifestPath });
  assert.equal(firstResult.entryCount, 1);
  assert.equal(firstResult.skippedEntryCount, 0);

  const materialsDir = path.join(rootDir, 'profiles', 'jane-doe', 'materials');
  const [recordFileName] = fs.readdirSync(materialsDir).filter((name) => name.endsWith('.json'));
  const recordPath = path.join(materialsDir, recordFileName);
  const legacyRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  delete legacyRecord.fingerprint;
  fs.writeFileSync(recordPath, JSON.stringify(legacyRecord, null, 2));

  const secondResult = ingestion.importManifest({ manifestFile: manifestPath });
  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.manifestEntryCount, 1);
  assert.equal(secondResult.skippedEntryCount, 1);
  assert.deepEqual(secondResult.results, []);

  const screenshotRecords = fs
    .readdirSync(materialsDir)
    .filter((name) => name.endsWith('.json'));
  assert.equal(screenshotRecords.length, 1);
});

test('importManifest skips legacy screenshot entries when the copied asset is missing but the original source file remains', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        entries: [
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

  const firstResult = ingestion.importManifest({ manifestFile: manifestPath });
  assert.equal(firstResult.entryCount, 1);

  const materialsDir = path.join(rootDir, 'profiles', 'jane-doe', 'materials');
  const [recordFileName] = fs.readdirSync(materialsDir).filter((name) => name.endsWith('.json'));
  const recordPath = path.join(materialsDir, recordFileName);
  const legacyRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  delete legacyRecord.fingerprint;
  fs.writeFileSync(recordPath, JSON.stringify(legacyRecord, null, 2));
  fs.rmSync(path.join(rootDir, legacyRecord.assetPath));

  const secondResult = ingestion.importManifest({ manifestFile: manifestPath });
  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.skippedEntryCount, 1);

  const screenshotRecords = fs
    .readdirSync(materialsDir)
    .filter((name) => name.endsWith('.json'));
  assert.equal(screenshotRecords.length, 1);
});

test('importManifest uses the checked-in Harry starter manifest as a runnable multimodal sample fixture', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const fixtureDir = path.resolve('samples');
  const targetSamplesDir = path.join(rootDir, 'samples');
  fs.mkdirSync(targetSamplesDir, { recursive: true });

  for (const fileName of ['harry-materials.json', 'harry-post.txt', 'harry-chat.png']) {
    fs.copyFileSync(path.join(fixtureDir, fileName), path.join(targetSamplesDir, fileName));
  }

  const result = ingestion.importManifest({
    manifestFile: path.join('samples', 'harry-materials.json'),
    refreshFoundation: true,
  });

  assert.equal(result.entryCount, 4);
  assert.deepEqual(result.profileIds, ['harry-han']);
  assert.equal(result.profileSummaries[0]?.materialCount, 4);
  assert.deepEqual(result.profileSummaries[0]?.materialTypes, {
    message: 1,
    screenshot: 1,
    talk: 1,
    text: 1,
  });
  assert.equal(result.profileSummaries[0]?.needsRefresh, false);
  assert.deepEqual(result.profileSummaries[0]?.missingDrafts, []);
  assert.equal(result.results.map((entry) => entry.type).sort().join(','), 'message,screenshot,talk,text');

  const summary = buildSummary(rootDir);
  const harryProfile = summary.profiles.find((profile) => profile.id === 'harry-han');
  assert.equal(summary.ingestion.sampleManifestEntryCount, 4);
  assert.deepEqual(summary.ingestion.sampleManifestFilePaths, ['samples/harry-post.txt', 'samples/harry-chat.png']);
  assert.deepEqual(summary.ingestion.sampleManifestMaterialTypes, {
    message: 1,
    screenshot: 1,
    talk: 1,
    text: 1,
  });
  assert.equal(summary.ingestion.helperCommands?.sampleScreenshot, "node src/index.js import screenshot --person harry-han --file 'samples/harry-chat.png' --refresh-foundation");
  assert.match(summary.promptPreview, /sample screenshot: harry-han -> node src\/index\.js import screenshot --person harry-han --file 'samples\/harry-chat\.png' --refresh-foundation/);
  assert.equal(harryProfile?.materialCount, 4);
  assert.equal(harryProfile?.foundationDraftStatus?.complete, true);
  assert.equal(harryProfile?.screenshotCount, 1);
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
  assert.equal(result.results.every((entry) => entry.personId === 'harry-han'), true);

  const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json'), 'utf8'));
  assert.equal(profile.displayName, 'Harry Han');
  assert.equal(profile.summary, 'Direct operator with a bias for momentum.');

  const materials = fs
    .readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    .filter((name) => name.endsWith('.json'));
  assert.equal(materials.length, 2);
});

test('importManifest rejects entries that target profiles not declared in a multi-profile manifest', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        profiles: [{ personId: 'Harry Han', displayName: 'Harry Han' }],
        entries: [{ personId: 'Jane Doe', type: 'message', text: 'This should not import.' }],
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => ingestion.importManifest({ manifestFile: manifestPath }),
    /Manifest entry 0 targets undeclared profile: jane-doe/,
  );
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'jane-doe', 'profile.json')), false);
});

test('importManifest rejects shorthand manifests whose entries target a different profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const manifestPath = path.join(rootDir, 'materials.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        personId: 'Harry Han',
        displayName: 'Harry Han',
        entries: [{ personId: 'Jane Doe', type: 'message', text: 'This should not import.' }],
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => ingestion.importManifest({ manifestFile: manifestPath }),
    /Manifest entry 0 targets a different profile than manifest\.personId: expected harry-han/,
  );
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'profile.json')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'jane-doe', 'profile.json')), false);
});

test('importManifest shell-quotes manifest helper commands when the manifest path contains spaces', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  const textSourcePath = path.join(rootDir, 'post.txt');
  fs.writeFileSync(textSourcePath, 'Move fast, but keep the edges clean.');

  const manifestPath = path.join(rootDir, 'materials with spaces.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        personId: 'Harry Han',
        displayName: 'Harry Han',
        entries: [
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

  assert.equal(result.profileSummaries[0].importCommand, "node src/index.js import manifest --file 'materials with spaces.json'");
  assert.equal(result.profileSummaries[0].helperCommands.importManifest, "node src/index.js import manifest --file 'materials with spaces.json'");
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
      importCommand: "node src/index.js import manifest --file 'materials.json'",
      importManifestAndRefreshCommand: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
      updateProfileCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'",
      updateProfileAndRefreshCommand: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation",
      refreshFoundationCommand: "node src/index.js update foundation --person 'harry-han'",
      importIntakeWithoutRefreshCommand: "node src/index.js import intake --person 'harry-han'",
      helperCommands: {
        scaffold: "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'",
        importIntakeWithoutRefresh: "node src/index.js import intake --person 'harry-han'",
        importIntake: "node src/index.js import intake --person 'harry-han' --refresh-foundation",
        importManifest: "node src/index.js import manifest --file 'materials.json'",
        importManifestAndRefresh: "node src/index.js import manifest --file 'materials.json' --refresh-foundation",
        updateProfile: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han'",
        updateProfileAndRefresh: "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --refresh-foundation",
        refreshFoundation: "node src/index.js update foundation --person 'harry-han'",
      },
    },
  ]);
});

test('importManifest returns profile command summaries that stay aligned with manifest imports and profile metadata', () => {
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
});

test('importManifest refreshes foundation drafts for unchanged replayed manifests when refreshFoundation is true', () => {
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

  const firstResult = ingestion.importManifest({ manifestFile: manifestPath, refreshFoundation: true });
  const secondResult = ingestion.importManifest({ manifestFile: manifestPath, refreshFoundation: true });

  assert.equal(firstResult.foundationRefresh.profileCount, 1);
  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.skippedEntryCount, 1);
  assert.deepEqual(secondResult.results, []);
  assert.deepEqual(secondResult.profileIds, ['harry-han']);
  assert.equal(secondResult.foundationRefresh.profileCount, 1);
  assert.equal(secondResult.foundationRefresh.results[0].personId, 'harry-han');
  assert.deepEqual(secondResult.profileSummaries.map((entry) => entry.personId), ['harry-han']);
  assert.equal(secondResult.profileSummaries[0].materialCount, 0);
  assert.deepEqual(secondResult.profileSummaries[0].materialTypes, {});
  assert.equal(secondResult.profileSummaries[0].needsRefresh, false);
  assert.deepEqual(secondResult.profileSummaries[0].missingDrafts, []);
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
  assert.equal(result.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.equal(result.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.' --refresh-foundation");
  assert.equal(result.importManifestCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(result.importCommands, {
    text: "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation",
    message: 'node src/index.js import message --person harry-han --text <message> --refresh-foundation',
    talk: 'node src/index.js import talk --person harry-han --text <snippet> --refresh-foundation',
    screenshot: "node src/index.js import screenshot --person harry-han --file 'profiles/harry-han/imports/images/chat.png' --refresh-foundation",
  });
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
      screenshot: "node src/index.js import screenshot --person harry-han --file 'profiles/harry-han/imports/images/chat.png' --refresh-foundation",
    },
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
      file: 'images/chat.png',
      notes: 'chat screenshot',
    },
  });

  const intakeReadme = fs.readFileSync(path.join(rootDir, result.intakeReadmePath), 'utf8');
  assert.match(intakeReadme, /Starter image folder: profiles\/harry-han\/imports\/images/);
  assert.match(intakeReadme, /Direct import commands:/);
  assert.match(intakeReadme, /node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import message --person harry-han --text <message> --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import talk --person harry-han --text <snippet> --refresh-foundation/);
  assert.match(intakeReadme, /node src\/index\.js import screenshot --person harry-han --file 'profiles\/harry-han\/imports\/images\/chat\.png' --refresh-foundation/);

  const sampleText = fs.readFileSync(path.join(rootDir, result.sampleTextPath), 'utf8');
  assert.match(sampleText, /Replace this file with a real writing sample for Harry Han/i);
  const sampleScreenshotPath = path.join(rootDir, 'profiles', 'harry-han', 'imports', 'images', 'chat.png');
  assert.equal(fs.existsSync(sampleScreenshotPath), true);
  assert.equal(fs.readFileSync(sampleScreenshotPath).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'imports', 'images')), true);

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
      file: 'images/chat.png',
      notes: 'chat screenshot',
    },
  });
});

test('scaffoldProfileIntake preserves legacy array-form starter manifests on rerun', () => {
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
    JSON.stringify([
      {
        type: 'message',
        text: 'Keep this legacy entry intact.',
        notes: 'legacy array manifest sample',
      },
    ], null, 2),
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

test('scaffoldProfileIntake rebuilds parseable starter manifests that target a different profile', () => {
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
      personId: 'jane-doe',
      displayName: 'Jane Doe',
      summary: 'Wrong profile payload.',
      entries: [
        {
          personId: 'jane-doe',
          type: 'message',
          text: 'This should not survive the repair pass.',
          notes: 'wrong owner entry',
        },
      ],
      entryTemplates: {
        text: {
          type: 'text',
          file: 'other-sample.txt',
          personId: 'jane-doe',
          notes: 'wrong owner template',
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

test('importAllProfileIntakeManifests aggregates profileSummaries and top-level foundationRefresh like importManifest', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Alpha Ready',
    displayName: 'Alpha Ready',
    summary: 'Ready intake manifest.',
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
    text: 'Already imported, so the local intake manifest should rerun cleanly.',
  });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'alpha-ready', 'imports', 'sample.txt'), 'Alpha sample.\n');
  fs.writeFileSync(path.join(rootDir, 'profiles', 'imported-already', 'imports', 'sample.txt'), 'Imported again.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'alpha-ready', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Alpha Ready',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'imported-already', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Imported Already',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  const result = ingestion.importAllProfileIntakeManifests({ refreshFoundation: true });

  assert.equal(result.profileCount, 2);
  assert.equal(result.entryCount, 2);
  assert.deepEqual(result.profileIds, ['alpha-ready', 'imported-already']);
  assert.deepEqual(result.profileSummaries.map((entry) => entry.personId), ['alpha-ready', 'imported-already']);
  assert.equal(result.profileSummaries[0].label, 'Alpha Ready (alpha-ready)');
  assert.equal(result.profileSummaries[0].materialCount, 1);
  assert.deepEqual(result.profileSummaries[0].missingDrafts, []);
  assert.equal(result.profileSummaries[1].label, 'Imported Already (imported-already)');
  assert.equal(result.profileSummaries[1].materialCount, 1);
  assert.deepEqual(result.profileSummaries[1].materialTypes, { text: 1 });
  assert.equal(result.foundationRefresh.profileCount, 2);
  assert.deepEqual(result.foundationRefresh.results.map((entry) => entry.personId), ['alpha-ready', 'imported-already']);
  assert.match(result.foundationRefresh.results[0].voiceDraftPath, /profiles\/alpha-ready\/voice\/README\.md$/);
  assert.match(result.foundationRefresh.results[1].voiceDraftPath, /profiles\/imported-already\/voice\/README\.md$/);
});

test('importImportedProfileIntakeManifests skips imported profiles whose local intake manifest is still the starter scaffold', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Starter Only',
    text: 'This imported profile still has the untouched starter manifest.',
  });
  ingestion.importMessage({
    personId: 'Loaded Intake',
    text: 'This imported profile customized its local intake manifest.',
  });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'loaded-intake', 'imports', 'sample.txt'), 'Loaded intake sample.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'loaded-intake', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Loaded Intake',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  const result = ingestion.importImportedProfileIntakeManifests({ refreshFoundation: true });

  assert.equal(result.profileCount, 1);
  assert.equal(result.entryCount, 1);
  assert.deepEqual(result.profileIds, ['loaded-intake']);
  assert.deepEqual(result.profileSummaries.map((entry) => entry.personId), ['loaded-intake']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.deepEqual(result.foundationRefresh.results.map((entry) => entry.personId), ['loaded-intake']);
});

test('importStaleProfileIntakeManifests skips metadata-only profiles whose local intake manifest is still the starter scaffold', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Starter Only',
    displayName: 'Starter Only',
    summary: 'This metadata-only profile still has the untouched starter manifest.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Loaded Intake',
    displayName: 'Loaded Intake',
    summary: 'This metadata-only profile customized its local intake manifest.',
  });

  fs.writeFileSync(path.join(rootDir, 'profiles', 'loaded-intake', 'imports', 'sample.txt'), 'Loaded intake sample.\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'loaded-intake', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'Loaded Intake',
      entries: [{ type: 'text', file: 'sample.txt' }],
    }, null, 2),
  );

  const result = ingestion.importStaleProfileIntakeManifests({ refreshFoundation: true });

  assert.equal(result.profileCount, 1);
  assert.equal(result.entryCount, 1);
  assert.deepEqual(result.profileIds, ['loaded-intake']);
  assert.deepEqual(result.profileSummaries.map((entry) => entry.personId), ['loaded-intake']);
  assert.equal(result.foundationRefresh.profileCount, 1);
  assert.deepEqual(result.foundationRefresh.results.map((entry) => entry.personId), ['loaded-intake']);
});

test('importProfileIntakeManifest preserves replayed profile summaries on skipped no-refresh reruns', () => {
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

  const firstResult = ingestion.importProfileIntakeManifest({ personId: 'imported-ready', refreshFoundation: false });
  const secondResult = ingestion.importProfileIntakeManifest({ personId: 'imported-ready', refreshFoundation: false });

  assert.equal(firstResult.entryCount, 1);
  assert.deepEqual(firstResult.profileIds, ['imported-ready']);
  assert.deepEqual(firstResult.profileSummaries.map((entry) => entry.personId), ['imported-ready']);

  assert.equal(secondResult.entryCount, 0);
  assert.equal(secondResult.skippedEntryCount, 1);
  assert.deepEqual(secondResult.profileIds, ['imported-ready']);
  assert.deepEqual(secondResult.profileSummaries.map((entry) => entry.personId), ['imported-ready']);
  assert.equal(secondResult.profileSummaries[0].materialCount, 0);
  assert.deepEqual(secondResult.profileSummaries[0].materialTypes, {});
});

test('importProfileIntakeManifest explains how to promote starter templates into entries before rerunning imported profile intake', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Starter Only',
    text: 'This imported profile still has the untouched starter manifest.',
  });

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'starter-only', refreshFoundation: true }),
    /Profile intake manifest still contains only starter templates: starter-only @ profiles\/starter-only\/imports\/materials\.template\.json — copy entryTemplates into entries\[\] and fill in real content \(templates: message, screenshot, talk, text\); then rerun node src\/index\.js import intake --person 'starter-only' to inspect or node src\/index\.js import intake --person 'starter-only' --refresh-foundation to import and refresh drafts/,
  );
});

test('importManifest explains how to promote starter templates into entries before rerunning a starter manifest', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Starter Only',
    displayName: 'Starter Only',
    summary: 'Starter-template manifest should fail with actionable guidance.',
  });

  const starterManifestPath = path.join(rootDir, 'profiles', 'starter-only', 'imports', 'materials.template.json');

  assert.throws(
    () => ingestion.importManifest({ manifestFile: starterManifestPath, refreshFoundation: true }),
    /Manifest still contains only starter templates: profiles\/starter-only\/imports\/materials\.template\.json — copy entryTemplates into entries\[\] and fill in real content \(templates: message, screenshot, talk, text\); then rerun node src\/index\.js import manifest --file 'profiles\/starter-only\/imports\/materials\.template\.json' to inspect or node src\/index\.js import manifest --file 'profiles\/starter-only\/imports\/materials\.template\.json' --refresh-foundation to import and refresh drafts/,
  );
});

test('importImportedProfileIntakeManifests still surfaces invalid imported intake manifests instead of silently skipping them', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Broken Intake',
    text: 'This imported profile has a malformed local intake manifest.',
  });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'broken-intake', 'imports', 'materials.template.json'), '{ invalid json\n');

  assert.throws(
    () => ingestion.importImportedProfileIntakeManifests({ refreshFoundation: true }),
    /Unexpected token|Expected property name|JSON/i,
  );
});

test('importStaleProfileIntakeManifests still surfaces invalid metadata-only intake manifests instead of silently skipping them', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Broken Intake',
    displayName: 'Broken Intake',
    summary: 'This metadata-only profile has a malformed local intake manifest.',
  });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'broken-intake', 'imports', 'materials.template.json'), '{ invalid json\n');

  assert.throws(
    () => ingestion.importStaleProfileIntakeManifests({ refreshFoundation: true }),
    /Unexpected token|Expected property name|JSON/i,
  );
});

test('importAllProfileIntakeManifests still surfaces invalid ready intake manifests instead of silently skipping them', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Broken Intake',
    displayName: 'Broken Intake',
    summary: 'This ready intake manifest is malformed and should still fail loudly.',
  });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'broken-intake', 'imports', 'materials.template.json'), '{ invalid json\n');

  assert.throws(
    () => ingestion.importAllProfileIntakeManifests({ refreshFoundation: true }),
    /Unexpected token|Expected property name|JSON/i,
  );
});

test('importProfileIntakeManifest rejects a profile-local manifest that targets a different profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'jane-doe',
      entries: [
        {
          type: 'message',
          text: 'This should stay bound to the owning profile.',
        },
      ],
    }, null, 2),
  );

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'harry-han', refreshFoundation: true }),
    /targets a different profile/i,
  );

  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'jane-doe')), false);
  const materialFiles = fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    ? fs.readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials')).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
});

test('importProfileIntakeManifest rejects a profile-local manifest whose profiles array seeds a different profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'harry-han',
      profiles: [
        {
          personId: 'Jane Doe',
          displayName: 'Jane Doe',
          summary: 'This metadata should not escape the local intake owner.',
        },
      ],
      entries: [
        {
          type: 'message',
          text: 'Keep this manifest scoped to Harry only.',
        },
      ],
    }, null, 2),
  );

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'harry-han', refreshFoundation: true }),
    /targets a different profile/i,
  );

  assert.equal(fs.existsSync(path.join(rootDir, 'profiles', 'jane-doe')), false);
  const materialFiles = fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    ? fs.readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials')).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
});

test('importProfileIntakeManifest rejects a profile-local manifest entry with missing message text', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'harry-han',
      entries: [
        {
          type: 'message',
          notes: 'missing the actual message body',
        },
      ],
    }, null, 2),
  );

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'harry-han', refreshFoundation: true }),
    /Manifest entry 0 is missing text for message import/,
  );
  const materialFiles = fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    ? fs.readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials')).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
});

test('importProfileIntakeManifest rejects a profile-local manifest entry that references a missing text file', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'harry-han',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
          notes: 'the file does not exist yet',
        },
      ],
    }, null, 2),
  );

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'harry-han', refreshFoundation: true }),
    /Profile intake manifest is not ready for import: harry-han @ profiles\/harry-han\/imports\/materials\.template\.json — Manifest entry 0 references a missing file: missing-post\.txt/,
  );
  const materialFiles = fs.existsSync(path.join(rootDir, 'profiles', 'harry-han', 'materials'))
    ? fs.readdirSync(path.join(rootDir, 'profiles', 'harry-han', 'materials')).filter((name) => name.endsWith('.json'))
    : [];
  assert.deepEqual(materialFiles, []);
});

test('importProfileIntakeManifest rejects a starter profile-local manifest that targets a different profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.importMessage({
    personId: 'Harry Han',
    text: 'Starter scaffolds must stay bound to their owning profile.',
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

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'harry-han', refreshFoundation: true }),
    /targets a different profile/i,
  );
});

test('importProfileIntakeManifest rejects a starter profile-local manifest that references a missing starter file', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'harry-han',
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

  assert.throws(
    () => ingestion.importProfileIntakeManifest({ personId: 'harry-han', refreshFoundation: true }),
    /missing file: missing-post\.txt/i,
  );
});

test('buildSummary prompt preview keeps starter-only metadata intake templates off the import-intake shortcut path', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

  ingestion.scaffoldProfileIntake({
    personId: 'Harry Han',
    displayName: 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.metadataProfileCommands[0].importIntakeCommand, null);
  assert.match(summary.promptPreview, /metadata-only intake scaffolds: 0 import-ready, 1 starter template, 0 partial, 0 missing/);
  assert.match(summary.promptPreview, /Harry Han \(harry-han\): 0 materials \(no typed materials\), intake starter template — add entries before import \(templates: message, screenshot, talk, text\); starter details message <paste a representative short message> \| screenshot images\/chat\.png \| talk <paste a transcript snippet> \| text sample\.txt \| refresh-intake node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.' \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation \| import node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation \| update node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
});

test('buildSummary exposes bundled profile-specific intake scaffold and import commands for metadata-only profiles', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);

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
  ingestion.scaffoldProfileIntake({
    personId: 'Gamma Ready',
    displayName: 'Gamma Ready',
    summary: 'Ready to import the first batch.',
  });
  ingestion.scaffoldProfileIntake({
    personId: 'Delta Ready',
    displayName: 'Delta Ready',
    summary: 'Also ready to import the first batch.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(
    summary.ingestion.helperCommands.scaffoldBundle,
    "(node src/index.js update intake --person 'beta-partial' --display-name 'Beta Partial' --summary 'Needs the intake scaffold completed.') && (node src/index.js update intake --person 'alpha-missing' --display-name 'Alpha Missing' --summary 'Needs a fresh intake scaffold.')",
  );
  assert.equal(
    summary.ingestion.helperCommands.importIntakeBundle,
    null,
  );
  assert.match(summary.promptPreview, /metadata-only intake scaffolds: 0 import-ready, 2 starter templates, 1 partial, 1 missing/);
  assert.doesNotMatch(summary.promptPreview, /import-bundle /);
});

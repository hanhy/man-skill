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

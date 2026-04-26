import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { inspectProfileIntakeManifest } from '../src/core/intake-manifest.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-intake-manifest-'));
}

test('inspectProfileIntakeManifest slash-normalizes starter entry template detail file paths', () => {
  const rootDir = makeTempRepo();
  const importsDir = path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'images');
  fs.mkdirSync(importsDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'sample.txt'), 'sample text\n');
  fs.writeFileSync(path.join(importsDir, 'missing-chat.png'), 'fake image payload\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [],
      entryTemplates: {
        text: { file: '.\\sample.txt' },
        message: { text: '<paste a representative short message>' },
        talk: { text: '<paste a transcript snippet>' },
        screenshot: { file: '.\\images\\missing-chat.png' },
      },
    }, null, 2),
  );

  const manifest = inspectProfileIntakeManifest({
    rootDir,
    starterManifestPath: 'profiles/metadata-only/imports/materials.template.json',
    expectedPersonId: 'metadata-only',
  });

  assert.equal(manifest.status, 'starter');
  assert.deepEqual(manifest.entryTemplateDetails, [
    { type: 'message', source: 'text', path: null, preview: '<paste a representative short message>' },
    { type: 'screenshot', source: 'file', path: 'images/missing-chat.png', preview: null },
    { type: 'talk', source: 'text', path: null, preview: '<paste a transcript snippet>' },
    { type: 'text', source: 'file', path: 'sample.txt', preview: null },
  ]);
});

test('inspectProfileIntakeManifest accepts absolute in-repo files for profile-local text entries', () => {
  const rootDir = makeTempRepo();
  const importsDir = path.join(rootDir, 'profiles', 'metadata-only', 'imports');
  fs.mkdirSync(importsDir, { recursive: true });
  const sampleTextPath = path.join(importsDir, 'sample.txt');
  fs.writeFileSync(sampleTextPath, 'sample text\n');
  fs.writeFileSync(
    path.join(importsDir, 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: sampleTextPath,
        },
      ],
    }, null, 2),
  );

  const manifest = inspectProfileIntakeManifest({
    rootDir,
    starterManifestPath: 'profiles/metadata-only/imports/materials.template.json',
    expectedPersonId: 'metadata-only',
  });

  assert.equal(manifest.status, 'loaded');
  assert.equal(manifest.error, null);
  assert.deepEqual(manifest.repairPaths, []);
});

test('inspectProfileIntakeManifest keeps backslash-normalized relative entry files runnable', () => {
  const rootDir = makeTempRepo();
  const importsDir = path.join(rootDir, 'profiles', 'metadata-only', 'imports');
  fs.mkdirSync(importsDir, { recursive: true });
  fs.writeFileSync(path.join(importsDir, 'sample.txt'), 'sample text\n');
  fs.writeFileSync(
    path.join(importsDir, 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: '.\\sample.txt',
        },
      ],
    }, null, 2),
  );

  const manifest = inspectProfileIntakeManifest({
    rootDir,
    starterManifestPath: 'profiles/metadata-only/imports/materials.template.json',
    expectedPersonId: 'metadata-only',
  });

  assert.equal(manifest.status, 'loaded');
  assert.equal(manifest.error, null);
  assert.deepEqual(manifest.repairPaths, []);
});

test('inspectProfileIntakeManifest rejects starter templates that target a different expected profile when manifest personId is omitted', () => {
  const rootDir = makeTempRepo();
  const importsDir = path.join(rootDir, 'profiles', 'harry-han', 'imports');
  fs.mkdirSync(importsDir, { recursive: true });
  fs.writeFileSync(path.join(importsDir, 'sample.txt'), 'sample text\n');
  fs.writeFileSync(
    path.join(importsDir, 'materials.template.json'),
    JSON.stringify({
      entries: [],
      entryTemplates: {
        text: {
          file: 'sample.txt',
          personId: 'jane-doe',
        },
      },
    }, null, 2),
  );

  const manifest = inspectProfileIntakeManifest({
    rootDir,
    starterManifestPath: 'profiles/harry-han/imports/materials.template.json',
    expectedPersonId: 'harry-han',
  });

  assert.equal(manifest.status, 'invalid');
  assert.match(manifest.error ?? '', /targets a different profile: expected harry-han/);
  assert.deepEqual(manifest.entryTemplateTypes, ['text']);
  assert.equal(manifest.entryTemplateCount, 1);
});

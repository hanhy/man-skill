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

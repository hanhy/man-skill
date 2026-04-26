import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-typescript-migration-'));
}

test('typecheck script passes for the initial TypeScript migration slice', () => {
  const result = spawnSync('npm', ['run', 'typecheck'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
});

test('raw JS index entrypoint exports WorkLoop alongside the TypeScript runtime surface', () => {
  const exportKeys = execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      "import('./src/index.js').then((module) => console.log(Object.keys(module).sort().join(',')))",
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  ).trim();

  assert.match(exportKeys, /(?:^|,)WorkLoop(?:,|$)/);
});

test('JS intake manifest shim stays aligned with the TypeScript implementation', async () => {
  const rootDir = makeTempRepo();
  const importsDir = path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'images');
  fs.mkdirSync(importsDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'sample.txt'), 'sample text\n');
  fs.writeFileSync(path.join(importsDir, 'chat.png'), 'fake image payload\n');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [],
      entryTemplates: {
        text: { file: '.\\sample.txt' },
        message: { text: '<paste a representative short message>' },
        talk: { text: '<paste a transcript snippet>' },
        screenshot: { file: '.\\images\\chat.png' },
      },
    }, null, 2),
  );

  const [{ inspectProfileIntakeManifest: inspectJsManifest }, { inspectProfileIntakeManifest: inspectTsManifest }] = await Promise.all([
    import('../src/core/intake-manifest.js'),
    import('../src/core/intake-manifest.ts'),
  ]);

  const fixture = {
    rootDir,
    starterManifestPath: 'profiles/metadata-only/imports/materials.template.json',
    expectedPersonId: 'metadata-only',
  };

  assert.deepEqual(inspectJsManifest(fixture), inspectTsManifest(fixture));
});

test('raw JS intake manifest entrypoint exports inspectProfileIntakeManifest', () => {
  const exportKeys = execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      "import('./src/core/intake-manifest.js').then((module) => console.log(Object.keys(module).sort().join(',')))",
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  ).trim();

  assert.equal(exportKeys, 'inspectProfileIntakeManifest');
});

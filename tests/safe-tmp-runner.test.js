import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

test('safe tmp runner falls back to a writable repo-local temp directory when TMPDIR is broken', () => {
  const result = spawnSync(
    'node',
    [
      'scripts/run-with-safe-tmp.mjs',
      'node',
      '--input-type=module',
      '-e',
      "import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-tmp-runner-')); console.log(dir);",
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        TMPDIR: '/definitely/not-writable/or-real',
      },
    },
  );

  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
  const tmpPath = result.stdout.trim();
  assert.match(tmpPath, /\.tmp\/safe-tmp-runner-/);
  assert.ok(fs.existsSync(path.dirname(tmpPath)), `expected parent directory for ${tmpPath} to exist`);
});

test('npm check and test scripts route through the safe tmp runner', () => {
  assert.equal(packageJson.scripts.check, 'node scripts/run-with-safe-tmp.mjs tsx src/index.ts');
  assert.equal(packageJson.scripts.test, 'node scripts/run-with-safe-tmp.mjs node --import tsx --test');
});

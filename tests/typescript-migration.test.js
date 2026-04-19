import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('typecheck script passes for the initial TypeScript migration slice', () => {
  const result = spawnSync('npm', ['run', 'typecheck'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
});

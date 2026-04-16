import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('typecheck script passes for the initial TypeScript migration slice', () => {
  const output = execFileSync('npm', ['run', 'typecheck'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.match(output, /tsc/);
});

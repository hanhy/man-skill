import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runCli(args) {
  return spawnSync('node', ['src/index.js', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('summary help is a first-class usage surface', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0, [help.stdout, help.stderr].filter(Boolean).join('\n'));
  assert.match(help.stdout, /node src\/index\.js summary \[--json\]\s+Show the repo summary JSON/);

  const summaryHelp = runCli(['summary', '--help']);
  assert.equal(summaryHelp.status, 0, [summaryHelp.stdout, summaryHelp.stderr].filter(Boolean).join('\n'));
  assert.match(summaryHelp.stdout, /^Usage: node src\/index\.js summary \[--json\]$/m);
  assert.doesNotMatch(summaryHelp.stdout, /^\s*\{/m, 'summary --help should print usage, not JSON output');
});

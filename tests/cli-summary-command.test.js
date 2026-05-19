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

test('summary rejects unsupported positional tokens and options', () => {
  const extraToken = runCli(['summary', 'unexpected-token']);
  assert.equal(extraToken.status, 1, 'summary with an unexpected positional token should fail');
  assert.equal(extraToken.stdout, '');
  assert.match(extraToken.stderr, /Error: Unsupported summary argument: unexpected-token/);
  assert.match(extraToken.stderr, /Usage: node src\/index\.js summary \[--json\]/);

  const extraOption = runCli(['summary', '--bogus']);
  assert.equal(extraOption.status, 1, 'summary with an unsupported option should fail');
  assert.equal(extraOption.stdout, '');
  assert.match(extraOption.stderr, /Error: Unsupported summary option: --bogus/);
  assert.match(extraOption.stderr, /Usage: node src\/index\.js summary \[--json\]/);
});

test('import and update family help are first-class usage surfaces', () => {
  const importHelp = runCli(['import', '--help']);
  assert.equal(importHelp.status, 0, [importHelp.stdout, importHelp.stderr].filter(Boolean).join('\n'));
  assert.match(importHelp.stdout, /^Usage:$/m);
  assert.match(importHelp.stdout, /node src\/index\.js import sample \[--file <manifest\.json>]\s+Import the checked-in sample manifest and refresh drafts/);
  assert.match(importHelp.stdout, /node src\/index\.js import intake --person <person-id> \[--refresh-foundation] Import a ready profile-local intake manifest/);
  assert.doesNotMatch(importHelp.stdout, /^\s*\{/m, 'import --help should print usage, not JSON output');

  const updateHelp = runCli(['update', '--help']);
  assert.equal(updateHelp.status, 0, [updateHelp.stdout, updateHelp.stderr].filter(Boolean).join('\n'));
  assert.match(updateHelp.stdout, /^Usage:$/m);
  assert.match(updateHelp.stdout, /node src\/index\.js update profile --person <person-id> \[--display-name <name>] \[--summary <text>] \[--refresh-foundation]/);
  assert.match(updateHelp.stdout, /node src\/index\.js update intake --person <person-id> \[--display-name <name>] \[--summary <text>] \[--refresh-foundation]/);
  assert.match(updateHelp.stdout, /node src\/index\.js update intake --stale \[--refresh-foundation]\s+Complete intake scaffolds only for metadata-only profiles with missing or partial imports\/ assets/);
  assert.doesNotMatch(updateHelp.stdout, /^\s*\{/m, 'update --help should print usage, not JSON output');
});

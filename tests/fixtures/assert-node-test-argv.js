import test from 'node:test';
import assert from 'node:assert/strict';

test('keeps test-runner args after --', () => {
  assert.ok(process.argv.includes('--runInBand'), 'expected argv after -- to reach the test file');
});

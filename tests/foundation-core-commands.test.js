import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCoreFoundationCommand } from '../src/core/foundation-core-commands.ts';

test('buildCoreFoundationCommand scaffolds missing memory buckets with seed files', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'memory',
      status: 'missing',
      paths: ['memory/README.md', 'memory/daily', 'memory/long-term', 'memory/scratch'],
    }),
    'mkdir -p memory/daily memory/long-term memory/scratch && touch memory/README.md memory/daily/$(date +%F).md memory/long-term/notes.md memory/scratch/draft.md',
  );
});

test('buildCoreFoundationCommand keeps thin voice scaffolds idempotent', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'voice',
      status: 'thin',
      paths: ['voice/README.md'],
    }),
    "grep -Fqx -- '- Add voice guidance here.' voice/README.md || printf %s '\n- Add voice guidance here.\n' >> voice/README.md",
  );
});

test('buildCoreFoundationCommand scaffolds missing soul guidance with starter content', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'soul',
      status: 'missing',
      paths: ['SOUL.md'],
    }),
    "printf %s '# Soul\n\nAdd soul guidance here.\n' > SOUL.md",
  );
});

test('buildCoreFoundationCommand keeps skill documentation scaffolds quoted', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'skills',
      status: 'thin',
      paths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
    }),
    "touch 'skills/slack/SKILL.md' 'skills/telegram/SKILL.md'",
  );
});

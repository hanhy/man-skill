import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { buildCoreFoundationCommand } from '../src/core/foundation-core-commands.ts';

test('buildCoreFoundationCommand scaffolds missing memory buckets with seed files', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'memory',
      status: 'missing',
      paths: ['memory/README.md', 'memory/daily', 'memory/long-term', 'memory/scratch'],
    }),
    "mkdir -p 'memory/daily' 'memory/long-term' 'memory/scratch' && touch 'memory/README.md' \"memory/daily/$(date +%F).md\" 'memory/long-term/notes.md' 'memory/scratch/draft.md'",
  );
});

test('buildCoreFoundationCommand canonicalizes and quotes memory scaffolds', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'memory',
      status: 'thin',
      paths: ['memory/scratch', 'memory/README.md', 'memory/long-term', 'memory/scratch'],
    }),
    "mkdir -p 'memory/long-term' 'memory/scratch' && touch 'memory/README.md' 'memory/long-term/notes.md' 'memory/scratch/draft.md'",
  );
});

test('buildCoreFoundationCommand daily memory scaffold expands the date at execution time', () => {
  const command = buildCoreFoundationCommand({
    area: 'memory',
    status: 'missing',
    paths: ['memory/README.md', 'memory/daily'],
  });

  assert.equal(
    command,
    "mkdir -p 'memory/daily' && touch 'memory/README.md' \"memory/daily/$(date +%F).md\"",
  );

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-memory-command-'));
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  const today = execSync('date +%F', { cwd: rootDir, shell: '/bin/bash' }).toString().trim();
  assert.equal(fs.existsSync(path.join(rootDir, 'memory', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'memory', 'daily', `${today}.md`)), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'memory', 'daily', '$(date +%F).md')), false);
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

test('buildCoreFoundationCommand scaffolds a starter skill when the skills area is missing entirely', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'skills',
      status: 'missing',
      paths: ['skills/'],
    }),
    "mkdir -p skills/starter && printf %s '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n' > 'skills/starter/SKILL.md'",
  );
});

test('buildCoreFoundationCommand keeps skill documentation scaffolds quoted', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'skills',
      status: 'thin',
      paths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
    }),
    "mkdir -p 'skills/slack' 'skills/telegram' && for file in 'skills/slack/SKILL.md' 'skills/telegram/SKILL.md'; do [ -f \"$file\" ] || printf %s '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n' > \"$file\"; done",
  );
});

test('buildCoreFoundationCommand seeds missing skill docs without clobbering existing content', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/slack/SKILL.md', 'skills/telegram/SKILL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-skill-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'telegram'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), '# Existing skill\n\nKeep this content.\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'slack', 'SKILL.md'), 'utf8'),
    '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
  );
  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'telegram', 'SKILL.md'), 'utf8'),
    '# Existing skill\n\nKeep this content.\n',
  );
});

test('buildCoreFoundationCommand preserves shell quoting for skill docs with spaces and apostrophes', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ["skills/harry's notes/SKILL.md", 'skills/team sync/SKILL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-skill-quote-command-'));
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', "harry's notes", 'SKILL.md'), 'utf8'),
    '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
  );
  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'team sync', 'SKILL.md'), 'utf8'),
    '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
  );
});

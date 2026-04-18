import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { buildCoreFoundationCommand } from '../src/core/foundation-core-commands.ts';

const VOICE_STARTER_TEMPLATE = '# Voice\n\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n';
const VOICE_GUIDANCE_SENTINEL = '- Describe the target cadence, directness, and emotional texture here.';
const VOICE_SECTIONS = [
  {
    heading: '## Tone',
    sentinel: '- Describe the target cadence, directness, and emotional texture here.',
    missingSectionAppend: '\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n',
    existingBulletAppend: '- Describe the target cadence, directness, and emotional texture here.\n',
  },
  {
    heading: '## Signature moves',
    sentinel: '- Capture recurring phrasing, structure, or rhetorical habits here.',
    missingSectionAppend: '\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n',
    existingBulletAppend: '- Capture recurring phrasing, structure, or rhetorical habits here.\n',
  },
  {
    heading: '## Avoid',
    sentinel: '- List wording, hedges, or habits that break the voice.',
    missingSectionAppend: '\n## Avoid\n- List wording, hedges, or habits that break the voice.\n',
    existingBulletAppend: '- List wording, hedges, or habits that break the voice.\n',
  },
  {
    heading: '## Language hints',
    sentinel: '- Note bilingual, dialect, or code-switching habits worth preserving.',
    missingSectionAppend: '\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n',
    existingBulletAppend: '- Note bilingual, dialect, or code-switching habits worth preserving.\n',
  },
];
const SOUL_STARTER_TEMPLATE = '# Soul\n\n## Core values\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Decision rules\n- Note the principles to use when tradeoffs appear.\n';
const SOUL_GUIDANCE_SENTINEL = '- Describe the durable values and goals that should survive across tasks.';
const SOUL_SECTIONS = [
  {
    heading: '## Core values',
    sentinel: '- Describe the durable values and goals that should survive across tasks.',
    missingSectionAppend: '\n## Core values\n- Describe the durable values and goals that should survive across tasks.\n',
    existingBulletAppend: '- Describe the durable values and goals that should survive across tasks.\n',
  },
  {
    heading: '## Boundaries',
    sentinel: '- Capture what the agent should protect or refuse to compromise.',
    missingSectionAppend: '\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n',
    existingBulletAppend: '- Capture what the agent should protect or refuse to compromise.\n',
  },
  {
    heading: '## Decision rules',
    sentinel: '- Note the principles to use when tradeoffs appear.',
    missingSectionAppend: '\n## Decision rules\n- Note the principles to use when tradeoffs appear.\n',
    existingBulletAppend: '- Note the principles to use when tradeoffs appear.\n',
  },
];

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function buildDocumentRepairCommand(filePath, _sentinel, sections) {
  const file = shellSingleQuote(filePath);
  const buildSectionHasContentCommand = (heading) => [
    'awk',
    `-v heading=${shellSingleQuote(heading)}`,
    shellSingleQuote("BEGIN { in_section = 0; has_content = 0 } $0 == heading { in_section = 1; next } /^## / { if (in_section) exit } in_section && $0 !~ /^[[:space:]]*$/ { has_content = 1 } END { exit has_content ? 0 : 1 }"),
    file,
  ].join(' ');
  const buildInsertIntoExistingSectionCommand = (heading, bullet) => {
    const normalizedBullet = bullet.replace(/\n+$/, '');
    const escapePerlReplacement = (value) => value
      .replace(/\\/g, '\\\\')
      .replace(/\$/g, '\\$')
      .replace(/~/g, '\\~');
    const perlScript = `s~\\Q${heading}\\E\\n((?:\\n)*)(?=## |\\z)~${escapePerlReplacement(heading)}\\n${escapePerlReplacement(normalizedBullet)}\\n$1~s`;
    return `perl -0pi -e ${shellSingleQuote(perlScript)} ${file}`;
  };
  const sectionCommands = sections.map((section) =>
    `if grep -Fqx -- ${shellSingleQuote(section.heading)} ${file}; then ${buildSectionHasContentCommand(section.heading)} || ${buildInsertIntoExistingSectionCommand(section.heading, section.existingBulletAppend)}; else printf %s ${shellSingleQuote(section.missingSectionAppend)} >> ${file}; fi`,
  );

  return `{ ${sectionCommands.join('; ')}; }`;
}

test('buildCoreFoundationCommand scaffolds missing memory buckets with seed files', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'memory',
      status: 'missing',
      paths: ['memory/README.md', 'memory/daily', 'memory/long-term', 'memory/scratch'],
    }),
    "mkdir -p 'memory' 'memory/daily' 'memory/long-term' 'memory/scratch' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md' && touch \"memory/daily/$(date +%F).md\" 'memory/long-term/notes.md' 'memory/scratch/draft.md'",
  );
});

test('buildCoreFoundationCommand canonicalizes and quotes memory scaffolds', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'memory',
      status: 'thin',
      paths: ['memory/scratch', 'memory/README.md', 'memory/long-term', 'memory/scratch'],
    }),
    "mkdir -p 'memory' 'memory/long-term' 'memory/scratch' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md' && touch 'memory/long-term/notes.md' 'memory/scratch/draft.md'",
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
    "mkdir -p 'memory' 'memory/daily' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md' && touch \"memory/daily/$(date +%F).md\"",
  );

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-memory-command-'));
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  const today = execSync('date +%F', { cwd: rootDir, shell: '/bin/bash' }).toString().trim();
  assert.equal(fs.existsSync(path.join(rootDir, 'memory', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'memory', 'daily', `${today}.md`)), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'memory', 'daily', '$(date +%F).md')), false);
});

test('buildCoreFoundationCommand seeds a starter memory README when repo memory entries exist but guidance is missing', () => {
  const command = buildCoreFoundationCommand({
    area: 'memory',
    status: 'thin',
    paths: ['memory/README.md'],
  });

  assert.equal(
    command,
    "mkdir -p 'memory' && printf %s '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n' > 'memory/README.md'",
  );

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-memory-readme-command-'));
  fs.mkdirSync(path.join(rootDir, 'memory'), { recursive: true });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'memory', 'README.md'), 'utf8'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
});

test('buildCoreFoundationCommand keeps thin voice scaffolds idempotent', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'voice',
      status: 'thin',
      paths: ['voice/README.md'],
    }),
    buildDocumentRepairCommand('voice/README.md', VOICE_GUIDANCE_SENTINEL, VOICE_SECTIONS),
  );
});

test('buildCoreFoundationCommand scaffolds missing soul guidance with starter content', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'soul',
      status: 'missing',
      paths: ['SOUL.md'],
    }),
    `printf %s '${SOUL_STARTER_TEMPLATE}' > SOUL.md`,
  );
});

test('buildCoreFoundationCommand scaffolds missing voice guidance with richer starter sections', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'voice',
      status: 'missing',
      paths: ['voice/README.md'],
    }),
    `mkdir -p voice && printf %s '${VOICE_STARTER_TEMPLATE}' > voice/README.md`,
  );
});

test('buildCoreFoundationCommand keeps thin soul scaffolds idempotent', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'soul',
      status: 'thin',
      paths: ['SOUL.md'],
    }),
    buildDocumentRepairCommand('SOUL.md', SOUL_GUIDANCE_SENTINEL, SOUL_SECTIONS),
  );
});

test('buildCoreFoundationCommand repairs heading-only thin voice scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'voice',
    status: 'thin',
    paths: ['voice/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-voice-command-'));
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'voice', 'README.md'), 'utf8'),
    '# Voice\n\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n',
  );
});

test('buildCoreFoundationCommand repairs thin voice docs that are only missing language hints', () => {
  const command = buildCoreFoundationCommand({
    area: 'voice',
    status: 'thin',
    paths: ['voice/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-voice-language-command-'));
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'voice', 'README.md'), 'utf8'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n',
  );
});

test('buildCoreFoundationCommand repairs heading-only thin soul scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-soul-command-'));
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core values\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core values\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Decision rules\n- Note the principles to use when tradeoffs appear.\n',
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

test('buildCoreFoundationCommand appends starter guidance to heading-only skill docs', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/delivery/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  assert.match(command ?? '', /if grep -Fqx -- '## What this skill is for' 'skills\/delivery\/SKILL\.md'; then awk -v heading='## What this skill is for'/);
  assert.match(command ?? '', /## Suggested workflow/);

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skill-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), 'utf8'),
    '# Delivery\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
  );
});

test('buildCoreFoundationCommand repairs thin skill docs that are only missing suggested workflow', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/delivery/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skill-workflow-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    '# Delivery\n\n## What this skill is for\n- Explain when to use this skill.\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), 'utf8'),
    '# Delivery\n\n## What this skill is for\n- Explain when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
  );
});

test('buildCoreFoundationCommand inserts missing skill guidance inside an empty section before the next heading', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/delivery/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skill-empty-section-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    '# Delivery\n\n## What this skill is for\n\n## Suggested workflow\n- Keep existing workflow steps.\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), 'utf8'),
    '# Delivery\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Keep existing workflow steps.\n',
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

test('buildCoreFoundationCommand combines missing and thin skill doc repairs without clobbering either side', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/slack/SKILL.md', 'skills/delivery/SKILL.md'],
    missingPaths: ['skills/slack/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  assert.match(command ?? '', /^\(mkdir -p 'skills\/slack'/);
  assert.match(command ?? '', /skills\/delivery\/SKILL\.md/);
  assert.match(command ?? '', /perl -0pi -e/);

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-mixed-skill-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'slack', 'SKILL.md'), 'utf8'),
    '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
  );
  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), 'utf8'),
    '# Delivery\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n',
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

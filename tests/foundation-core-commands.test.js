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
const SOUL_STARTER_TEMPLATE = '# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n';
const MEMORY_GUIDANCE_SENTINEL = '- Durable repo knowledge and operator context.';
const MEMORY_SECTIONS = [
  {
    heading: '## What belongs here',
    sentinel: '- Durable repo knowledge and operator context.',
    missingSectionAppend: '\n## What belongs here\n- Durable repo knowledge and operator context.\n',
    existingBulletAppend: '- Durable repo knowledge and operator context.\n',
  },
  {
    heading: '## Buckets',
    sentinel: '- daily/: short-lived run notes',
    missingSectionAppend: '\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
    existingBulletAppend: '- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  },
];
const SKILLS_README_TEMPLATE = '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n';
const SKILLS_README_GUIDANCE_SENTINEL = '- Reusable operator procedures and behavior modules.';
const SKILLS_README_SECTIONS = [
  {
    heading: '## What lives here',
    sentinel: '- Reusable operator procedures and behavior modules.',
    missingSectionAppend: '\n## What lives here\n- Reusable operator procedures and behavior modules.\n',
    existingBulletAppend: '- Reusable operator procedures and behavior modules.\n',
  },
  {
    heading: '## Layout',
    sentinel: '- <skill>/SKILL.md: per-skill workflow and guidance',
    missingSectionAppend: '\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
    existingBulletAppend: '- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  },
];
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
    heading: '## Vibe',
    sentinel: '- Describe the emotional texture or posture the agent should project.',
    missingSectionAppend: '\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n',
    existingBulletAppend: '- Describe the emotional texture or posture the agent should project.\n',
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

function stripMarkdownHeadingMarkup(heading) {
  return heading
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#+\s*$/, '')
    .trim();
}

function buildDocumentRepairCommand(filePath, _sentinel, sections) {
  const normalizedSections = sections.map((section) => ({
    headingText: stripMarkdownHeadingMarkup(section.heading),
    headingLevel: (section.heading.match(/^#{1,6}/)?.[0].length ?? 2),
    missingSectionAppend: section.missingSectionAppend,
    existingBulletAppend: section.existingBulletAppend,
  }));
  const script = [
    "const fs = require('node:fs');",
    `const file = ${JSON.stringify(filePath)};`,
    `const sections = ${JSON.stringify(normalizedSections)};`,
    "const parseHeadingAt = (lines, index) => { const current = lines[index] ?? ''; const trimmed = current.trim(); const atxMatch = trimmed.match(/^(#{1,6})\\s+(.*)$/); if (atxMatch) { return { level: atxMatch[1].length, text: atxMatch[2].trim().replace(/\\s+#+\\s*$/, '').trim().toLowerCase(), lineCount: 1 }; } const next = lines[index + 1] ?? ''; const setextMatch = next.trim().match(/^(=+|-+)$/); if (!setextMatch || trimmed.length === 0 || trimmed.startsWith('#')) return null; return { level: setextMatch[1].startsWith('=') ? 1 : 2, text: trimmed.toLowerCase(), lineCount: 2 }; };",
    "const hasVisibleContent = (sectionLines, sectionHeadingLevel) => { let activeFenceMarker = null; let activeFenceLength = 0; let insideHtmlComment = false; for (const line of sectionLines) { const rawLine = line ?? ''; const trimmed = rawLine.trim(); if (!activeFenceMarker) { const openingFenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/); if (openingFenceMatch) { activeFenceMarker = openingFenceMatch[1][0]; activeFenceLength = openingFenceMatch[1].length; continue; } } else { const closingFenceMatch = trimmed.match(/^([`~]{3,})(\\s*)$/); if (closingFenceMatch && closingFenceMatch[1][0] === activeFenceMarker && closingFenceMatch[1].length >= activeFenceLength) { activeFenceMarker = null; activeFenceLength = 0; } continue; } let visibleLine = rawLine; if (insideHtmlComment) { const commentEnd = visibleLine.indexOf('-->'); if (commentEnd < 0) continue; visibleLine = visibleLine.slice(commentEnd + 3); insideHtmlComment = false; } while (true) { const commentStart = visibleLine.indexOf('<!--'); if (commentStart < 0) break; const commentEnd = visibleLine.indexOf('-->', commentStart + 4); if (commentEnd >= 0) { visibleLine = `${visibleLine.slice(0, commentStart)}${visibleLine.slice(commentEnd + 3)}`; continue; } visibleLine = visibleLine.slice(0, commentStart); insideHtmlComment = true; break; } const normalizedLine = visibleLine.trim(); if (normalizedLine.length === 0) continue; const nestedHeading = parseHeadingAt([visibleLine], 0); if (nestedHeading && nestedHeading.level > sectionHeadingLevel) return true; if (!normalizedLine.startsWith('#')) return true; } return false; };",
    "let lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/);",
    "for (const section of sections) { const target = section.headingText.toLowerCase(); let headingIndex = -1; let headingLevel = 0; let headingLineCount = 0; for (let index = 0; index < lines.length;) { const parsed = parseHeadingAt(lines, index); if (!parsed) { index += 1; continue; } if (parsed.text === target) { if (parsed.level === section.headingLevel) { headingIndex = index; headingLevel = parsed.level; headingLineCount = parsed.lineCount; break; } if (headingIndex < 0) { headingIndex = index; headingLevel = parsed.level; headingLineCount = parsed.lineCount; } } index += parsed.lineCount; } if (headingIndex < 0) { const missingLines = section.missingSectionAppend.replace(/^\\n/, '').replace(/\\n$/, '').split('\\n'); if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push(''); lines.push(...missingLines); continue; } const contentStartIndex = headingIndex + headingLineCount; let endIndex = lines.length; for (let index = contentStartIndex; index < lines.length;) { const parsed = parseHeadingAt(lines, index); if (!parsed) { index += 1; continue; } if (parsed.level <= headingLevel) { endIndex = index; break; } index += parsed.lineCount; } const hasContent = hasVisibleContent(lines.slice(contentStartIndex, endIndex), headingLevel); if (hasContent) continue; const insertLines = section.existingBulletAppend.replace(/\\n+$/, '').split('\\n'); lines.splice(contentStartIndex, 0, ...insertLines); }",
    "fs.writeFileSync(file, `${lines.join('\\n').replace(/\\n*$/, '')}\\n`);",
  ].join(' ');

  return `node -e ${shellSingleQuote(script)}`;
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

test('buildCoreFoundationCommand repairs thin memory README sections without clobbering the file', () => {
  const command = buildCoreFoundationCommand({
    area: 'memory',
    status: 'thin',
    paths: ['memory/README.md'],
    thinPaths: ['memory/README.md'],
  });

  assert.equal(
    command,
    buildDocumentRepairCommand('memory/README.md', MEMORY_GUIDANCE_SENTINEL, MEMORY_SECTIONS),
  );

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-memory-readme-command-'));
  fs.mkdirSync(path.join(rootDir, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable memory organized by horizon.\n');
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'memory', 'README.md'), 'utf8'),
    '# Memory\n\nKeep durable memory organized by horizon.\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
});

test('buildCoreFoundationCommand repairs thin memory README headings with closing hashes without appending duplicate level-two sections', () => {
  const command = buildCoreFoundationCommand({
    area: 'memory',
    status: 'thin',
    paths: ['memory/README.md'],
    thinPaths: ['memory/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-memory-readme-closing-hash-command-'));
  fs.mkdirSync(path.join(rootDir, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\n### What belongs here ###\n\n### Buckets ###\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'memory', 'README.md'), 'utf8'),
    '# Memory\n\n### What belongs here ###\n- Durable repo knowledge and operator context.\n\n### Buckets ###\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
});

test('buildCoreFoundationCommand repairs thin memory README setext headings without appending duplicate atx sections', () => {
  const command = buildCoreFoundationCommand({
    area: 'memory',
    status: 'thin',
    paths: ['memory/README.md'],
    thinPaths: ['memory/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-memory-readme-setext-command-'));
  fs.mkdirSync(path.join(rootDir, 'memory'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\nWhat belongs here\n-----------------\n\nBuckets\n-------\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'memory', 'README.md'), 'utf8'),
    '# Memory\n\nWhat belongs here\n-----------------\n- Durable repo knowledge and operator context.\n\nBuckets\n-------\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
});

test('buildCoreFoundationCommand repairs thin skills root README sections without clobbering the file', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'skills',
      status: 'thin',
      paths: ['skills/README.md'],
      thinPaths: ['skills/README.md'],
    }),
    buildDocumentRepairCommand('skills/README.md', SKILLS_README_GUIDANCE_SENTINEL, SKILLS_README_SECTIONS),
  );
});

test('buildCoreFoundationCommand repairs level-one atx skills root headings without appending duplicate level-two sections', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skills-root-h1-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n# What lives here\n\n# Layout\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\n# What lives here\n- Reusable operator procedures and behavior modules.\n\n# Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  );
});

test('buildCoreFoundationCommand repairs deeper thin skills root headings without appending duplicate level-two sections', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skills-root-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n### What lives here ###\n\n### Layout ###\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\n### What lives here ###\n- Reusable operator procedures and behavior modules.\n\n### Layout ###\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  );
});

test('buildCoreFoundationCommand repairs thin skills root setext headings without appending duplicate atx sections', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skills-root-setext-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\nWhat lives here\n---------------\n\nLayout\n------\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\nWhat lives here\n---------------\n- Reusable operator procedures and behavior modules.\n\nLayout\n------\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  );
});

test('buildCoreFoundationCommand repairs thin skills root level-one setext headings without appending duplicate atx sections', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skills-root-setext-h1-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\nWhat lives here\n===============\n\nLayout\n======\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\nWhat lives here\n===============\n- Reusable operator procedures and behavior modules.\n\nLayout\n======\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  );
});

test('buildCoreFoundationCommand repairs thin skills root sections when only comments and fenced examples are present', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skills-root-invisible-content-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n<!-- explain the purpose here -->\n\n## Layout\n```md\n- Example layout guidance lives here.\n```\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n<!-- explain the purpose here -->\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n```md\n- Example layout guidance lives here.\n```\n',
  );
});

test('buildCoreFoundationCommand prefers matching root section headings over earlier nested headings with the same text', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
    thinPaths: ['skills/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-skills-root-duplicate-heading-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo guidance.\n\n### Layout\n- Nested example heading that should stay untouched.\n\n## Layout\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\n## What lives here\n- Shared repo guidance.\n\n### Layout\n- Nested example heading that should stay untouched.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  );
});

test('buildCoreFoundationCommand keeps nested subheadings from triggering thin skill doc repairs', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/delivery/SKILL.md'],
    thinPaths: ['skills/delivery/SKILL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-skill-nested-heading-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'delivery', 'SKILL.md'),
    '# Delivery\n\n## What this skill is for\n### Signals\n\n## Suggested workflow\n- Keep existing workflow steps.\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), 'utf8'),
    '# Delivery\n\n## What this skill is for\n### Signals\n\n## Suggested workflow\n- Keep existing workflow steps.\n',
  );
});

test('buildCoreFoundationCommand keeps thin voice scaffolds idempotent', () => {
  const command = buildCoreFoundationCommand({
    area: 'voice',
    status: 'thin',
    paths: ['voice/README.md'],
  });

  assert.match(command ?? '', /node --input-type=module -e/);
  assert.match(command ?? '', /voice should capture/);
  assert.match(command ?? '', /current default for manskill/);
  assert.match(command ?? '', /node -e/);
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
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  assert.doesNotMatch(command ?? '', /if grep -Eq/);
  assert.match(command ?? '', /node --input-type=module -e/);
  assert.match(command ?? '', /## Core truths/);
  assert.match(command ?? '', /## Vibe/);
  assert.match(command ?? '', /## Continuity/);
  assert.match(command ?? '', /core values/);
  assert.match(command ?? '', /decision rules/);
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

test('buildCoreFoundationCommand keeps thin voice scaffolds idempotent while normalizing legacy headings', () => {
  const command = buildCoreFoundationCommand({
    area: 'voice',
    status: 'thin',
    paths: ['voice/README.md'],
  });

  assert.doesNotMatch(command ?? '', /if grep -Eq/);
  assert.match(command ?? '', /node --input-type=module -e/);
  assert.match(command ?? '', /voice should capture/);
  assert.match(command ?? '', /current default for manskill/);
});

test('buildCoreFoundationCommand normalizes legacy voice headings toward openclaw when repairing thin scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'voice',
    status: 'thin',
    paths: ['voice/README.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-legacy-voice-command-'));
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\nVoice should capture\n--------------------\n- Use crisp examples.\n\n## Voice should not capture ##\n- Never pad the answer.\n\n## Current default for ManSkill\n- Default to English with occasional 中文 examples.\n- Lead with the operating takeaway.\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'voice', 'README.md'), 'utf8'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n- Lead with the operating takeaway.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Default to English with occasional 中文 examples.\n',
  );
});

test('buildCoreFoundationCommand repairs heading-only thin soul scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-soul-command-'));
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
  );
});

test('buildCoreFoundationCommand preserves openclaw-style soul headings when repairing thin scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-openclaw-soul-command-'));
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
  );
});

test('buildCoreFoundationCommand normalizes mixed soul heading dialects toward openclaw when repairing thin scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-mixed-soul-command-'));
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core truths\n- Stay faithful to source material.\n\n## Decision rules\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core truths\n- Stay faithful to source material.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
  );
});

test('buildCoreFoundationCommand normalizes legacy setext soul headings toward openclaw when repairing thin scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-setext-soul-command-'));
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\nCore values\n-----------\n- Stay faithful to source material.\n\nDecision rules\n--------------\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core truths\n- Stay faithful to source material.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
  );
});

test('buildCoreFoundationCommand normalizes closing-hash soul headings toward openclaw when repairing thin scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-closing-hash-soul-command-'));
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core values ##\n- Stay faithful to source material.\n\n## Decision rules ##\n',
  );

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core truths\n- Stay faithful to source material.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
  );
});

test('buildCoreFoundationCommand treats boundaries-only thin soul docs as openclaw-style scaffolds', () => {
  const command = buildCoreFoundationCommand({
    area: 'soul',
    status: 'thin',
    paths: ['SOUL.md'],
  });

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-thin-boundaries-soul-command-'));
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Boundaries\n- Keep claims grounded.\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'SOUL.md'), 'utf8'),
    '# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Keep claims grounded.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
  );
});

test('buildCoreFoundationCommand scaffolds a starter skill when the skills area is missing entirely', () => {
  assert.equal(
    buildCoreFoundationCommand({
      area: 'skills',
      status: 'missing',
      paths: ['skills/starter/SKILL.md'],
    }),
    "mkdir -p 'skills/starter' && for file in 'skills/starter/SKILL.md'; do [ -f \"$file\" ] || printf %s '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n' > \"$file\"; done",
  );
});

test('buildCoreFoundationCommand seeds a skills README when repo skill docs exist but shared guidance is missing', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md'],
  });

  assert.equal(
    command,
    `mkdir -p 'skills' && printf %s '${SKILLS_README_TEMPLATE}' > 'skills/README.md'`,
  );

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-skills-readme-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    SKILLS_README_TEMPLATE,
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

  assert.match(command ?? '', /^node -e /);
  assert.match(command ?? '', /skills\/delivery\/SKILL\.md/);
  assert.match(command ?? '', /Suggested workflow/);

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
  assert.match(command ?? '', /&& \(node -e /);

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

test('buildCoreFoundationCommand combines skills root guidance scaffolds with missing and thin skill docs', () => {
  const command = buildCoreFoundationCommand({
    area: 'skills',
    status: 'thin',
    paths: ['skills/README.md', 'skills/slack/SKILL.md', 'skills/delivery/SKILL.md'],
    missingPaths: ['skills/slack/SKILL.md'],
    thinPaths: ['skills/README.md', 'skills/delivery/SKILL.md'],
  });

  assert.match(command ?? '', /^\(node -e /);
  assert.match(command ?? '', /mkdir -p 'skills\/slack'/);
  assert.match(command ?? '', /skills\/delivery\/SKILL\.md/);
  assert.match(command ?? '', /&& \(mkdir -p 'skills\/slack'/);
  assert.match(command ?? '', /&& \(node -e /);

  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-mixed-skills-root-command-'));
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\nShared repo skill guidance.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');

  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });
  execSync(command ?? '', { cwd: rootDir, shell: '/bin/bash' });

  assert.equal(
    fs.readFileSync(path.join(rootDir, 'skills', 'README.md'), 'utf8'),
    '# Skills\n\nShared repo skill guidance.\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- <category>/<skill>/SKILL.md: grouped skill families for larger registries\n- README.md: shared conventions for the repo skills layer\n',
  );
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

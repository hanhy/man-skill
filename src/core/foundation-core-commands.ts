import path from 'node:path';

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function normalizeRelativePaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) {
    return [];
  }

  return paths.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function quotePaths(paths: string[]): string {
  return paths.map(shellSingleQuote).join(' ');
}

const DAILY_MEMORY_SEED_PATH = 'memory/daily/$(date +%F).md';
const MEMORY_README_TEMPLATE = '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n';
const MEMORY_README_GUIDANCE_SENTINEL = '- Durable repo knowledge and operator context.';
const MEMORY_README_SECTIONS = [
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
] as const;
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
] as const;
const SKILL_STARTER_TEMPLATE = '# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n';
const SKILL_GUIDANCE_SENTINEL = '- Describe when to use this skill.';
const SKILL_SECTIONS = [
  {
    heading: '## What this skill is for',
    sentinel: '- Describe when to use this skill.',
    missingSectionAppend: '\n## What this skill is for\n- Describe when to use this skill.\n',
    existingBulletAppend: '- Describe when to use this skill.\n',
  },
  {
    heading: '## Suggested workflow',
    sentinel: '- Add the steps here.',
    missingSectionAppend: '\n## Suggested workflow\n- Add the steps here.\n',
    existingBulletAppend: '- Add the steps here.\n',
  },
] as const;
const VOICE_STARTER_TEMPLATE = '# Voice\n\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n';
const VOICE_GUIDANCE_SENTINEL = '- Describe the target cadence, directness, and emotional texture here.';
const VOICE_GUIDANCE_APPEND_TEMPLATE = '\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n';
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
] as const;
const SOUL_STARTER_TEMPLATE = '# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Vibe\n- Describe the emotional texture or posture the agent should project.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n';
const SOUL_GUIDANCE_SENTINEL = '- Describe the durable values and goals that should survive across tasks.';
const SOUL_SECTIONS = [
  {
    heading: '## Core truths',
    sentinel: '- Describe the durable values and goals that should survive across tasks.',
    missingSectionAppend: '\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n',
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
    heading: '## Continuity',
    sentinel: '- Note the principles to use when tradeoffs appear.',
    missingSectionAppend: '\n## Continuity\n- Note the principles to use when tradeoffs appear.\n',
    existingBulletAppend: '- Note the principles to use when tradeoffs appear.\n',
  },
] as const;

function quoteShellPath(value: string): string {
  // Keep the hardcoded daily seed template expandable at runtime while quoting static paths.
  return value === DAILY_MEMORY_SEED_PATH
    ? `"${value}"`
    : shellSingleQuote(value);
}

function buildSkillsStarterCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (
    normalizedPaths.length !== 1
    || (normalizedPaths[0] !== 'skills/' && normalizedPaths[0] !== 'skills/starter/SKILL.md')
  ) {
    return null;
  }

  return `mkdir -p skills/starter && printf %s ${shellSingleQuote(SKILL_STARTER_TEMPLATE)} > ${shellSingleQuote('skills/starter/SKILL.md')}`;
}

function buildSkillsRootReadmeCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length !== 1 || normalizedPaths[0] !== 'skills/README.md') {
    return null;
  }

  return `mkdir -p ${shellSingleQuote('skills')} && printf %s ${shellSingleQuote(SKILLS_README_TEMPLATE)} > ${shellSingleQuote('skills/README.md')}`;
}

function buildSkillsRootReadmeRepairCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length !== 1 || normalizedPaths[0] !== 'skills/README.md') {
    return null;
  }

  return buildDocumentRepairCommand('skills/README.md', SKILLS_README_GUIDANCE_SENTINEL, SKILLS_README_SECTIONS);
}

function buildSkillDocumentationSeedCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length === 0 || !normalizedPaths.every((value) => value.endsWith('/SKILL.md'))) {
    return null;
  }

  const mkdirPaths = Array.from(new Set(normalizedPaths.map((value) => path.posix.dirname(value))));
  const starterTemplate = shellSingleQuote(SKILL_STARTER_TEMPLATE);
  const fileList = normalizedPaths.map(shellSingleQuote).join(' ');

  return `mkdir -p ${quotePaths(mkdirPaths)} && for file in ${fileList}; do [ -f "$file" ] || printf %s ${starterTemplate} > "$file"; done`;
}

function buildSkillGuidanceAppendCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length === 0 || !normalizedPaths.every((value) => value.endsWith('/SKILL.md'))) {
    return null;
  }

  if (normalizedPaths.length === 1) {
    return buildDocumentRepairCommand(normalizedPaths[0], SKILL_GUIDANCE_SENTINEL, SKILL_SECTIONS);
  }

  const repairCommands = normalizedPaths.map((filePath) => `(${buildDocumentRepairCommand(filePath, SKILL_GUIDANCE_SENTINEL, SKILL_SECTIONS)})`);
  return repairCommands.join(' && ');
}

function buildMemorySeedCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  const needsRootDocument = normalizedPaths.includes('memory/README.md');
  const bucketSeedFiles = [
    normalizedPaths.includes('memory/daily') ? 'memory/daily/$(date +%F).md' : null,
    normalizedPaths.includes('memory/long-term') ? 'memory/long-term/notes.md' : null,
    normalizedPaths.includes('memory/scratch') ? 'memory/scratch/draft.md' : null,
  ].filter((value): value is string => typeof value === 'string');

  if (!needsRootDocument && bucketSeedFiles.length === 0) {
    return null;
  }

  const mkdirPaths = Array.from(new Set([
    ...(needsRootDocument ? ['memory'] : []),
    ...bucketSeedFiles.map((value) => path.posix.dirname(value)),
  ]));
  const touchPaths = bucketSeedFiles;
  const commandSegments: string[] = [];

  if (mkdirPaths.length > 0) {
    commandSegments.push(`mkdir -p ${quotePaths(mkdirPaths)}`);
  }

  if (needsRootDocument) {
    commandSegments.push(`printf %s ${shellSingleQuote(MEMORY_README_TEMPLATE)} > ${shellSingleQuote('memory/README.md')}`);
  }

  if (touchPaths.length > 0) {
    commandSegments.push(`touch ${touchPaths.map(quoteShellPath).join(' ')}`);
  }

  return commandSegments.join(' && ');
}

function buildMemoryReadmeRepairCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length !== 1 || normalizedPaths[0] !== 'memory/README.md') {
    return null;
  }

  return buildDocumentRepairCommand('memory/README.md', MEMORY_README_GUIDANCE_SENTINEL, MEMORY_README_SECTIONS);
}

function stripMarkdownHeadingMarkup(heading: string): string {
  return heading
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#+\s*$/, '')
    .trim();
}

function buildDocumentRepairCommand(
  filePath: string,
  _sentinel: string,
  sections: ReadonlyArray<{
    heading: string;
    sentinel: string;
    missingSectionAppend: string;
    existingBulletAppend: string;
  }>,
): string {
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
    "const stripQuotePrefix = (value) => value.replace(/^\\s{0,3}(?:>\\s?)+/, '').trimEnd(); const parseHeadingAt = (lines, index) => { const current = lines[index] ?? ''; const normalizedCurrent = stripQuotePrefix(current); const trimmed = normalizedCurrent.trim(); const atxMatch = trimmed.match(/^(#{1,6})\\s+(.*)$/); if (atxMatch) { return { level: atxMatch[1].length, text: atxMatch[2].trim().replace(/\\s+#+\\s*$/, '').trim().toLowerCase(), lineCount: 1 }; } const next = lines[index + 1] ?? ''; const normalizedNext = stripQuotePrefix(next); const setextMatch = normalizedNext.trim().match(/^(=+|-+)$/); if (!setextMatch || trimmed.length === 0 || trimmed.startsWith('#')) return null; return { level: setextMatch[1].startsWith('=') ? 1 : 2, text: trimmed.toLowerCase(), lineCount: 2 }; };",
    "const buildVisibleLines = (sourceLines) => { let activeFenceMarker = null; let activeFenceLength = 0; let insideHtmlComment = false; return sourceLines.map((rawLine = '') => { const trimmed = stripQuotePrefix(rawLine).trim(); if (!activeFenceMarker) { const openingFenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/); if (openingFenceMatch) { activeFenceMarker = openingFenceMatch[1][0]; activeFenceLength = openingFenceMatch[1].length; return ''; } } else { const closingFenceMatch = trimmed.match(/^([`~]{3,})(\\s*)$/); if (closingFenceMatch && closingFenceMatch[1][0] === activeFenceMarker && closingFenceMatch[1].length >= activeFenceLength) { activeFenceMarker = null; activeFenceLength = 0; } return ''; } let visibleLine = rawLine; if (insideHtmlComment) { const commentEnd = visibleLine.indexOf('-->'); if (commentEnd < 0) return ''; visibleLine = visibleLine.slice(commentEnd + 3); insideHtmlComment = false; } while (true) { const commentStart = visibleLine.indexOf('<!--'); if (commentStart < 0) break; const commentEnd = visibleLine.indexOf('-->', commentStart + 4); if (commentEnd >= 0) { visibleLine = `${visibleLine.slice(0, commentStart)}${visibleLine.slice(commentEnd + 3)}`; continue; } visibleLine = visibleLine.slice(0, commentStart); insideHtmlComment = true; break; } return visibleLine; }); };",
    "const hasVisibleContent = (visibleSectionLines, sectionHeadingLevel) => { for (const line of visibleSectionLines) { const normalizedLine = stripQuotePrefix(line ?? '').trim(); if (normalizedLine.length === 0) continue; const nestedHeading = parseHeadingAt([line], 0); if (nestedHeading && nestedHeading.level > sectionHeadingLevel) return true; if (!normalizedLine.startsWith('#')) return true; } return false; };",
    "let lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/);",
    "for (const section of sections) { const visibleLines = buildVisibleLines(lines); const target = section.headingText.toLowerCase(); let headingIndex = -1; let headingLevel = 0; let headingLineCount = 0; for (let index = 0; index < visibleLines.length;) { const parsed = parseHeadingAt(visibleLines, index); if (!parsed) { index += 1; continue; } if (parsed.text === target) { if (parsed.level === section.headingLevel) { headingIndex = index; headingLevel = parsed.level; headingLineCount = parsed.lineCount; break; } if (headingIndex < 0) { headingIndex = index; headingLevel = parsed.level; headingLineCount = parsed.lineCount; } } index += parsed.lineCount; } if (headingIndex < 0) { const missingLines = section.missingSectionAppend.replace(/^\\n/, '').replace(/\\n$/, '').split('\\n'); if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push(''); lines.push(...missingLines); continue; } const contentStartIndex = headingIndex + headingLineCount; let endIndex = lines.length; for (let index = contentStartIndex; index < visibleLines.length;) { const parsed = parseHeadingAt(visibleLines, index); if (!parsed) { index += 1; continue; } if (parsed.level <= headingLevel) { endIndex = index; break; } index += parsed.lineCount; } const hasContent = hasVisibleContent(visibleLines.slice(contentStartIndex, endIndex), headingLevel); if (hasContent) continue; const insertLines = section.existingBulletAppend.replace(/\\n+$/, '').split('\\n'); lines.splice(contentStartIndex, 0, ...insertLines); }",
    "fs.writeFileSync(file, `${lines.join('\\n').replace(/\\n*$/, '')}\\n`);",
  ].join(' ');

  return `node -e ${shellSingleQuote(script)}`;
}

function buildVoiceCommand(status: string | null): string | null {
  if (status === 'missing') {
    return `mkdir -p voice && printf %s ${shellSingleQuote(VOICE_STARTER_TEMPLATE)} > voice/README.md`;
  }

  if (status === 'thin') {
    const normalizeToOpenclaw = [
      "import fs from 'node:fs';",
      "const file = 'voice/README.md';",
      "const raw = fs.readFileSync(file, 'utf8');",
      "const lines = raw.split(/\\r?\\n/);",
      "const stripHeadingText = (value) => value.trim().replace(/\\s+#+\\s*$/, '').trim().toLowerCase();",
      "const parseHeadingAt = (sourceLines, index) => { const current = sourceLines[index] ?? ''; const trimmed = current.trim(); const atxMatch = trimmed.match(/^(#{1,6})\\s+(.*)$/); if (atxMatch) { return { level: atxMatch[1].length, text: stripHeadingText(atxMatch[2]), lineCount: 1, rawLines: [current] }; } const next = sourceLines[index + 1] ?? ''; const setextMatch = next.trim().match(/^(=+|-+)$/); if (!setextMatch || trimmed.length === 0 || trimmed.startsWith('#')) return null; return { level: setextMatch[1].startsWith('=') ? 1 : 2, text: trimmed.toLowerCase(), lineCount: 2, rawLines: [current, next] }; };",
      "const looksLikeLanguageHint = (value) => { const normalized = value.trim().toLowerCase(); return normalized.includes('language') || normalized.includes('bilingual') || normalized.includes('multilingual') || normalized.includes('中文') || normalized.includes('english'); };",
      "const isCurrentDefaultHeading = (value) => value === 'current default for manskill' || /^current default for .+$/.test(value);",
      "const aliasMap = new Map([['tone', 'tone'], ['signature moves', 'signature-moves'], ['voice should capture', 'signature-moves'], ['avoid', 'avoid'], ['voice should not capture', 'avoid'], ['language hints', 'language-hints'], ['current default for manskill', 'current-default']]);",
      "const sectionHeadings = { tone: '## Tone', 'signature-moves': '## Signature moves', avoid: '## Avoid', 'language-hints': '## Language hints' };",
      "const sectionOrder = ['tone', 'signature-moves', 'avoid', 'language-hints'];",
      "const sections = { tone: [], 'signature-moves': [], avoid: [], 'language-hints': [] };",
      "const prelude = [];",
      "const extras = [];",
      "let currentSection = null;",
      "let currentExtra = null;",
      "for (let index = 0; index < lines.length;) {",
      "  const parsed = parseHeadingAt(lines, index);",
      "  if (parsed) {",
      "    if (parsed.level === 1 && parsed.text === 'voice') { prelude.push(...parsed.rawLines); currentSection = null; currentExtra = null; index += parsed.lineCount; continue; }",
      "    const key = aliasMap.get(parsed.text) ?? (isCurrentDefaultHeading(parsed.text) ? 'current-default' : null);",
      "    if (key) { currentSection = key; currentExtra = null; index += parsed.lineCount; continue; }",
      "    currentSection = null; currentExtra = [...parsed.rawLines]; extras.push(currentExtra); index += parsed.lineCount; continue;",
      "  }",
      "  const line = lines[index] ?? '';",
      "  if (currentExtra) { currentExtra.push(line); index += 1; continue; }",
      "  if (currentSection === 'current-default') { if (line.trim().length === 0) { index += 1; continue; } (looksLikeLanguageHint(line) ? sections['language-hints'] : sections['signature-moves']).push(line); index += 1; continue; }",
      "  if (currentSection) { sections[currentSection].push(line); index += 1; continue; }",
      "  prelude.push(line);",
      "  index += 1;",
      "}",
      "const trimBlankEdges = (values) => { while (values.length > 0 && values[0].trim() === '') values.shift(); while (values.length > 0 && values[values.length - 1].trim() === '') values.pop(); return values; };",
      "const output = trimBlankEdges([...prelude]);",
      "for (const key of sectionOrder) {",
      "  if (output.length > 0 && output[output.length - 1].trim() !== '') output.push('');",
      "  output.push(sectionHeadings[key]);",
      "  const body = trimBlankEdges([...sections[key]]).filter((line) => key === 'tone' || line.trim().length > 0);",
      "  output.push(...body);",
      "}",
      "for (const extra of extras) {",
      "  const body = trimBlankEdges([...extra]);",
      "  if (body.length === 0) continue;",
      "  if (output.length > 0 && output[output.length - 1].trim() !== '') output.push('');",
      "  output.push(...body);",
      "}",
      "const normalized = `${output.join('\\n').replace(/\\n+$/, '')}\\n`;",
      "fs.writeFileSync(file, normalized);",
    ].join(' ');
    const normalizeCommand = `node --input-type=module -e ${shellSingleQuote(normalizeToOpenclaw)}`;
    return `${normalizeCommand} && ${buildDocumentRepairCommand('voice/README.md', VOICE_GUIDANCE_SENTINEL, VOICE_SECTIONS)}`;
  }

  return null;
}

function buildSoulCommand(status: string | null): string | null {
  if (status === 'missing') {
    return `printf %s ${shellSingleQuote(SOUL_STARTER_TEMPLATE)} > SOUL.md`;
  }

  if (status === 'thin') {
    const normalizeToOpenclaw = [
      "import fs from 'node:fs';",
      "const file = 'SOUL.md';",
      "const raw = fs.readFileSync(file, 'utf8');",
      "const lines = raw.split(/\\r?\\n/);",
      "const stripHeadingText = (value) => value.trim().replace(/\\s+#+\\s*$/, '').trim().toLowerCase();",
      "const parseHeadingAt = (sourceLines, index) => { const current = sourceLines[index] ?? ''; const trimmed = current.trim(); const atxMatch = trimmed.match(/^(#{1,6})\\s+(.*)$/); if (atxMatch) { return { level: atxMatch[1].length, text: stripHeadingText(atxMatch[2]), lineCount: 1, rawLines: [current] }; } const next = sourceLines[index + 1] ?? ''; const setextMatch = next.trim().match(/^(=+|-+)$/); if (!setextMatch || trimmed.length === 0 || trimmed.startsWith('#')) return null; return { level: setextMatch[1].startsWith('=') ? 1 : 2, text: trimmed.toLowerCase(), lineCount: 2, rawLines: [current, next] }; };",
      "const aliasMap = new Map([['core truths', 'core-truths'], ['core values', 'core-truths'], ['boundaries', 'boundaries'], ['vibe', 'vibe'], ['continuity', 'continuity'], ['decision rules', 'continuity']]);",
      "const sectionHeadings = { 'core-truths': '## Core truths', boundaries: '## Boundaries', vibe: '## Vibe', continuity: '## Continuity' };",
      "const sectionOrder = ['core-truths', 'boundaries', 'vibe', 'continuity'];",
      "const sections = { 'core-truths': [], boundaries: [], vibe: [], continuity: [] };",
      "const prelude = [];",
      "const extras = [];",
      "let currentSection = null;",
      "let currentExtra = null;",
      "for (let index = 0; index < lines.length;) {",
      "  const parsed = parseHeadingAt(lines, index);",
      "  if (parsed) {",
      "    if (parsed.level === 1 && parsed.text === 'soul') { prelude.push(...parsed.rawLines); currentSection = null; currentExtra = null; index += parsed.lineCount; continue; }",
      "    const key = aliasMap.get(parsed.text) ?? null;",
      "    if (key) { currentSection = key; currentExtra = null; index += parsed.lineCount; continue; }",
      "    currentSection = null; currentExtra = [...parsed.rawLines]; extras.push(currentExtra); index += parsed.lineCount; continue;",
      "  }",
      "  const line = lines[index] ?? '';",
      "  if (currentExtra) { currentExtra.push(line); index += 1; continue; }",
      "  if (currentSection) { sections[currentSection].push(line); index += 1; continue; }",
      "  prelude.push(line);",
      "  index += 1;",
      "}",
      "const trimBlankEdges = (values) => { while (values.length > 0 && values[0].trim() === '') values.shift(); while (values.length > 0 && values[values.length - 1].trim() === '') values.pop(); return values; };",
      "const output = trimBlankEdges([...prelude]);",
      "for (const key of sectionOrder) {",
      "  if (output.length > 0 && output[output.length - 1].trim() !== '') output.push('');",
      "  output.push(sectionHeadings[key]);",
      "  const body = trimBlankEdges([...sections[key]]);",
      "  output.push(...body);",
      "}",
      "for (const extra of extras) {",
      "  const body = trimBlankEdges([...extra]);",
      "  if (body.length === 0) continue;",
      "  if (output.length > 0 && output[output.length - 1].trim() !== '') output.push('');",
      "  output.push(...body);",
      "}",
      "const normalized = `${output.join('\\n').replace(/\\n+$/, '')}\\n`;",
      "fs.writeFileSync(file, normalized);",
    ].join(' ');
    const normalizeCommand = `node --input-type=module -e ${shellSingleQuote(normalizeToOpenclaw)}`;
    return `${normalizeCommand} && ${buildDocumentRepairCommand('SOUL.md', SOUL_GUIDANCE_SENTINEL, SOUL_SECTIONS)}`;
  }

  return null;
}

export function buildCoreFoundationCommand(queuedArea: unknown): string | null {
  if (!queuedArea || typeof queuedArea !== 'object') {
    return null;
  }

  const record = queuedArea as { area?: unknown; status?: unknown; paths?: unknown; missingPaths?: unknown; thinPaths?: unknown };
  const area = typeof record.area === 'string' ? record.area : null;
  const status = typeof record.status === 'string' ? record.status : null;
  const paths = normalizeRelativePaths(record.paths).map((value) => value.split(path.sep).join('/'));
  const missingPaths = normalizeRelativePaths(record.missingPaths).map((value) => value.split(path.sep).join('/'));
  const thinPaths = normalizeRelativePaths(record.thinPaths).map((value) => value.split(path.sep).join('/'));

  if (area === 'skills') {
    const rootReadmePaths = paths.filter((value) => value === 'skills/README.md');
    const rootThinPaths = thinPaths.filter((value) => value === 'skills/README.md');
    const skillPaths = paths.filter((value) => value.endsWith('/SKILL.md'));
    const normalizedMissingSkillPaths = missingPaths.filter((value) => value.endsWith('/SKILL.md'));
    const normalizedThinSkillPaths = thinPaths.filter((value) => value.endsWith('/SKILL.md'));
    const rootReadmeCommand = rootThinPaths.length > 0
      ? buildSkillsRootReadmeRepairCommand(rootThinPaths)
      : buildSkillsRootReadmeCommand(rootReadmePaths);

    if (normalizedMissingSkillPaths.length > 0 || normalizedThinSkillPaths.length > 0 || rootReadmeCommand) {
      const createCommand = buildSkillDocumentationSeedCommand(normalizedMissingSkillPaths);
      const appendCommand = buildSkillGuidanceAppendCommand(normalizedThinSkillPaths);
      const commandSegments = [rootReadmeCommand, createCommand, appendCommand]
        .filter((value): value is string => typeof value === 'string' && value.length > 0);

      if (commandSegments.length === 1) {
        return commandSegments[0];
      }

      if (commandSegments.length > 1) {
        return commandSegments.map((command) => `(${command})`).join(' && ');
      }
    }

    if (rootReadmeCommand && skillPaths.length === 0) {
      return rootReadmeCommand;
    }

    if (skillPaths.length > 0 && skillPaths.length === paths.length) {
      return buildSkillDocumentationSeedCommand(skillPaths);
    }

    if (status === 'missing') {
      const skillsStarterCommand = buildSkillsStarterCommand(paths);
      if (skillsStarterCommand) {
        return skillsStarterCommand;
      }
    }
  }

  if (area === 'voice') {
    return buildVoiceCommand(status);
  }

  if (area === 'soul') {
    return buildSoulCommand(status);
  }

  if (area === 'memory' && (status === 'missing' || status === 'thin')) {
    const memoryThinRootPaths = thinPaths.filter((value) => value === 'memory/README.md');
    const memorySeedPaths = paths.filter((value) => value !== 'memory/README.md' || !memoryThinRootPaths.includes(value));
    const commandSegments = [
      buildMemoryReadmeRepairCommand(memoryThinRootPaths),
      buildMemorySeedCommand(memorySeedPaths),
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
    const memoryCommand = commandSegments.length <= 1
      ? (commandSegments[0] ?? null)
      : commandSegments.join(' && ');
    if (memoryCommand) {
      return memoryCommand;
    }
  }

  if (area === 'memory' && paths.length === 1 && paths[0] === 'memory/README.md') {
    return `mkdir -p ${shellSingleQuote('memory')} && printf %s ${shellSingleQuote(MEMORY_README_TEMPLATE)} > ${shellSingleQuote('memory/README.md')}`;
  }

  return null;
}

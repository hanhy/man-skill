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
const SKILLS_README_TEMPLATE = '# Skills\n\n## What lives here\n- Reusable operator procedures and behavior modules.\n\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- README.md: shared conventions for the repo skills layer\n';
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
    missingSectionAppend: '\n## Layout\n- <skill>/SKILL.md: per-skill workflow and guidance\n- README.md: shared conventions for the repo skills layer\n',
    existingBulletAppend: '- <skill>/SKILL.md: per-skill workflow and guidance\n- README.md: shared conventions for the repo skills layer\n',
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
const SOUL_STARTER_TEMPLATE = '# Soul\n\n## Core values\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Decision rules\n- Note the principles to use when tradeoffs appear.\n';
const SOUL_GUIDANCE_SENTINEL = '- Describe the durable values and goals that should survive across tasks.';
const SOUL_GUIDANCE_APPEND_TEMPLATE = '\n## Core values\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Decision rules\n- Note the principles to use when tradeoffs appear.\n';
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
] as const;

function quoteShellPath(value: string): string {
  // Keep the hardcoded daily seed template expandable at runtime while quoting static paths.
  return value === DAILY_MEMORY_SEED_PATH
    ? `"${value}"`
    : shellSingleQuote(value);
}

function buildSkillsStarterCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length !== 1 || normalizedPaths[0] !== 'skills/') {
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
  const file = shellSingleQuote(filePath);
  const buildSectionHasContentCommand = (heading: string) => [
    'awk',
    `-v heading=${shellSingleQuote(heading)}`,
    shellSingleQuote("BEGIN { in_section = 0; has_content = 0 } $0 == heading { in_section = 1; next } /^## / { if (in_section) exit } in_section && $0 !~ /^[[:space:]]*$/ { has_content = 1 } END { exit has_content ? 0 : 1 }"),
    file,
  ].join(' ');
  const buildInsertIntoExistingSectionCommand = (heading: string, bullet: string) => {
    const normalizedBullet = bullet.replace(/\n+$/, '');
    const escapePerlReplacement = (value: string) => value
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

function buildVoiceCommand(status: string | null): string | null {
  if (status === 'missing') {
    return `mkdir -p voice && printf %s ${shellSingleQuote(VOICE_STARTER_TEMPLATE)} > voice/README.md`;
  }

  if (status === 'thin') {
    return buildDocumentRepairCommand('voice/README.md', VOICE_GUIDANCE_SENTINEL, VOICE_SECTIONS);
  }

  return null;
}

function buildSoulCommand(status: string | null): string | null {
  if (status === 'missing') {
    return `printf %s ${shellSingleQuote(SOUL_STARTER_TEMPLATE)} > SOUL.md`;
  }

  if (status === 'thin') {
    return buildDocumentRepairCommand('SOUL.md', SOUL_GUIDANCE_SENTINEL, SOUL_SECTIONS);
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
    const memoryCommand = buildMemorySeedCommand(paths);
    if (memoryCommand) {
      return memoryCommand;
    }
  }

  if (area === 'memory' && paths.length === 1 && paths[0] === 'memory/README.md') {
    return `mkdir -p ${shellSingleQuote('memory')} && printf %s ${shellSingleQuote(MEMORY_README_TEMPLATE)} > ${shellSingleQuote('memory/README.md')}`;
  }

  return null;
}

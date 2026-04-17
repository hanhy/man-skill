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

  return `mkdir -p skills/starter && printf %s ${shellSingleQuote('# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n')} > ${shellSingleQuote('skills/starter/SKILL.md')}`;
}

function buildSkillDocumentationSeedCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  if (normalizedPaths.length === 0 || !normalizedPaths.every((value) => value.endsWith('/SKILL.md'))) {
    return null;
  }

  const mkdirPaths = Array.from(new Set(normalizedPaths.map((value) => path.posix.dirname(value))));
  const starterTemplate = shellSingleQuote('# Starter skill\n\n## What this skill is for\n- Describe when to use this skill.\n\n## Suggested workflow\n- Add the steps here.\n');
  const fileList = normalizedPaths.map(shellSingleQuote).join(' ');

  return `mkdir -p ${quotePaths(mkdirPaths)} && for file in ${fileList}; do [ -f "$file" ] || printf %s ${starterTemplate} > "$file"; done`;
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

function buildVoiceCommand(status: string | null): string | null {
  if (status === 'missing') {
    return `mkdir -p voice && printf %s ${shellSingleQuote('# Voice\n\n- Add voice guidance here.\n')} > voice/README.md`;
  }

  if (status === 'thin') {
    return `grep -Fqx -- ${shellSingleQuote('- Add voice guidance here.')} voice/README.md || printf %s ${shellSingleQuote('\n- Add voice guidance here.\n')} >> voice/README.md`;
  }

  return null;
}

function buildSoulCommand(status: string | null): string | null {
  if (status === 'missing') {
    return `printf %s ${shellSingleQuote('# Soul\n\nAdd soul guidance here.\n')} > SOUL.md`;
  }

  if (status === 'thin') {
    return `grep -Fqx -- ${shellSingleQuote('Add soul guidance here.')} SOUL.md || printf %s ${shellSingleQuote('\nAdd soul guidance here.\n')} >> SOUL.md`;
  }

  return null;
}

export function buildCoreFoundationCommand(queuedArea: unknown): string | null {
  if (!queuedArea || typeof queuedArea !== 'object') {
    return null;
  }

  const record = queuedArea as { area?: unknown; status?: unknown; paths?: unknown };
  const area = typeof record.area === 'string' ? record.area : null;
  const status = typeof record.status === 'string' ? record.status : null;
  const paths = normalizeRelativePaths(record.paths).map((value) => value.split(path.sep).join('/'));

  if (area === 'skills' && paths.length > 0 && paths.every((value) => value.endsWith('/SKILL.md'))) {
    return buildSkillDocumentationSeedCommand(paths);
  }

  if (area === 'skills' && status === 'missing') {
    const skillsStarterCommand = buildSkillsStarterCommand(paths);
    if (skillsStarterCommand) {
      return skillsStarterCommand;
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
    return `mkdir -p memory && printf %s ${shellSingleQuote(MEMORY_README_TEMPLATE)} > ${shellSingleQuote('memory/README.md')}`;
  }

  return null;
}

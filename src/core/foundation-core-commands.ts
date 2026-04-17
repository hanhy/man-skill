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

function buildMemorySeedCommand(paths: string[]): string | null {
  const normalizedPaths = Array.from(new Set(paths));
  const needsRootDocument = normalizedPaths.includes('memory/README.md');
  const bucketSeedFiles = normalizedPaths.flatMap((value) => {
    if (value === 'memory/daily') {
      return ['memory/daily/$(date +%F).md'];
    }

    if (value === 'memory/long-term') {
      return ['memory/long-term/notes.md'];
    }

    if (value === 'memory/scratch') {
      return ['memory/scratch/draft.md'];
    }

    return [];
  });

  if (!needsRootDocument && bucketSeedFiles.length === 0) {
    return null;
  }

  const mkdirPaths = Array.from(new Set(bucketSeedFiles.map((value) => path.posix.dirname(value))));
  const touchPaths = [
    ...(needsRootDocument ? ['memory/README.md'] : []),
    ...bucketSeedFiles,
  ];
  const commandSegments: string[] = [];

  if (mkdirPaths.length > 0) {
    commandSegments.push(`mkdir -p ${mkdirPaths.join(' ')}`);
  }

  if (touchPaths.length > 0) {
    commandSegments.push(`touch ${touchPaths.join(' ')}`);
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
    return `touch ${paths.map(shellSingleQuote).join(' ')}`;
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
    return 'touch memory/README.md';
  }

  return null;
}

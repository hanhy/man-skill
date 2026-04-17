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

  if (area === 'voice' && status === 'missing') {
    return 'mkdir -p voice && touch voice/README.md';
  }

  if (area === 'soul' && status === 'missing') {
    return 'touch SOUL.md';
  }

  if (area === 'memory' && status === 'missing') {
    return 'mkdir -p memory/daily memory/long-term memory/scratch && touch memory/README.md';
  }

  if (area === 'memory' && paths.length === 1 && paths[0] === 'memory/README.md') {
    return 'touch memory/README.md';
  }

  return null;
}

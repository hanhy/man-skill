function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function extractExcerpt(document: string | null | undefined, maxLength = 160): string | null {
  if (!isNonEmptyString(document)) {
    return null;
  }

  const candidate = document
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));

  if (!candidate) {
    return null;
  }

  const normalized = candidate.replace(/^[-*]\s*/, '').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function countContentLines(document: string | null | undefined): number {
  if (!isNonEmptyString(document)) {
    return 0;
  }

  return document
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .length;
}

export interface CoreMemoryFoundationSummary {
  hasRootDocument: boolean;
  dailyCount: number;
  longTermCount: number;
  scratchCount: number;
  totalEntries: number;
}

export interface CoreSkillsFoundationSummary {
  count: number;
  sample: string[];
}

export interface CoreDocumentFoundationSummary {
  present: boolean;
  lineCount: number;
  excerpt: string | null;
}

export interface CoreFoundationSummary {
  memory: CoreMemoryFoundationSummary;
  skills: CoreSkillsFoundationSummary;
  soul: CoreDocumentFoundationSummary;
  voice: CoreDocumentFoundationSummary;
}

export interface BuildCoreFoundationSummaryOptions {
  soulDocument?: string | null;
  voiceDocument?: string | null;
  memoryIndex?: {
    root?: string | null;
    daily?: string[];
    longTerm?: string[];
    scratch?: string[];
  } | null;
  skillNames?: string[];
}

export function buildCoreFoundationSummary({
  soulDocument = null,
  voiceDocument = null,
  memoryIndex = null,
  skillNames = [],
}: BuildCoreFoundationSummaryOptions = {}): CoreFoundationSummary {
  const daily = Array.isArray(memoryIndex?.daily) ? memoryIndex.daily : [];
  const longTerm = Array.isArray(memoryIndex?.longTerm) ? memoryIndex.longTerm : [];
  const scratch = Array.isArray(memoryIndex?.scratch) ? memoryIndex.scratch : [];
  const safeSkillNames = Array.isArray(skillNames) ? [...skillNames].sort((left, right) => left.localeCompare(right)) : [];

  return {
    memory: {
      hasRootDocument: isNonEmptyString(memoryIndex?.root),
      dailyCount: daily.length,
      longTermCount: longTerm.length,
      scratchCount: scratch.length,
      totalEntries: daily.length + longTerm.length + scratch.length,
    },
    skills: {
      count: safeSkillNames.length,
      sample: safeSkillNames.slice(0, 5),
    },
    soul: {
      present: isNonEmptyString(soulDocument),
      lineCount: countContentLines(soulDocument),
      excerpt: extractExcerpt(soulDocument),
    },
    voice: {
      present: isNonEmptyString(voiceDocument),
      lineCount: countContentLines(voiceDocument),
      excerpt: extractExcerpt(voiceDocument),
    },
  };
}

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

function collectRecommendedActions({
  memoryHasRootDocument,
  memoryTotalEntries,
  skillsCount,
  documentedSkillCount,
  soulPresent,
  soulLineCount,
  voicePresent,
  voiceLineCount,
}: {
  memoryHasRootDocument: boolean;
  memoryTotalEntries: number;
  skillsCount: number;
  documentedSkillCount: number;
  soulPresent: boolean;
  soulLineCount: number;
  voicePresent: boolean;
  voiceLineCount: number;
}): string[] {
  const actions: string[] = [];

  if (!memoryHasRootDocument) {
    actions.push('create memory/README.md');
  }

  if (memoryTotalEntries === 0) {
    actions.push('add at least one entry under memory/daily, memory/long-term, or memory/scratch');
  }

  if (skillsCount === 0) {
    actions.push('create skills/<name>/SKILL.md for at least one repo skill');
  } else if (documentedSkillCount < skillsCount) {
    actions.push('document placeholder skill folders with SKILL.md');
  }

  if (!soulPresent) {
    actions.push('create SOUL.md');
  } else if (soulLineCount === 0) {
    actions.push('add non-heading guidance to SOUL.md');
  }

  if (!voicePresent) {
    actions.push('create voice/README.md');
  } else if (voiceLineCount === 0) {
    actions.push('add non-heading guidance to voice/README.md');
  }

  return actions;
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
  documentedCount: number;
  undocumentedCount: number;
  sample: string[];
  undocumentedSample: string[];
}

export interface CoreDocumentFoundationSummary {
  present: boolean;
  lineCount: number;
  excerpt: string | null;
}

export interface CoreFoundationOverview {
  readyAreaCount: number;
  totalAreaCount: number;
  missingAreas: string[];
  thinAreas: string[];
  recommendedActions: string[];
}

export interface CoreFoundationSummary {
  memory: CoreMemoryFoundationSummary;
  skills: CoreSkillsFoundationSummary;
  soul: CoreDocumentFoundationSummary;
  voice: CoreDocumentFoundationSummary;
  overview: CoreFoundationOverview;
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
  skillInventory?: {
    names?: string[];
    documented?: string[];
    undocumented?: string[];
  } | null;
}

export function buildCoreFoundationSummary({
  soulDocument = null,
  voiceDocument = null,
  memoryIndex = null,
  skillNames = [],
  skillInventory = null,
}: BuildCoreFoundationSummaryOptions = {}): CoreFoundationSummary {
  const daily = Array.isArray(memoryIndex?.daily) ? memoryIndex.daily : [];
  const longTerm = Array.isArray(memoryIndex?.longTerm) ? memoryIndex.longTerm : [];
  const scratch = Array.isArray(memoryIndex?.scratch) ? memoryIndex.scratch : [];
  const safeSkillNames = Array.isArray(skillInventory?.names)
    ? [...skillInventory.names].sort((left, right) => left.localeCompare(right))
    : (Array.isArray(skillNames) ? [...skillNames].sort((left, right) => left.localeCompare(right)) : []);
  const documentedSkillNames = Array.isArray(skillInventory?.documented)
    ? [...skillInventory.documented].sort((left, right) => left.localeCompare(right))
    : [...safeSkillNames];
  const undocumentedSkillNames = Array.isArray(skillInventory?.undocumented)
    ? [...skillInventory.undocumented].sort((left, right) => left.localeCompare(right))
    : safeSkillNames.filter((skillName) => !documentedSkillNames.includes(skillName));
  const memory = {
    hasRootDocument: isNonEmptyString(memoryIndex?.root),
    dailyCount: daily.length,
    longTermCount: longTerm.length,
    scratchCount: scratch.length,
    totalEntries: daily.length + longTerm.length + scratch.length,
  };
  const skills = {
    count: safeSkillNames.length,
    documentedCount: documentedSkillNames.length,
    undocumentedCount: undocumentedSkillNames.length,
    sample: safeSkillNames.slice(0, 5),
    undocumentedSample: undocumentedSkillNames.slice(0, 5),
  };
  const soul = {
    present: isNonEmptyString(soulDocument),
    lineCount: countContentLines(soulDocument),
    excerpt: extractExcerpt(soulDocument),
  };
  const voice = {
    present: isNonEmptyString(voiceDocument),
    lineCount: countContentLines(voiceDocument),
    excerpt: extractExcerpt(voiceDocument),
  };

  const missingAreas: string[] = [];
  const thinAreas: string[] = [];

  if (!memory.hasRootDocument && memory.totalEntries === 0) {
    missingAreas.push('memory');
  } else if (!memory.hasRootDocument || memory.totalEntries === 0) {
    thinAreas.push('memory');
  }

  if (skills.count === 0) {
    missingAreas.push('skills');
  } else if (skills.documentedCount === 0 || skills.documentedCount < skills.count) {
    thinAreas.push('skills');
  }

  if (!soul.present) {
    missingAreas.push('soul');
  } else if (soul.lineCount === 0) {
    thinAreas.push('soul');
  }

  if (!voice.present) {
    missingAreas.push('voice');
  } else if (voice.lineCount === 0) {
    thinAreas.push('voice');
  }

  const totalAreaCount = 4;
  const overview = {
    readyAreaCount: totalAreaCount - missingAreas.length - thinAreas.length,
    totalAreaCount,
    missingAreas,
    thinAreas,
    recommendedActions: collectRecommendedActions({
      memoryHasRootDocument: memory.hasRootDocument,
      memoryTotalEntries: memory.totalEntries,
      skillsCount: skills.count,
      documentedSkillCount: skills.documentedCount,
      soulPresent: soul.present,
      soulLineCount: soul.lineCount,
      voicePresent: voice.present,
      voiceLineCount: voice.lineCount,
    }),
  };

  return {
    memory,
    skills,
    soul,
    voice,
    overview,
  };
}

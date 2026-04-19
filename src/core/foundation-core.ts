import { buildCoreFoundationCommand } from './foundation-core-commands.ts';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildFoundationScaffoldBundle(commands: Array<string | null | undefined>): string | null {
  const normalizedCommands = commands.filter((value): value is string => typeof value === 'string' && value.length > 0);
  if (normalizedCommands.length === 0) {
    return null;
  }

  if (normalizedCommands.length === 1) {
    return normalizedCommands[0];
  }

  return normalizedCommands.map((command) => `(${command})`).join(' && ');
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

function formatList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function buildMemoryBucketAction(emptyBuckets: string[]): string | null {
  const bucketPaths = emptyBuckets
    .map((bucket) => `memory/${bucket}`)
    .filter(Boolean);

  if (bucketPaths.length === 0) {
    return null;
  }

  return `add at least one entry under ${formatList(bucketPaths)}`;
}

function buildMemoryMaintenanceAction({
  hasRootDocument,
  emptyBuckets,
}: {
  hasRootDocument: boolean;
  emptyBuckets: string[];
}): string | null {
  const actions: string[] = [];

  if (!hasRootDocument) {
    actions.push('create memory/README.md');
  }

  const bucketAction = buildMemoryBucketAction(emptyBuckets);
  if (bucketAction) {
    actions.push(bucketAction);
  }

  if (actions.length === 0) {
    return null;
  }

  return actions.join(' | ');
}

function buildMemoryMaintenancePaths({
  hasRootDocument,
  emptyBuckets,
}: {
  hasRootDocument: boolean;
  emptyBuckets: string[];
}): string[] {
  const paths: string[] = [];

  if (!hasRootDocument) {
    paths.push('memory/README.md');
  }

  emptyBuckets
    .map((bucket) => `memory/${bucket}`)
    .forEach((bucketPath) => {
      if (!paths.includes(bucketPath)) {
        paths.push(bucketPath);
      }
    });

  return paths;
}

function buildSkillsDocumentationPaths(undocumentedSkillNames: string[]): string[] {
  return undocumentedSkillNames
    .filter((skillName) => isNonEmptyString(skillName))
    .map((skillName) => `skills/${skillName}/SKILL.md`);
}

function buildSkillsMaintenanceAction({
  skillsCount,
  undocumentedSkillNames,
  thinSkillNames,
}: {
  skillsCount: number;
  undocumentedSkillNames: string[];
  thinSkillNames: string[];
}): string | null {
  if (skillsCount === 0) {
    return 'create skills/<name>/SKILL.md for at least one repo skill';
  }

  const documentationPaths = buildSkillsDocumentationPaths(undocumentedSkillNames);
  const thinDocumentationPaths = buildSkillsDocumentationPaths(thinSkillNames);
  const actions = [
    documentationPaths.length > 0 ? `create ${formatList(documentationPaths)}` : null,
    thinDocumentationPaths.length > 0 ? `add non-heading guidance to ${formatList(thinDocumentationPaths)}` : null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (actions.length === 0) {
    return null;
  }

  return actions.join(' | ');
}

function collectRecommendedActions({
  memoryHasRootDocument,
  memoryEmptyBuckets,
  skillsCount,
  undocumentedSkillNames,
  thinSkillNames,
  soulPresent,
  soulLineCount,
  voicePresent,
  voiceLineCount,
}: {
  memoryHasRootDocument: boolean;
  memoryEmptyBuckets: string[];
  skillsCount: number;
  undocumentedSkillNames: string[];
  thinSkillNames: string[];
  soulPresent: boolean;
  soulLineCount: number;
  voicePresent: boolean;
  voiceLineCount: number;
}): string[] {
  const actions: string[] = [];

  if (!memoryHasRootDocument) {
    actions.push('create memory/README.md');
  }

  const memoryBucketAction = buildMemoryBucketAction(memoryEmptyBuckets);
  if (memoryBucketAction) {
    actions.push(memoryBucketAction);
  }

  const skillsAction = buildSkillsMaintenanceAction({
    skillsCount,
    undocumentedSkillNames,
    thinSkillNames,
  });
  if (skillsAction) {
    actions.push(skillsAction);
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

function collectMemorySampleEntries({
  daily,
  longTerm,
  scratch,
}: {
  daily: string[];
  longTerm: string[];
  scratch: string[];
}): string[] {
  return [
    ...daily.slice(0, 1).map((entry) => `daily/${entry}`),
    ...longTerm.slice(0, 1).map((entry) => `long-term/${entry}`),
    ...scratch.slice(0, 1).map((entry) => `scratch/${entry}`),
  ];
}

function summarizeMemoryFoundation(memory: CoreMemoryFoundationSummary): string {
  return `README ${memory.hasRootDocument ? 'yes' : 'no'}, daily ${memory.dailyCount}, long-term ${memory.longTermCount}, scratch ${memory.scratchCount}`;
}

function summarizeSkillsFoundation(skills: CoreSkillsFoundationSummary): string {
  const missingRootSummary = skills.count > 0 && !skills.hasRootDocument && isNonEmptyString(skills.rootPath)
    ? `, root missing @ ${skills.rootPath}`
    : '';
  return `${skills.count} registered, ${skills.documentedCount} documented${missingRootSummary}`;
}

function summarizeDocumentFoundation(document: CoreDocumentFoundationSummary): string {
  return `${document.present ? 'present' : 'missing'}, ${document.lineCount} lines`;
}

function buildCoreFoundationMaintenance({
  memory,
  skills,
  missingSkillNames,
  thinSkillNames,
  soul,
  voice,
}: {
  memory: CoreMemoryFoundationSummary;
  skills: CoreSkillsFoundationSummary;
  missingSkillNames: string[];
  thinSkillNames: string[];
  soul: CoreDocumentFoundationSummary;
  voice: CoreDocumentFoundationSummary;
}): CoreFoundationMaintenanceSummary {
  const queue: CoreFoundationMaintenanceQueueItem[] = [];
  const skillsAction = buildSkillsMaintenanceAction({
    skillsCount: skills.count,
    undocumentedSkillNames: missingSkillNames,
    thinSkillNames,
  });
  const missingSkillPaths = buildSkillsDocumentationPaths(missingSkillNames);
  const thinSkillPaths = buildSkillsDocumentationPaths(thinSkillNames);
  const soulAction = !soul.present
    ? 'create SOUL.md'
    : (soul.lineCount === 0 ? 'add non-heading guidance to SOUL.md' : null);
  const voiceAction = !voice.present
    ? 'create voice/README.md'
    : (voice.lineCount === 0 ? 'add non-heading guidance to voice/README.md' : null);

  const areas: CoreFoundationMaintenanceQueueItem[] = [
    {
      area: 'memory',
      status: (!memory.hasRootDocument && memory.totalEntries === 0)
        ? 'missing'
        : ((!memory.hasRootDocument || memory.emptyBuckets.length > 0) ? 'thin' : 'ready'),
      summary: summarizeMemoryFoundation(memory),
      action: buildMemoryMaintenanceAction({
        hasRootDocument: memory.hasRootDocument,
        emptyBuckets: memory.emptyBuckets,
      }),
      paths: buildMemoryMaintenancePaths({
        hasRootDocument: memory.hasRootDocument,
        emptyBuckets: memory.emptyBuckets,
      }),
    },
    {
      area: 'skills',
      status: skills.count === 0 ? 'missing' : (skills.documentedCount < skills.count ? 'thin' : 'ready'),
      summary: summarizeSkillsFoundation(skills),
      action: skillsAction,
      paths: skills.count === 0 ? ['skills/'] : Array.from(new Set([...missingSkillPaths, ...thinSkillPaths])),
      ...(missingSkillPaths.length > 0 ? { missingPaths: missingSkillPaths } : {}),
      ...(thinSkillPaths.length > 0 ? { thinPaths: thinSkillPaths } : {}),
    },
    {
      area: 'soul',
      status: !soul.present ? 'missing' : (soul.lineCount === 0 ? 'thin' : 'ready'),
      summary: summarizeDocumentFoundation(soul),
      action: soulAction,
      paths: ['SOUL.md'],
    },
    {
      area: 'voice',
      status: !voice.present ? 'missing' : (voice.lineCount === 0 ? 'thin' : 'ready'),
      summary: summarizeDocumentFoundation(voice),
      action: voiceAction,
      paths: ['voice/README.md'],
    },
  ];

  areas.forEach((area) => {
    const command = buildCoreFoundationCommand(area);
    if (area.status !== 'ready') {
      queue.push({
        ...area,
        command,
      });
    }
  });

  return {
    areaCount: areas.length,
    readyAreaCount: areas.filter((area) => area.status === 'ready').length,
    missingAreaCount: areas.filter((area) => area.status === 'missing').length,
    thinAreaCount: areas.filter((area) => area.status === 'thin').length,
    helperCommands: {
      scaffoldAll: buildFoundationScaffoldBundle(queue.map((area) => area.command)),
      scaffoldMissing: buildFoundationScaffoldBundle(queue
        .filter((area) => area.status === 'missing')
        .map((area) => area.command)),
      scaffoldThin: buildFoundationScaffoldBundle(queue
        .filter((area) => area.status === 'thin')
        .map((area) => area.command)),
      memory: queue.find((area) => area.area === 'memory')?.command ?? null,
      skills: queue.find((area) => area.area === 'skills')?.command ?? null,
      soul: queue.find((area) => area.area === 'soul')?.command ?? null,
      voice: queue.find((area) => area.area === 'voice')?.command ?? null,
    },
    queuedAreas: queue,
  };
}

export interface CoreMemoryFoundationSummary {
  hasRootDocument: boolean;
  rootPath: string;
  rootExcerpt: string | null;
  dailyCount: number;
  longTermCount: number;
  scratchCount: number;
  totalEntries: number;
  readyBucketCount: number;
  totalBucketCount: number;
  populatedBuckets: string[];
  emptyBuckets: string[];
  sampleEntries: string[];
}

export interface CoreSkillsFoundationSummary {
  count: number;
  hasRootDocument: boolean;
  rootPath: string;
  documentedCount: number;
  undocumentedCount: number;
  thinCount: number;
  sample: string[];
  samplePaths: string[];
  sampleExcerpts: string[];
  undocumentedSample: string[];
  undocumentedPaths: string[];
  thinSample: string[];
  thinPaths: string[];
}

export interface CoreDocumentFoundationSummary {
  present: boolean;
  path: string;
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

export interface CoreFoundationMaintenanceQueueItem {
  area: 'memory' | 'skills' | 'soul' | 'voice';
  status: 'ready' | 'thin' | 'missing';
  summary: string;
  action: string | null;
  paths: string[];
  missingPaths?: string[];
  thinPaths?: string[];
  command?: string | null;
}

export interface CoreFoundationMaintenanceHelperCommands {
  scaffoldAll: string | null;
  scaffoldMissing: string | null;
  scaffoldThin: string | null;
  memory: string | null;
  skills: string | null;
  soul: string | null;
  voice: string | null;
}

export interface CoreFoundationMaintenanceSummary {
  areaCount: number;
  readyAreaCount: number;
  missingAreaCount: number;
  thinAreaCount: number;
  helperCommands: CoreFoundationMaintenanceHelperCommands;
  queuedAreas: CoreFoundationMaintenanceQueueItem[];
}

export interface CoreFoundationSummary {
  memory: CoreMemoryFoundationSummary;
  skills: CoreSkillsFoundationSummary;
  soul: CoreDocumentFoundationSummary;
  voice: CoreDocumentFoundationSummary;
  overview: CoreFoundationOverview;
  maintenance: CoreFoundationMaintenanceSummary;
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
    hasRootDocument?: boolean;
    rootPath?: string;
    documented?: string[];
    undocumented?: string[];
    thin?: string[];
    documentedExcerpts?: Record<string, string | null>;
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
  const memoryBuckets = [
    { name: 'daily', count: daily.length },
    { name: 'long-term', count: longTerm.length },
    { name: 'scratch', count: scratch.length },
  ];
  const populatedBuckets = memoryBuckets.filter((bucket) => bucket.count > 0).map((bucket) => bucket.name);
  const emptyBuckets = memoryBuckets.filter((bucket) => bucket.count === 0).map((bucket) => bucket.name);
  const safeSkillNames = Array.isArray(skillInventory?.names)
    ? [...skillInventory.names].sort((left, right) => left.localeCompare(right))
    : (Array.isArray(skillNames) ? [...skillNames].sort((left, right) => left.localeCompare(right)) : []);
  const documentedSkillNames = Array.isArray(skillInventory?.documented)
    ? [...skillInventory.documented].sort((left, right) => left.localeCompare(right))
    : [...safeSkillNames];
  const documentedSkillExcerpts = skillInventory?.documentedExcerpts ?? {};
  const missingSkillNames = Array.isArray(skillInventory?.undocumented)
    ? [...skillInventory.undocumented].sort((left, right) => left.localeCompare(right))
    : safeSkillNames.filter((skillName) => !documentedSkillNames.includes(skillName));
  const thinSkillNames = Array.isArray(skillInventory?.thin)
    ? [...skillInventory.thin].sort((left, right) => left.localeCompare(right))
    : [];
  const undocumentedSkillNames = Array.from(new Set(missingSkillNames));
  const memory = {
    hasRootDocument: isNonEmptyString(memoryIndex?.root),
    rootPath: 'memory/README.md',
    rootExcerpt: extractExcerpt(memoryIndex?.root),
    dailyCount: daily.length,
    longTermCount: longTerm.length,
    scratchCount: scratch.length,
    totalEntries: daily.length + longTerm.length + scratch.length,
    readyBucketCount: populatedBuckets.length,
    totalBucketCount: memoryBuckets.length,
    populatedBuckets,
    emptyBuckets,
    sampleEntries: collectMemorySampleEntries({ daily, longTerm, scratch }),
  };
  const skills = {
    count: safeSkillNames.length,
    hasRootDocument: skillInventory?.hasRootDocument === true,
    rootPath: typeof skillInventory?.rootPath === 'string' && skillInventory.rootPath.length > 0
      ? skillInventory.rootPath
      : 'skills/README.md',
    documentedCount: documentedSkillNames.length,
    undocumentedCount: undocumentedSkillNames.length,
    thinCount: thinSkillNames.length,
    sample: safeSkillNames.slice(0, 5),
    samplePaths: documentedSkillNames.slice(0, 5).map((skillName) => `skills/${skillName}/SKILL.md`),
    sampleExcerpts: documentedSkillNames
      .slice(0, 5)
      .map((skillName) => {
        const excerpt = documentedSkillExcerpts[skillName];
        return isNonEmptyString(excerpt) ? `${skillName}: ${excerpt}` : null;
      })
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
    undocumentedSample: undocumentedSkillNames.slice(0, 5),
    undocumentedPaths: undocumentedSkillNames.slice(0, 5).map((skillName) => `skills/${skillName}/SKILL.md`),
    thinSample: thinSkillNames.slice(0, 5),
    thinPaths: thinSkillNames.slice(0, 5).map((skillName) => `skills/${skillName}/SKILL.md`),
  };
  const soul = {
    present: isNonEmptyString(soulDocument),
    path: 'SOUL.md',
    lineCount: countContentLines(soulDocument),
    excerpt: extractExcerpt(soulDocument),
  };
  const voice = {
    present: isNonEmptyString(voiceDocument),
    path: 'voice/README.md',
    lineCount: countContentLines(voiceDocument),
    excerpt: extractExcerpt(voiceDocument),
  };

  const missingAreas: string[] = [];
  const thinAreas: string[] = [];

  if (!memory.hasRootDocument && memory.totalEntries === 0) {
    missingAreas.push('memory');
  } else if (!memory.hasRootDocument || memory.emptyBuckets.length > 0) {
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
      memoryEmptyBuckets: memory.emptyBuckets,
      skillsCount: skills.count,
      undocumentedSkillNames: missingSkillNames,
      thinSkillNames,
      soulPresent: soul.present,
      soulLineCount: soul.lineCount,
      voicePresent: voice.present,
      voiceLineCount: voice.lineCount,
    }),
  };
  const maintenance = buildCoreFoundationMaintenance({
    memory,
    skills,
    missingSkillNames,
    thinSkillNames,
    soul,
    voice,
  });

  return {
    memory,
    skills,
    soul,
    voice,
    overview,
    maintenance,
  };
}

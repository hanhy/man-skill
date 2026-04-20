import { buildCoreFoundationCommand } from './foundation-core-commands.ts';
import { collectVisibleDocumentLines, findDocumentExcerpt } from './document-excerpt.ts';
import { SoulProfile } from './soul-profile.ts';
import { VoiceProfile } from './voice-profile.ts';

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


function buildExcerpt(candidate: string | null | undefined, maxLength = 160): string | null {
  if (!isNonEmptyString(candidate)) {
    return null;
  }

  const normalized = candidate.replace(/^[-*]\s*/, '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function extractExcerpt(document: string | null | undefined, maxLength = 160): string | null {
  return buildExcerpt(findDocumentExcerpt(document), maxLength);
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
  rootMissingSections,
  emptyBuckets,
}: {
  hasRootDocument: boolean;
  rootMissingSections?: string[];
  emptyBuckets: string[];
}): string | null {
  const normalizedRootMissingSections = Array.isArray(rootMissingSections)
    ? rootMissingSections.filter((value): value is string => isNonEmptyString(value))
    : [];
  const actions: string[] = [];

  if (!hasRootDocument) {
    actions.push('create memory/README.md');
  } else if (normalizedRootMissingSections.length > 0) {
    actions.push(`add missing sections to memory/README.md: ${normalizedRootMissingSections.join(', ')}`);
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
  rootMissingSections,
  emptyBuckets,
}: {
  hasRootDocument: boolean;
  rootMissingSections?: string[];
  emptyBuckets: string[];
}): string[] {
  const paths: string[] = [];

  if (!hasRootDocument || (rootMissingSections?.length ?? 0) > 0) {
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

function formatSkillMissingSectionAction(skillName: string, missingSections: string[] | null | undefined): string {
  const skillPath = `skills/${skillName}/SKILL.md`;
  const normalizedMissingSections = Array.isArray(missingSections)
    ? missingSections.filter((value): value is string => isNonEmptyString(value))
    : [];

  if (normalizedMissingSections.length === 0) {
    return `add non-heading guidance to ${skillPath}`;
  }

  return `add missing sections to ${skillPath}: ${normalizedMissingSections.join(', ')}`;
}

function buildSkillsMaintenanceAction({
  hasRootDocument,
  rootMissingSections,
  skillsCount,
  undocumentedSkillNames,
  thinSkillNames,
  thinSkillMissingSections,
}: {
  hasRootDocument: boolean;
  rootMissingSections?: string[];
  skillsCount: number;
  undocumentedSkillNames: string[];
  thinSkillNames: string[];
  thinSkillMissingSections?: Record<string, string[] | null | undefined>;
}): string | null {
  if (skillsCount === 0) {
    return 'create skills/<name>/SKILL.md for at least one repo skill';
  }

  const documentationPaths = buildSkillsDocumentationPaths(undocumentedSkillNames);
  const thinActions = thinSkillNames.map((skillName) =>
    formatSkillMissingSectionAction(skillName, thinSkillMissingSections?.[skillName]),
  );
  const normalizedRootMissingSections = Array.isArray(rootMissingSections)
    ? rootMissingSections.filter((value): value is string => isNonEmptyString(value))
    : [];
  const actions = [
    !hasRootDocument
      ? 'create skills/README.md'
      : (normalizedRootMissingSections.length > 0
        ? `add missing sections to skills/README.md: ${normalizedRootMissingSections.join(', ')}`
        : null),
    documentationPaths.length > 0 ? `create ${formatList(documentationPaths)}` : null,
    thinActions.length > 0 ? thinActions.join(' | ') : null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (actions.length === 0) {
    return null;
  }

  return actions.join(' | ');
}

function buildSkillsMaintenancePaths({
  hasRootDocument,
  rootMissingSections,
  skillsCount,
  undocumentedSkillNames,
  thinSkillNames,
}: {
  hasRootDocument: boolean;
  rootMissingSections?: string[];
  skillsCount: number;
  undocumentedSkillNames: string[];
  thinSkillNames: string[];
}): string[] {
  if (skillsCount === 0) {
    return ['skills/starter/SKILL.md'];
  }

  return Array.from(new Set([
    ...((!hasRootDocument || (rootMissingSections?.length ?? 0) > 0) ? ['skills/README.md'] : []),
    ...buildSkillsDocumentationPaths(undocumentedSkillNames),
    ...buildSkillsDocumentationPaths(thinSkillNames),
  ]));
}

function collectRecommendedActions({
  memoryHasRootDocument,
  memoryRootMissingSections,
  memoryEmptyBuckets,
  skillsHasRootDocument,
  skillsRootMissingSections,
  skillsCount,
  undocumentedSkillNames,
  thinSkillNames,
  thinSkillMissingSections,
  soul,
  voice,
}: {
  memoryHasRootDocument: boolean;
  memoryRootMissingSections?: string[];
  memoryEmptyBuckets: string[];
  skillsHasRootDocument: boolean;
  skillsRootMissingSections?: string[];
  skillsCount: number;
  undocumentedSkillNames: string[];
  thinSkillNames: string[];
  thinSkillMissingSections?: Record<string, string[] | null | undefined>;
  soul: CoreDocumentFoundationSummary;
  voice: CoreDocumentFoundationSummary;
}): string[] {
  const actions: string[] = [];

  if (!memoryHasRootDocument) {
    actions.push('create memory/README.md');
  } else if ((memoryRootMissingSections?.length ?? 0) > 0) {
    actions.push(`add missing sections to memory/README.md: ${memoryRootMissingSections?.join(', ')}`);
  }

  const memoryBucketAction = buildMemoryBucketAction(memoryEmptyBuckets);
  if (memoryBucketAction) {
    actions.push(memoryBucketAction);
  }

  const skillsAction = buildSkillsMaintenanceAction({
    hasRootDocument: skillsHasRootDocument,
    rootMissingSections: skillsRootMissingSections,
    skillsCount,
    undocumentedSkillNames,
    thinSkillNames,
    thinSkillMissingSections,
  });
  if (skillsAction) {
    actions.push(skillsAction);
  }

  const soulAction = buildDocumentMaintenanceAction(soul);
  if (soulAction) {
    actions.push(soulAction);
  }

  const voiceAction = buildDocumentMaintenanceAction(voice);
  if (voiceAction) {
    actions.push(voiceAction);
  }

  return actions;
}

function countContentLines(document: string | null | undefined): number {
  if (!isNonEmptyString(document)) {
    return 0;
  }

  return stripNonVisibleMarkdownContent(document)
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

export function summarizeRootSectionSummary(
  readySections: string[] | undefined,
  missingSections: string[] | undefined,
  readySectionCount?: number,
  totalSectionCount?: number,
): string {
  const normalizedReadySections = Array.isArray(readySections)
    ? readySections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const normalizedMissingSections = Array.isArray(missingSections)
    ? missingSections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const resolvedTotalSectionCount = typeof totalSectionCount === 'number'
    ? totalSectionCount
    : normalizedReadySections.length + normalizedMissingSections.length;
  const resolvedReadySectionCount = typeof readySectionCount === 'number'
    ? readySectionCount
    : normalizedReadySections.length;

  if (resolvedTotalSectionCount === 0) {
    return '';
  }

  return `, root ${resolvedReadySectionCount}/${resolvedTotalSectionCount} sections ready${normalizedReadySections.length > 0 ? ` (${normalizedReadySections.join(', ')})` : ''}${normalizedMissingSections.length > 0 ? `, missing ${normalizedMissingSections.join(', ')}` : ''}`;
}

function summarizeMemoryFoundation(memory: CoreMemoryFoundationSummary): string {
  const rootSectionSummary = summarizeRootSectionSummary(
    memory.rootReadySections,
    memory.rootMissingSections,
    memory.rootReadySectionCount,
    memory.rootTotalSectionCount,
  );
  return `README ${memory.hasRootDocument ? 'yes' : 'no'}, daily ${memory.dailyCount}, long-term ${memory.longTermCount}, scratch ${memory.scratchCount}${rootSectionSummary}`;
}

function summarizeSkillsFoundation(skills: CoreSkillsFoundationSummary): string {
  const rootSectionSummary = summarizeRootSectionSummary(
    skills.rootReadySections,
    skills.rootMissingSections,
    skills.rootReadySectionCount,
    skills.rootTotalSectionCount,
  );
  const missingRootSummary = !skills.hasRootDocument && isNonEmptyString(skills.rootPath)
    ? `, root missing @ ${skills.rootPath}`
    : '';
  return `${skills.count} registered, ${skills.documentedCount} documented${missingRootSummary}${rootSectionSummary}`;
}

function summarizeDocumentFoundation(document: CoreDocumentFoundationSummary): string {
  const missingSections = Array.isArray(document.missingSections) ? document.missingSections : [];
  const readySections = Array.isArray(document.readySections) ? document.readySections : [];
  const sectionSummary = document.present && document.lineCount > 0
    && typeof document.readySectionCount === 'number' && typeof document.totalSectionCount === 'number'
    ? `, sections ${document.readySectionCount}/${document.totalSectionCount} ready`
    : '';
  const readySectionSummary = document.present && document.lineCount > 0 && readySections.length > 0
    ? ` (${readySections.join(', ')})`
    : '';
  const missingSectionSummary = document.present && document.lineCount > 0 && missingSections.length > 0
    ? `, missing ${missingSections.join(', ')}`
    : '';
  return `${document.present ? 'present' : 'missing'}, ${document.lineCount} lines${sectionSummary}${readySectionSummary}${missingSectionSummary}`;
}

function buildDocumentMaintenanceAction(document: CoreDocumentFoundationSummary): string | null {
  if (!document.present) {
    return document.path === 'SOUL.md' ? 'create SOUL.md' : 'create voice/README.md';
  }

  if (document.lineCount === 0) {
    return document.path === 'SOUL.md'
      ? 'add non-heading guidance to SOUL.md'
      : 'add non-heading guidance to voice/README.md';
  }

  const missingSections = Array.isArray(document.missingSections) ? document.missingSections : [];
  if (missingSections.length > 0) {
    const target = document.path === 'SOUL.md' ? 'SOUL.md' : 'voice/README.md';
    return `add missing sections to ${target}: ${missingSections.join(', ')}`;
  }

  return null;
}

function buildCoreFoundationMaintenance({
  memory,
  skills,
  missingSkillNames,
  thinSkillNames,
  thinSkillMissingSections,
  soul,
  voice,
}: {
  memory: CoreMemoryFoundationSummary;
  skills: CoreSkillsFoundationSummary;
  missingSkillNames: string[];
  thinSkillNames: string[];
  thinSkillMissingSections?: Record<string, string[] | null | undefined>;
  soul: CoreDocumentFoundationSummary;
  voice: CoreDocumentFoundationSummary;
}): CoreFoundationMaintenanceSummary {
  const queue: CoreFoundationMaintenanceQueueItem[] = [];
  const memoryRootThinMissingSections = Array.isArray(memory.rootMissingSections) ? memory.rootMissingSections : [];
  const memoryRootThinReadySections = Array.isArray(memory.rootReadySections) ? memory.rootReadySections : [];
  const rootThinMissingSections = Array.isArray(skills.rootMissingSections) ? skills.rootMissingSections : [];
  const rootThinReadySections = Array.isArray(skills.rootReadySections) ? skills.rootReadySections : [];
  const skillsAction = buildSkillsMaintenanceAction({
    hasRootDocument: skills.hasRootDocument,
    rootMissingSections: rootThinMissingSections,
    skillsCount: skills.count,
    undocumentedSkillNames: missingSkillNames,
    thinSkillNames,
    thinSkillMissingSections,
  });
  const missingSkillPaths = buildSkillsDocumentationPaths(missingSkillNames);
  const thinSkillPaths = buildSkillsDocumentationPaths(thinSkillNames);
  const thinRootPaths = rootThinMissingSections.length > 0 ? ['skills/README.md'] : [];
  const thinSkillMissingSectionsByPath = Object.fromEntries(
    thinSkillNames.map((skillName) => [`skills/${skillName}/SKILL.md`, skills.thinMissingSections?.[skillName] ?? []]),
  );
  const thinSkillReadySectionsByPath = Object.fromEntries(
    thinSkillNames.map((skillName) => [`skills/${skillName}/SKILL.md`, skills.thinReadySections?.[skillName] ?? []]),
  );
  const soulAction = buildDocumentMaintenanceAction(soul);
  const voiceAction = buildDocumentMaintenanceAction(voice);

  const areas: CoreFoundationMaintenanceQueueItem[] = [
    {
      area: 'memory',
      status: (!memory.hasRootDocument && memory.totalEntries === 0)
        ? 'missing'
        : ((!memory.hasRootDocument || memory.emptyBuckets.length > 0 || memoryRootThinMissingSections.length > 0) ? 'thin' : 'ready'),
      summary: summarizeMemoryFoundation(memory),
      action: buildMemoryMaintenanceAction({
        hasRootDocument: memory.hasRootDocument,
        rootMissingSections: memoryRootThinMissingSections,
        emptyBuckets: memory.emptyBuckets,
      }),
      paths: buildMemoryMaintenancePaths({
        hasRootDocument: memory.hasRootDocument,
        rootMissingSections: memoryRootThinMissingSections,
        emptyBuckets: memory.emptyBuckets,
      }),
      ...(memoryRootThinMissingSections.length > 0 ? { thinPaths: ['memory/README.md'] } : {}),
      ...(memoryRootThinMissingSections.length > 0 ? { rootThinMissingSections: memoryRootThinMissingSections } : {}),
      ...(memoryRootThinReadySections.length > 0 ? { rootThinReadySections: memoryRootThinReadySections } : {}),
      ...((memoryRootThinReadySections.length > 0 || memoryRootThinMissingSections.length > 0)
        ? {
          rootThinReadySectionCount: memoryRootThinReadySections.length,
          rootThinTotalSectionCount: memoryRootThinReadySections.length + memoryRootThinMissingSections.length,
        }
        : {}),
    },
    {
      area: 'skills',
      status: skills.count === 0
        ? 'missing'
        : ((!skills.hasRootDocument || rootThinMissingSections.length > 0 || thinSkillNames.length > 0 || skills.documentedCount < skills.count)
          ? 'thin'
          : 'ready'),
      summary: summarizeSkillsFoundation(skills),
      action: skillsAction,
      paths: buildSkillsMaintenancePaths({
        hasRootDocument: skills.hasRootDocument,
        rootMissingSections: rootThinMissingSections,
        skillsCount: skills.count,
        undocumentedSkillNames: missingSkillNames,
        thinSkillNames,
      }),
      ...(missingSkillPaths.length > 0 ? { missingPaths: missingSkillPaths } : {}),
      ...(thinSkillPaths.length > 0 || thinRootPaths.length > 0 ? { thinPaths: [...thinRootPaths, ...thinSkillPaths] } : {}),
      ...(Object.keys(thinSkillMissingSectionsByPath).length > 0 ? { thinMissingSections: thinSkillMissingSectionsByPath } : {}),
      ...(Object.keys(thinSkillReadySectionsByPath).length > 0 ? { thinReadySections: thinSkillReadySectionsByPath } : {}),
      ...(rootThinMissingSections.length > 0 ? { rootThinMissingSections: rootThinMissingSections } : {}),
      ...(rootThinReadySections.length > 0 ? { rootThinReadySections: rootThinReadySections } : {}),
      ...((rootThinReadySections.length > 0 || rootThinMissingSections.length > 0)
        ? {
          rootThinReadySectionCount: rootThinReadySections.length,
          rootThinTotalSectionCount: rootThinReadySections.length + rootThinMissingSections.length,
        }
        : {}),
    },
    {
      area: 'soul',
      status: !soul.present ? 'missing' : ((soul.lineCount === 0 || soul.missingSections.length > 0) ? 'thin' : 'ready'),
      summary: summarizeDocumentFoundation(soul),
      action: soulAction,
      paths: ['SOUL.md'],
      ...((soul.lineCount > 0 && (soul.readySections.length > 0 || soul.missingSections.length > 0))
        ? {
          rootThinReadySections: soul.readySections,
          rootThinMissingSections: soul.missingSections,
          rootThinReadySectionCount: soul.readySectionCount,
          rootThinTotalSectionCount: soul.totalSectionCount,
        }
        : {}),
    },
    {
      area: 'voice',
      status: !voice.present ? 'missing' : ((voice.lineCount === 0 || voice.missingSections.length > 0) ? 'thin' : 'ready'),
      summary: summarizeDocumentFoundation(voice),
      action: voiceAction,
      paths: ['voice/README.md'],
      ...((voice.lineCount > 0 && (voice.readySections.length > 0 || voice.missingSections.length > 0))
        ? {
          rootThinReadySections: voice.readySections,
          rootThinMissingSections: voice.missingSections,
          rootThinReadySectionCount: voice.readySectionCount,
          rootThinTotalSectionCount: voice.totalSectionCount,
        }
        : {}),
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

  const helperCommands = {
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
  };
  const recommendedQueueItem = queue[0] ?? null;
  const recommendedArea = recommendedQueueItem?.area ?? null;
  const recommendedStatus = queue.length === 1 ? (recommendedQueueItem?.status ?? null) : null;
  const recommendedSummary = queue.length === 1 ? (recommendedQueueItem?.summary ?? null) : null;
  const recommendedPaths = queue.length > 1
    ? Array.from(new Set(queue.flatMap((area) => area.paths ?? [])))
    : [...(queue[0]?.paths ?? [])];
  const queuedStatuses = new Set(queue.map((area) => area.status));
  const recommendedCommand = (() => {
    if (queue.length === 0) {
      return null;
    }

    if (queue.length === 1) {
      return queue[0]?.command ?? null;
    }

    if (queuedStatuses.size === 1 && queuedStatuses.has('missing') && helperCommands.scaffoldMissing) {
      return helperCommands.scaffoldMissing;
    }

    if (queuedStatuses.size === 1 && queuedStatuses.has('thin') && helperCommands.scaffoldThin) {
      return helperCommands.scaffoldThin;
    }

    return helperCommands.scaffoldAll;
  })();
  const recommendedAction = (() => {
    const firstAction = queue[0]?.action ?? null;
    if (queue.length === 0) {
      return null;
    }

    if (queue.length === 1) {
      return firstAction;
    }

    if (!firstAction) {
      if (queuedStatuses.size === 1 && queuedStatuses.has('missing')) {
        return 'scaffold missing core foundation areas';
      }

      if (queuedStatuses.size === 1 && queuedStatuses.has('thin')) {
        return 'repair thin core foundation areas';
      }

      return 'scaffold missing or thin core foundation areas';
    }

    if (queuedStatuses.size === 1 && queuedStatuses.has('missing')) {
      return `scaffold missing core foundation areas — starting with ${firstAction}`;
    }

    if (queuedStatuses.size === 1 && queuedStatuses.has('thin')) {
      return `repair thin core foundation areas — starting with ${firstAction}`;
    }

    return `scaffold missing or thin core foundation areas — starting with ${firstAction}`;
  })();

  return {
    areaCount: areas.length,
    readyAreaCount: areas.filter((area) => area.status === 'ready').length,
    missingAreaCount: areas.filter((area) => area.status === 'missing').length,
    thinAreaCount: areas.filter((area) => area.status === 'thin').length,
    recommendedArea,
    recommendedStatus,
    recommendedSummary,
    recommendedAction,
    recommendedCommand,
    recommendedPaths,
    helperCommands,
    queuedAreas: queue,
  };
}

export interface CoreMemoryFoundationSummary {
  hasRootDocument: boolean;
  rootPath: string;
  rootExcerpt: string | null;
  rootMissingSections?: string[];
  rootReadySections?: string[];
  rootReadySectionCount?: number;
  rootTotalSectionCount?: number;
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
  hasRootDocument: boolean;
  rootPath: string;
  rootExcerpt: string | null;
  rootMissingSections?: string[];
  rootReadySections?: string[];
  rootReadySectionCount?: number;
  rootTotalSectionCount?: number;
  count: number;
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
  thinMissingSections?: Record<string, string[]>;
  thinReadySections?: Record<string, string[]>;
}

export interface CoreDocumentFoundationSummary {
  present: boolean;
  path: string;
  rootPath: string;
  lineCount: number;
  excerpt: string | null;
  rootExcerpt: string | null;
  structured: boolean;
  readySectionCount: number;
  totalSectionCount: number;
  readySections: string[];
  missingSections: string[];
}

function normalizeSetextHeadingLines(lines: string[]): string[] {
  const normalizedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index] ?? '';
    const nextLine = lines[index + 1] ?? '';
    const trimmedCurrentLine = currentLine.trim();
    const setextMatch = nextLine.trim().match(/^(=+|-+)$/);

    if (
      setextMatch
      && trimmedCurrentLine.length > 0
      && !trimmedCurrentLine.startsWith('#')
    ) {
      const level = setextMatch[1].startsWith('=') ? '#' : '##';
      normalizedLines.push(`${level} ${trimmedCurrentLine}`);
      index += 1;
      continue;
    }

    normalizedLines.push(currentLine);
  }

  return normalizedLines;
}

function stripFrontmatter(document: string | null | undefined): string {
  if (!isNonEmptyString(document) || !document.startsWith('---')) {
    return document ?? '';
  }

  const lines = document.split(/\r?\n/);
  const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (closingIndex < 0) {
    return document;
  }

  return lines.slice(closingIndex + 2).join('\n');
}

function stripNonVisibleMarkdownContent(document: string | null | undefined): string {
  return normalizeSetextHeadingLines(collectVisibleDocumentLines(stripFrontmatter(document))).join('\n');
}

function parseMarkdownHeading(line: string | null | undefined): { level: number; text: string } | null {
  if (!isNonEmptyString(line)) {
    return null;
  }

  const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
  if (!match) {
    return null;
  }

  const normalizedText = match[2]
    .trim()
    .replace(/\s+#+\s*$/, '')
    .trim()
    .toLowerCase();

  return {
    level: match[1].length,
    text: normalizedText,
  };
}

function hasStructuredHeading(document: string | null | undefined, headings: string[]): boolean {
  if (!isNonEmptyString(document)) {
    return false;
  }

  const normalizedHeadings = headings.map((heading) => heading.toLowerCase());
  const visibleDocument = stripNonVisibleMarkdownContent(document);
  return visibleDocument
    .split('\n')
    .map((line) => parseMarkdownHeading(line))
    .some((heading) => heading !== null && heading.level >= 2 && normalizedHeadings.includes(heading.text));
}

function hasStructuredHeadingMatcher(
  document: string | null | undefined,
  matcher: (headingText: string) => boolean,
): boolean {
  if (!isNonEmptyString(document)) {
    return false;
  }

  const visibleDocument = stripNonVisibleMarkdownContent(document);
  return visibleDocument
    .split('\n')
    .map((line) => parseMarkdownHeading(line))
    .some((heading) => heading !== null && heading.level >= 2 && matcher(heading.text));
}

function isCurrentDefaultVoiceHeading(value: string): boolean {
  return value === 'current default for manskill' || /^current default for .+$/.test(value);
}

function summarizeStructuredSections(
  document: string | null | undefined,
  sections: Array<{ key: string; heading: string }>,
): { readySections: string[]; missingSections: string[] } {
  const visibleDocument = stripNonVisibleMarkdownContent(document);
  if (!isNonEmptyString(visibleDocument)) {
    return { readySections: [], missingSections: sections.map((section) => section.key) };
  }

  const lines = visibleDocument.split('\n');
  const readySections: string[] = [];
  const missingSections: string[] = [];

  sections.forEach((section) => {
    const headingText = section.heading.trim().replace(/^##\s+/, '').toLowerCase();
    const headingIndex = lines.findIndex((line) => {
      const parsed = parseMarkdownHeading(line);
      return parsed !== null && parsed.level >= 2 && parsed.text === headingText;
    });
    if (headingIndex === -1) {
      missingSections.push(section.key);
      return;
    }

    const sectionHeading = parseMarkdownHeading(lines[headingIndex]);
    const sectionHeadingLevel = sectionHeading?.level ?? 2;
    let hasContent = false;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      const normalizedLine = lines[index]?.trim() ?? '';
      const parsedHeading = parseMarkdownHeading(normalizedLine);
      if (parsedHeading !== null && parsedHeading.level <= sectionHeadingLevel) {
        break;
      }
      if (normalizedLine.length > 0 && !normalizedLine.startsWith('#')) {
        hasContent = true;
        break;
      }
    }

    if (hasContent) {
      readySections.push(section.key);
    } else {
      missingSections.push(section.key);
    }
  });

  return { readySections, missingSections };
}

function buildSoulDocumentSummary(document: string | null | undefined): CoreDocumentFoundationSummary {
  const profile = SoulProfile.fromDocument(document ?? '');
  const present = isNonEmptyString(document);
  const structured = hasStructuredHeading(document, ['core truths', 'core values', 'boundaries', 'vibe', 'continuity', 'decision rules']);
  const readySections = structured
    ? [
      profile.coreTruths.length > 0 ? 'core-truths' : null,
      profile.boundaries.length > 0 ? 'boundaries' : null,
      profile.vibe.length > 0 ? 'vibe' : null,
      profile.continuity.length > 0 ? 'continuity' : null,
    ].filter((value): value is string => typeof value === 'string')
    : [];
  const missingSections = structured
    ? [
      profile.coreTruths.length > 0 ? null : 'core-truths',
      profile.boundaries.length > 0 ? null : 'boundaries',
      profile.vibe.length > 0 ? null : 'vibe',
      profile.continuity.length > 0 ? null : 'continuity',
    ].filter((value): value is string => typeof value === 'string')
    : (present ? ['core-truths', 'boundaries', 'vibe', 'continuity'] : []);

  const lineCount = countContentLines(document);
  const excerpt = profile.excerpt;
  const readySectionCount = !present || lineCount === 0
    ? 0
    : readySections.length;

  return {
    present,
    path: 'SOUL.md',
    rootPath: 'SOUL.md',
    lineCount,
    excerpt,
    rootExcerpt: excerpt,
    structured,
    readySectionCount,
    totalSectionCount: 4,
    readySections,
    missingSections,
  };
}

function buildVoiceDocumentSummary(document: string | null | undefined): CoreDocumentFoundationSummary {
  const profile = VoiceProfile.fromDocument(document ?? '');
  const present = isNonEmptyString(document);
  const structured = hasStructuredHeading(document, [
    'tone',
    'signature moves',
    'avoid',
    'language hints',
    'voice should capture',
    'voice should not capture',
  ]) || hasStructuredHeadingMatcher(document, isCurrentDefaultVoiceHeading);
  const readySections = structured
    ? [
      profile.hasToneGuidance ? 'tone' : null,
      profile.signatures.length > 0 ? 'signature-moves' : null,
      profile.constraints.length > 0 ? 'avoid' : null,
      profile.languageHints.length > 0 ? 'language-hints' : null,
    ].filter((value): value is string => typeof value === 'string')
    : [];
  const missingSections = structured
    ? [
      profile.hasToneGuidance ? null : 'tone',
      profile.signatures.length > 0 ? null : 'signature-moves',
      profile.constraints.length > 0 ? null : 'avoid',
      profile.languageHints.length > 0 ? null : 'language-hints',
    ].filter((value): value is string => typeof value === 'string')
    : (present ? ['tone', 'signature-moves', 'avoid', 'language-hints'] : []);

  const lineCount = countContentLines(document);
  const excerpt = profile.style === 'documented' ? profile.tone : null;
  const readySectionCount = !present || lineCount === 0
    ? 0
    : readySections.length;

  return {
    present,
    path: 'voice/README.md',
    rootPath: 'voice/README.md',
    lineCount,
    excerpt,
    rootExcerpt: excerpt,
    structured,
    readySectionCount,
    totalSectionCount: 4,
    readySections,
    missingSections,
  };
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
  rootThinMissingSections?: string[];
  rootThinReadySections?: string[];
  rootThinReadySectionCount?: number;
  rootThinTotalSectionCount?: number;
  thinMissingSections?: Record<string, string[]>;
  thinReadySections?: Record<string, string[]>;
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
  recommendedArea: string | null;
  recommendedStatus: string | null;
  recommendedSummary: string | null;
  recommendedAction: string | null;
  recommendedCommand: string | null;
  recommendedPaths: string[];
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
    root?: string | null;
    names?: string[];
    hasRootDocument?: boolean;
    rootPath?: string;
    documented?: string[];
    undocumented?: string[];
    thin?: string[];
    documentedExcerpts?: Record<string, string | null>;
    thinMissingSections?: Record<string, string[] | null | undefined>;
    thinReadySections?: Record<string, string[] | null | undefined>;
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
  const thinSkillMissingSections = skillInventory?.thinMissingSections ?? {};
  const thinSkillReadySections = skillInventory?.thinReadySections ?? {};
  const undocumentedSkillNames = Array.from(new Set(missingSkillNames));
  const memoryRootSections = isNonEmptyString(memoryIndex?.root)
    ? summarizeStructuredSections(memoryIndex?.root, [
      { key: 'what-belongs-here', heading: '## What belongs here' },
      { key: 'buckets', heading: '## Buckets' },
    ])
    : { readySections: [], missingSections: [] };
  const memoryHasStructuredRootSections = memoryRootSections.readySections.length > 0 || memoryRootSections.missingSections.length > 0;
  const memory = {
    hasRootDocument: isNonEmptyString(memoryIndex?.root),
    rootPath: 'memory/README.md',
    rootExcerpt: extractExcerpt(memoryIndex?.root),
    ...(memoryHasStructuredRootSections ? {
      rootMissingSections: memoryRootSections.missingSections,
      rootReadySections: memoryRootSections.readySections,
      rootReadySectionCount: memoryRootSections.readySections.length,
      rootTotalSectionCount: memoryRootSections.readySections.length + memoryRootSections.missingSections.length,
    } : {}),
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
  const skillsRootDocument = skillInventory?.root;
  const skillsRootSections = isNonEmptyString(skillsRootDocument)
    ? summarizeStructuredSections(skillsRootDocument, [
      { key: 'what-lives-here', heading: '## What lives here' },
      { key: 'layout', heading: '## Layout' },
    ])
    : { readySections: [], missingSections: [] };
  const skillsHasStructuredRootSections = skillsRootSections.readySections.length > 0 || skillsRootSections.missingSections.length > 0;
  const skills = {
    hasRootDocument: isNonEmptyString(skillsRootDocument),
    rootPath: 'skills/README.md',
    rootExcerpt: extractExcerpt(skillsRootDocument),
    ...(skillsHasStructuredRootSections ? {
      rootMissingSections: skillsRootSections.missingSections,
      rootReadySections: skillsRootSections.readySections,
      rootReadySectionCount: skillsRootSections.readySections.length,
      rootTotalSectionCount: skillsRootSections.readySections.length + skillsRootSections.missingSections.length,
    } : {}),
    count: safeSkillNames.length,
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
    ...(thinSkillNames.length > 0 ? {
      thinMissingSections: Object.fromEntries(
        thinSkillNames.map((skillName) => [
          skillName,
          Array.isArray(thinSkillMissingSections?.[skillName])
            ? thinSkillMissingSections[skillName].filter((value): value is string => isNonEmptyString(value))
            : [],
        ]),
      ),
      thinReadySections: Object.fromEntries(
        thinSkillNames.map((skillName) => [
          skillName,
          Array.isArray(thinSkillReadySections?.[skillName])
            ? thinSkillReadySections[skillName].filter((value): value is string => isNonEmptyString(value))
            : [],
        ]),
      ),
    } : {}),
  };
  const soul = buildSoulDocumentSummary(soulDocument);
  const voice = buildVoiceDocumentSummary(voiceDocument);

  const missingAreas: string[] = [];
  const thinAreas: string[] = [];

  if (!memory.hasRootDocument && memory.totalEntries === 0) {
    missingAreas.push('memory');
  } else if (!memory.hasRootDocument || memory.emptyBuckets.length > 0 || (memory.rootMissingSections?.length ?? 0) > 0) {
    thinAreas.push('memory');
  }

  if (skills.count === 0) {
    missingAreas.push('skills');
  } else if (!skills.hasRootDocument || (skills.rootMissingSections?.length ?? 0) > 0 || skills.documentedCount < skills.count || thinSkillNames.length > 0) {
    thinAreas.push('skills');
  }

  if (!soul.present) {
    missingAreas.push('soul');
  } else if (soul.lineCount === 0 || soul.missingSections.length > 0) {
    thinAreas.push('soul');
  }

  if (!voice.present) {
    missingAreas.push('voice');
  } else if (voice.lineCount === 0 || voice.missingSections.length > 0) {
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
      memoryRootMissingSections: memory.rootMissingSections,
      memoryEmptyBuckets: memory.emptyBuckets,
      skillsHasRootDocument: skills.hasRootDocument,
      skillsRootMissingSections: skills.rootMissingSections,
      skillsCount: skills.count,
      undocumentedSkillNames: missingSkillNames,
      thinSkillNames,
      thinSkillMissingSections,
      soul,
      voice,
    }),
  };
  const maintenance = buildCoreFoundationMaintenance({
    memory,
    skills,
    missingSkillNames,
    thinSkillNames,
    thinSkillMissingSections,
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

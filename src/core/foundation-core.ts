import { buildCoreFoundationCommand } from './foundation-core-commands.ts';
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
  skillsCount,
  undocumentedSkillNames,
  thinSkillNames,
  thinSkillMissingSections,
}: {
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
  const actions = [
    documentationPaths.length > 0 ? `create ${formatList(documentationPaths)}` : null,
    thinActions.length > 0 ? thinActions.join(' | ') : null,
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
  thinSkillMissingSections,
  soul,
  voice,
}: {
  memoryHasRootDocument: boolean;
  memoryEmptyBuckets: string[];
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
  }

  const memoryBucketAction = buildMemoryBucketAction(memoryEmptyBuckets);
  if (memoryBucketAction) {
    actions.push(memoryBucketAction);
  }

  const skillsAction = buildSkillsMaintenanceAction({
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
  return `${skills.count} registered, ${skills.documentedCount} documented`;
}

function summarizeDocumentFoundation(document: CoreDocumentFoundationSummary): string {
  const missingSections = Array.isArray(document.missingSections) ? document.missingSections : [];
  const sectionSummary = document.present && document.lineCount > 0
    && typeof document.readySectionCount === 'number' && typeof document.totalSectionCount === 'number'
    ? `, sections ${document.readySectionCount}/${document.totalSectionCount} ready`
    : '';
  const missingSectionSummary = document.present && document.lineCount > 0 && missingSections.length > 0
    ? `, missing ${missingSections.join(', ')}`
    : '';
  return `${document.present ? 'present' : 'missing'}, ${document.lineCount} lines${sectionSummary}${missingSectionSummary}`;
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
  const skillsAction = buildSkillsMaintenanceAction({
    skillsCount: skills.count,
    undocumentedSkillNames: missingSkillNames,
    thinSkillNames,
    thinSkillMissingSections,
  });
  const missingSkillPaths = buildSkillsDocumentationPaths(missingSkillNames);
  const thinSkillPaths = buildSkillsDocumentationPaths(thinSkillNames);
  const thinSkillMissingSectionsByPath = Object.fromEntries(
    thinSkillNames.map((skillName) => [`skills/${skillName}/SKILL.md`, skills.thinMissingSections?.[skillName] ?? []]),
  );
  const soulAction = buildDocumentMaintenanceAction(soul);
  const voiceAction = buildDocumentMaintenanceAction(voice);

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
      ...(Object.keys(thinSkillMissingSectionsByPath).length > 0 ? { thinMissingSections: thinSkillMissingSectionsByPath } : {}),
    },
    {
      area: 'soul',
      status: !soul.present ? 'missing' : ((soul.lineCount === 0 || soul.missingSections.length > 0) ? 'thin' : 'ready'),
      summary: summarizeDocumentFoundation(soul),
      action: soulAction,
      paths: ['SOUL.md'],
    },
    {
      area: 'voice',
      status: !voice.present ? 'missing' : ((voice.lineCount === 0 || voice.missingSections.length > 0) ? 'thin' : 'ready'),
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
  const recommendedArea = queue[0]?.area ?? null;
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
}

export interface CoreDocumentFoundationSummary {
  present: boolean;
  path: string;
  lineCount: number;
  excerpt: string | null;
  structured: boolean;
  readySectionCount: number;
  totalSectionCount: number;
  missingSections: string[];
}

function hasStructuredHeading(document: string | null | undefined, headings: string[]): boolean {
  if (!isNonEmptyString(document)) {
    return false;
  }

  const normalizedHeadings = headings.map((heading) => heading.toLowerCase());
  return document
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .some((line) => line.startsWith('## ') && normalizedHeadings.includes(line.slice(3).trim()));
}

function buildSoulDocumentSummary(document: string | null | undefined): CoreDocumentFoundationSummary {
  const profile = SoulProfile.fromDocument(document ?? '');
  const present = isNonEmptyString(document);
  const structured = hasStructuredHeading(document, ['core truths', 'core values', 'boundaries', 'vibe', 'continuity', 'decision rules']);
  const missingSections = structured
    ? [
      profile.coreTruths.length > 0 ? null : 'core-truths',
      profile.boundaries.length > 0 ? null : 'boundaries',
      profile.continuity.length > 0 ? null : 'continuity',
    ].filter((value): value is string => typeof value === 'string')
    : [];

  const lineCount = countContentLines(document);
  const readySectionCount = !present || lineCount === 0
    ? 0
    : (structured ? 3 - missingSections.length : 3);

  return {
    present,
    path: 'SOUL.md',
    lineCount,
    excerpt: extractExcerpt(document),
    structured,
    readySectionCount,
    totalSectionCount: 3,
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
    'current default for manskill',
  ]);
  const missingSections = structured
    ? [
      isNonEmptyString(profile.tone) ? null : 'tone',
      profile.signatures.length > 0 ? null : 'signature-moves',
      profile.constraints.length > 0 ? null : 'avoid',
      profile.languageHints.length > 0 ? null : 'language-hints',
    ].filter((value): value is string => typeof value === 'string')
    : [];

  const lineCount = countContentLines(document);
  const readySectionCount = !present || lineCount === 0
    ? 0
    : (structured ? 4 - missingSections.length : 4);

  return {
    present,
    path: 'voice/README.md',
    lineCount,
    excerpt: extractExcerpt(document),
    structured,
    readySectionCount,
    totalSectionCount: 4,
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
  thinMissingSections?: Record<string, string[]>;
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
    documented?: string[];
    undocumented?: string[];
    thin?: string[];
    documentedExcerpts?: Record<string, string | null>;
    thinMissingSections?: Record<string, string[] | null | undefined>;
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
    hasRootDocument: isNonEmptyString(skillInventory?.root),
    rootPath: 'skills/README.md',
    rootExcerpt: extractExcerpt(skillInventory?.root),
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
    } : {}),
  };
  const soul = buildSoulDocumentSummary(soulDocument);
  const voice = buildVoiceDocumentSummary(voiceDocument);

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
      memoryEmptyBuckets: memory.emptyBuckets,
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

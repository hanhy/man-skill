import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentProfile } from './core/agent-profile.ts';
import { MemoryStore } from './core/memory-store.ts';
import { SkillRegistry } from './core/skill-registry.ts';
import { SoulProfile } from './core/soul-profile.ts';
import { VoiceProfile } from './core/voice-profile.ts';
import { ChannelRegistry } from './core/channel-registry.ts';
import { ModelRegistry } from './core/model-registry.ts';
import { FileSystemLoader } from './core/fs-loader.js';
import { buildFoundationRollup } from './core/foundation-rollup.js';
import { buildFoundationDraftPaths, collectFoundationDraftPaths, normalizeDraftPath } from './core/foundation-draft-paths.ts';
import { buildCoreFoundationSummary } from './core/foundation-core.ts';
import { buildCoreFoundationCommand } from './core/foundation-core-commands.ts';
import { buildIngestionSummary } from './core/ingestion-summary.js';
import { CHANNEL_ROLLOUT_ORDER, PROVIDER_ROLLOUT_ORDER, buildDeliverySummary, buildPopulateEnvCommand, orderStringsByPreferredSequence } from './core/delivery-summary.ts';
import { collectVisibleDocumentLines } from './core/document-excerpt.ts';
import { PromptAssembler, buildProfileSnapshotSummaries } from './core/prompt-assembler.ts';
import { MaterialIngestion } from './core/material-ingestion.js';
import { ManifestLoader } from './core/manifest-loader.ts';
import { buildProfileLabel as formatProfileLabel } from './core/profile-label.js';
import { WorkLoop, type WorkPriority } from './runtime/work-loop.ts';

type OptionValue = string | boolean | undefined;
type ParsedOptions = Record<string, OptionValue>;

export interface ParsedArgs {
  command?: string;
  subcommand?: string;
  options: ParsedOptions;
}

interface DraftRefreshResult {
  memoryDraftPath?: string | null;
  voiceDraftPath?: string | null;
  soulDraftPath?: string | null;
  skillsDraftPath?: string | null;
  [key: string]: unknown;
}

type SampleManifestSummary = {
  status: 'loaded' | 'missing' | 'invalid';
  entryCount: number;
  profileIds: string[];
  profileLabels: string[];
  materialTypes: Record<string, number>;
  textFilePersonIds: Record<string, string>;
  inlineEntries: Array<{
    type: 'message' | 'talk';
    text: string;
    personId: string;
  }>;
  fileEntries: Array<{
    type: 'text' | 'screenshot';
    filePath: string;
    personId: string;
  }>;
  filePaths: string[];
  error: string | null;
}

interface SampleTextSummary {
  path: string | null;
  present: boolean;
}

const DEFAULT_WORK_LOOP_OBJECTIVES = [
  'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
  'improve the user-facing ingestion/update entrance for target-person materials',
  'add chat channels Feishu, Telegram, WhatsApp, and Slack',
  'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
  'report progress in small verified increments',
] as const;

type QueueLike = {
  id?: string | null;
  status?: string;
  setupHint?: string | null;
  nextStep?: string | null;
  implementationPath?: string | null;
  implementationPresent?: boolean;
  implementationReady?: boolean;
  implementationStatus?: 'missing' | 'scaffold' | 'ready';
  implementationScaffoldPath?: string | null;
  manifestPath?: string | null;
  manifestPresent?: boolean;
  manifestScaffoldPath?: string | null;
  missingEnvVars?: string[];
};

type DeliveryRecordLike = {
  id?: string | null;
  status?: string;
  nextStep?: string | null;
};

type DeliverySummaryLike<TRecord extends DeliveryRecordLike> = {
  activeCount?: number;
  plannedCount?: number;
  candidateCount?: number;
  channels?: TRecord[];
  providers?: TRecord[];
};

type DeliveryCollectionKey = 'channels' | 'providers';

function readFileIfPresent(filePath: string): string | null {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  } catch {
    return null;
  }
}

function stripLeadingUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function parseMarkdownHeadingAt(lines: string[], index: number): { level: number; text: string; lineCount: number } | null {
  const currentLine = (lines[index] ?? '').replace(/^\uFEFF/, '');
  const trimmedLine = currentLine.trim();
  if (!trimmedLine) {
    return null;
  }

  const atxMatch = trimmedLine.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
  if (atxMatch) {
    const text = atxMatch[2]?.trim().toLowerCase();
    return text
      ? {
        level: atxMatch[1].length,
        text,
        lineCount: 1,
      }
      : null;
  }

  const nextLine = (lines[index + 1] ?? '').trim();
  const setextMatch = nextLine.match(/^(=+|-+)$/);
  if (!setextMatch || trimmedLine.startsWith('#')) {
    return null;
  }

  return {
    level: setextMatch[1].startsWith('=') ? 1 : 2,
    text: trimmedLine.toLowerCase(),
    lineCount: 2,
  };
}

function findWorkLoopObjectivesHeading(lines: string[]): { index: number; lineCount: number; level: number } | null {
  for (let index = 0; index < lines.length; index += 1) {
    const heading = parseMarkdownHeadingAt(lines, index);
    if (heading && heading.level >= 1 && heading.text === 'current product direction') {
      return {
        index,
        lineCount: heading.lineCount,
        level: heading.level,
      };
    }
  }

  return null;
}

function parseWorkLoopObjectiveLine(line: string): { objective: string; indent: number } | null {
  const normalizedLine = line.replace(/^\uFEFF/, '');
  const trimmedLine = normalizedLine.trim();
  if (trimmedLine.length === 0) {
    return null;
  }

  const indent = normalizedLine.match(/^(\s*)/)?.[1].length ?? 0;

  const numberedMatch = trimmedLine.match(/^\d+[.)]\s+(?:\[(?: |x|X)\]\s+)?(.+)$/);
  if (numberedMatch?.[1]) {
    return {
      objective: numberedMatch[1].trim(),
      indent,
    };
  }

  const taskListMatch = trimmedLine.match(/^[-*+]\s+\[(?: |x|X)\]\s+(.+)$/);
  if (taskListMatch?.[1]) {
    return {
      objective: taskListMatch[1].trim(),
      indent,
    };
  }

  const plainBulletMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
  if (plainBulletMatch?.[1]) {
    return {
      objective: plainBulletMatch[1].trim(),
      indent,
    };
  }

  return null;
}

function extractWorkLoopObjectivesFromUserDocument(document: string | null | undefined): string[] {
  if (typeof document !== 'string' || document.trim().length === 0) {
    return [];
  }

  const lines = collectVisibleDocumentLines(document);
  const heading = findWorkLoopObjectivesHeading(lines);
  if (!heading) {
    return [];
  }

  const objectives: string[] = [];
  let objectiveIndent: number | null = null;
  for (let index = heading.index + heading.lineCount; index < lines.length; index += 1) {
    const nextHeading = parseMarkdownHeadingAt(lines, index);
    if (nextHeading && nextHeading.level <= heading.level) {
      break;
    }

    const currentLine = lines[index] ?? '';
    const parsedObjective = parseWorkLoopObjectiveLine(currentLine);
    if (!parsedObjective) {
      const trimmedLine = currentLine.trim();
      const continuationIndent = currentLine.match(/^(\s*)/)?.[1].length ?? 0;
      const looksLikeNestedListDetail = /^[-*+]\s+/.test(trimmedLine);
      if (
        trimmedLine.length > 0
        && objectives.length > 0
        && objectiveIndent !== null
        && !nextHeading
        && continuationIndent > objectiveIndent
        && !looksLikeNestedListDetail
      ) {
        objectives[objectives.length - 1] = `${objectives[objectives.length - 1]} ${trimmedLine}`;
      }
      continue;
    }

    if (objectiveIndent === null) {
      objectiveIndent = parsedObjective.indent;
    }

    if (parsedObjective.indent > objectiveIndent) {
      continue;
    }

    objectiveIndent = parsedObjective.indent;
    objectives.push(parsedObjective.objective);
  }

  return objectives;
}

function loadWorkLoopObjectives(rootDir: string): string[] {
  const userDocument = readFileIfPresent(path.join(rootDir, 'USER.md'));
  const configuredObjectives = extractWorkLoopObjectivesFromUserDocument(userDocument);

  if (configuredObjectives.length === 0) {
    return [...DEFAULT_WORK_LOOP_OBJECTIVES];
  }

  const progressObjective = DEFAULT_WORK_LOOP_OBJECTIVES[DEFAULT_WORK_LOOP_OBJECTIVES.length - 1];
  return configuredObjectives.includes(progressObjective)
    ? configuredObjectives
    : [...configuredObjectives, progressObjective];
}

function collectObjectiveDeliveryPriorityIds(objectives: string[], supportedIds: readonly string[]): string[] {
  const normalizedSupportedIds = orderStringsByPreferredSequence(supportedIds as unknown as string[], supportedIds);
  const collectedIds: string[] = [];

  objectives.forEach((objective) => {
    const normalizedObjective = objective.toLowerCase();
    const cueMatches = [
      { cue: 'before', index: normalizedObjective.indexOf(' before ') },
      { cue: 'after', index: normalizedObjective.indexOf(' after ') },
      { cue: 'until', index: normalizedObjective.indexOf(' until ') },
    ].filter((match) => match.index >= 0);
    const firstCue = cueMatches.sort((left, right) => left.index - right.index)[0] ?? null;
    const mentionedIds = normalizedSupportedIds
      .map((id) => ({ id, index: normalizedObjective.indexOf(id.toLowerCase()) }))
      .filter((match) => match.index >= 0)
      .sort((left, right) => left.index - right.index);

    if (mentionedIds.length === 0) {
      return;
    }

    if (firstCue) {
      const idsBeforeCue = mentionedIds.filter((match) => match.index < firstCue.index).map((match) => match.id);
      const idsAfterCue = mentionedIds.filter((match) => match.index > firstCue.index).map((match) => match.id);

      if (firstCue.cue === 'before') {
        if (idsBeforeCue.length > 0) {
          collectedIds.push(...idsBeforeCue);
        }
        return;
      }

      if (idsAfterCue.length > 0) {
        collectedIds.push(...idsAfterCue);
      }
      return;
    }

    if (mentionedIds.length > 1 && /\b(?:prioriti(?:ze|s(?:e)?)|focus|ship|stage|validate|deliver)\b/u.test(normalizedObjective)) {
      collectedIds.push(...mentionedIds.map((match) => match.id));
      return;
    }

    if (mentionedIds.length === 1) {
      collectedIds.push(mentionedIds[0].id);
    }
  });

  return orderStringsByPreferredSequence(collectedIds, collectedIds);
}

function deriveDeliveryRolloutOrder(objectives: string[], defaultOrder: readonly string[]): string[] {
  const prioritizedIds = collectObjectiveDeliveryPriorityIds(objectives, defaultOrder);
  return orderStringsByPreferredSequence(defaultOrder as unknown as string[], prioritizedIds);
}

function promoteRuntimeReadyStatus(status?: string | null, implementationReady?: boolean): string {
  if (status === 'planned' && implementationReady) {
    return 'candidate';
  }

  return status ?? 'unknown';
}

function applyRuntimeReadyStatuses<
  TRecord extends DeliveryRecordLike,
  TSummary extends DeliverySummaryLike<TRecord>,
>(
  summary: TSummary,
  queue: QueueLike[] = [],
  collectionKey: DeliveryCollectionKey,
  preferredOrder: readonly string[] = [],
): TSummary {
  const records = Array.isArray(summary?.[collectionKey]) ? summary[collectionKey] as TRecord[] : [];
  const queueById = new Map(
    queue
      .filter((item): item is QueueLike & { id: string } => typeof item?.id === 'string' && item.id.length > 0)
      .map((item) => [item.id, item]),
  );
  const orderIndex = new Map(preferredOrder.map((id, index) => [id, index]));
  const promotedRecords = records.map((record, index) => {
    const queuedRecord = queueById.get(record.id ?? '');
    return {
      ...record,
      status: queuedRecord ? promoteRuntimeReadyStatus(queuedRecord.status, queuedRecord.implementationReady) : (record.status ?? 'unknown'),
      nextStep: queuedRecord?.implementationReady ? null : (record.nextStep ?? null),
      __originalIndex: index,
    };
  }).sort((left, right) => {
    const leftOrder = orderIndex.get(left.id ?? '') ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderIndex.get(right.id ?? '') ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.__originalIndex - right.__originalIndex;
  }).map(({ __originalIndex, ...record }) => record as TRecord);
  const activeCount = promotedRecords.filter((record) => record.status === 'active').length;
  const plannedCount = promotedRecords.filter((record) => record.status === 'planned').length;
  const candidateCount = promotedRecords.filter((record) => record.status === 'candidate').length;

  return {
    ...summary,
    [collectionKey]: promotedRecords,
    activeCount,
    plannedCount,
    candidateCount,
  };
}

type ProfileSummaryLike = {
  id?: string;
  foundationDrafts?: Record<string, string> | null;
  foundationDraftStatus?: {
    missingDrafts?: string[];
    refreshReasons?: string[];
  } | null;
};

function slugifyPersonId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSampleProfileLabel(personId: string, displayName?: string | null) {
  return formatProfileLabel(personId, displayName);
}

function readSampleManifestSummary(rootDir: string, relativePath: string | null): SampleManifestSummary {
  if (!relativePath) {
    return {
      status: 'missing',
      entryCount: 0,
      profileIds: [],
      profileLabels: [],
      materialTypes: {},
      textFilePersonIds: {},
      inlineEntries: [],
      fileEntries: [],
      filePaths: [],
      error: null,
    };
  }

  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      status: 'missing',
      entryCount: 0,
      profileIds: [],
      profileLabels: [],
      materialTypes: {},
      textFilePersonIds: {},
      inlineEntries: [],
      fileEntries: [],
      filePaths: [],
      error: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripLeadingUtf8Bom(fs.readFileSync(absolutePath, 'utf8')));
  } catch (error) {
    return {
      status: 'invalid',
      entryCount: 0,
      profileIds: [],
      profileLabels: [],
      materialTypes: {},
      textFilePersonIds: {},
      inlineEntries: [],
      fileEntries: [],
      filePaths: [],
      error: error instanceof Error ? error.message : 'Unable to parse sample manifest',
    };
  }

  try {
    const profileIds = new Set<string>();
    const declaredProfileIds = new Set<string>();
    const materialTypes: Record<string, number> = {};
    const textFilePersonIds: Record<string, string> = {};
    const inlineEntries: Array<{ type: 'message' | 'talk'; text: string; personId: string }> = [];
    const fileEntries: Array<{ type: 'text' | 'screenshot'; filePath: string; personId: string }> = [];
    const filePaths: string[] = [];
    const profileDisplayNames = new Map<string, string>();
    const pushUniqueFilePath = (value: string) => {
      if (!filePaths.includes(value)) {
        filePaths.push(value);
      }
    };
    const supportedEntryTypes = new Set(['text', 'message', 'talk', 'screenshot']);
    const realRootDir = fs.realpathSync(rootDir);

    const registerPersonId = (value: unknown, displayName?: unknown) => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
      }

      const trimmedValue = value.trim();
      const normalized = slugifyPersonId(trimmedValue);
      if (!normalized) {
        return null;
      }

      profileIds.add(normalized);
      const normalizedDisplayName = typeof displayName === 'string' && displayName.trim().length > 0
        ? displayName.trim()
        : (trimmedValue !== normalized ? trimmedValue : null);
      if (normalizedDisplayName && normalizedDisplayName !== normalized) {
        profileDisplayNames.set(normalized, normalizedDisplayName);
      }
      return normalized;
    };
    const registerDeclaredPersonId = (value: unknown, displayName?: unknown) => {
      const normalized = registerPersonId(value, displayName);
      if (normalized) {
        declaredProfileIds.add(normalized);
      }
      return normalized;
    };

    const manifest = Array.isArray(parsed)
      ? { entries: parsed }
      : (parsed && typeof parsed === 'object' ? parsed as { entries?: unknown; profiles?: unknown; personId?: unknown } : null);

    if (!manifest) {
      throw new Error('Sample manifest must be an array or object');
    }

    const fallbackPersonId = registerDeclaredPersonId(
      manifest.personId,
      typeof (manifest as { displayName?: unknown }).displayName === 'string'
        ? (manifest as { displayName?: string }).displayName
        : undefined,
    );
    const manifestDir = path.dirname(absolutePath);

    if (Array.isArray(manifest.profiles)) {
      manifest.profiles.forEach((profileEntry, index) => {
        if (!profileEntry || typeof profileEntry !== 'object') {
          throw new Error(`Manifest profile ${index} must be an object`);
        }

        const profilePersonId = registerDeclaredPersonId(
          (profileEntry as { personId?: unknown }).personId,
          (profileEntry as { displayName?: unknown }).displayName,
        );
        if (!profilePersonId) {
          throw new Error(`Manifest profile ${index} is missing personId`);
        }
      });
    }

    const entries = manifest.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Manifest must contain a non-empty entries array');
    }

    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Manifest entry ${index} must be an object`);
      }

      const entryRecord = entry as { personId?: unknown; type?: unknown; file?: unknown; text?: unknown };
      const explicitPersonId = typeof entryRecord.personId === 'string' ? entryRecord.personId : null;
      const resolvedPersonId = explicitPersonId ?? fallbackPersonId;
      const normalizedPersonId = registerPersonId(resolvedPersonId);
      if (!normalizedPersonId) {
        throw new Error(`Manifest entry ${index} is missing personId`);
      }

      const normalizedExplicitPersonId = typeof explicitPersonId === 'string' && explicitPersonId.trim().length > 0
        ? slugifyPersonId(explicitPersonId.trim())
        : null;
      if (fallbackPersonId && normalizedExplicitPersonId && normalizedExplicitPersonId !== fallbackPersonId) {
        throw new Error(`Manifest entry ${index} targets a different profile than manifest.personId: expected ${fallbackPersonId}`);
      }

      if (declaredProfileIds.size > 0 && !declaredProfileIds.has(normalizedPersonId)) {
        throw new Error(`Manifest entry ${index} targets undeclared profile: ${normalizedPersonId}`);
      }

      if (typeof entryRecord.type !== 'string' || !supportedEntryTypes.has(entryRecord.type)) {
        throw new Error(`Unsupported manifest entry type at index ${index}: ${entryRecord.type}`);
      }

      if (entryRecord.type === 'message' || entryRecord.type === 'talk') {
        if (typeof entryRecord.text !== 'string' || entryRecord.text.trim().length === 0) {
          throw new Error(`Manifest entry ${index} is missing text for ${entryRecord.type} import`);
        }

        inlineEntries.push({
          type: entryRecord.type,
          text: entryRecord.text.trim(),
          personId: normalizedPersonId,
        });
      }

      if (entryRecord.type === 'text' || entryRecord.type === 'screenshot') {
        if (typeof entryRecord.file !== 'string' || entryRecord.file.trim().length === 0) {
          throw new Error(`Manifest entry ${index} is missing file for ${entryRecord.type} import`);
        }

        const resolvedFilePath = path.resolve(manifestDir, entryRecord.file);
        if (!fs.existsSync(resolvedFilePath)) {
          throw new Error(`Manifest entry ${index} references a missing file: ${entryRecord.file}`);
        }

        const realFilePath = fs.realpathSync(resolvedFilePath);
        const fileStats = fs.statSync(realFilePath);
        if (!fileStats.isFile()) {
          throw new Error(`Manifest entry ${index} references a non-file path: ${entryRecord.file}`);
        }

        const relativeFilePath = path.relative(realRootDir, realFilePath);
        if (path.isAbsolute(relativeFilePath) || relativeFilePath.startsWith('..')) {
          throw new Error(`Manifest entry ${index} references a file outside the repo: ${entryRecord.file}`);
        }

        const normalizedRelativeFilePath = relativeFilePath.split(path.sep).join('/');
        pushUniqueFilePath(normalizedRelativeFilePath);

        if (entryRecord.type === 'text') {
          textFilePersonIds[normalizedRelativeFilePath] = normalizedPersonId;
        }

        fileEntries.push({
          type: entryRecord.type,
          filePath: normalizedRelativeFilePath,
          personId: normalizedPersonId,
        });
      }

      materialTypes[entryRecord.type] = (materialTypes[entryRecord.type] ?? 0) + 1;
    });

    const sortedProfileIds = [...profileIds].sort();

    return {
      status: 'loaded',
      entryCount: entries.length,
      profileIds: sortedProfileIds,
      profileLabels: sortedProfileIds.map((personId) => buildSampleProfileLabel(personId, profileDisplayNames.get(personId))),
      materialTypes: Object.fromEntries(Object.entries(materialTypes).sort(([left], [right]) => left.localeCompare(right))),
      textFilePersonIds,
      inlineEntries: inlineEntries.slice().sort((left, right) => {
        const typeRank = (value: 'message' | 'talk') => (value === 'message' ? 0 : 1);
        const typeDelta = typeRank(left.type) - typeRank(right.type);
        if (typeDelta !== 0) {
          return typeDelta;
        }

        const textDelta = left.text.localeCompare(right.text);
        if (textDelta !== 0) {
          return textDelta;
        }

        return left.personId.localeCompare(right.personId);
      }),
      fileEntries: fileEntries.slice().sort((left, right) => {
        const typeRank = (value: 'text' | 'screenshot') => (value === 'text' ? 0 : 1);
        const typeDelta = typeRank(left.type) - typeRank(right.type);
        if (typeDelta !== 0) {
          return typeDelta;
        }

        const pathDelta = left.filePath.localeCompare(right.filePath);
        if (pathDelta !== 0) {
          return pathDelta;
        }

        return left.personId.localeCompare(right.personId);
      }),
      filePaths: filePaths.slice(),
      error: null,
    };
  } catch (error) {
    return {
      status: 'invalid',
      entryCount: 0,
      profileIds: [],
      profileLabels: [],
      materialTypes: {},
      textFilePersonIds: {},
      inlineEntries: [],
      fileEntries: [],
      filePaths: [],
      error: error instanceof Error ? error.message : 'Unable to validate sample manifest',
    };
  }
}

function readSampleTextSummary(rootDir: string, relativePath: string | null): SampleTextSummary {
  if (!relativePath) {
    return {
      path: null,
      present: false,
    };
  }

  return {
    path: relativePath,
    present: fs.existsSync(path.join(rootDir, relativePath)),
  };
}

function listRelativeFiles(dirPath: string, extension: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith(extension))
    .sort();
}

function getSkillCategory(skillId: string): string {
  const normalizedSkillId = typeof skillId === 'string' ? skillId.trim() : '';
  if (!normalizedSkillId) {
    return 'root';
  }

  const [category] = normalizedSkillId.split('/');
  return normalizedSkillId.includes('/') && category ? category : 'root';
}

function compareSkillCategory(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  if (left === 'root') {
    return 1;
  }

  if (right === 'root') {
    return -1;
  }

  return left.localeCompare(right);
}

function buildSkillCategoryCounts(skillNames: string[]): Record<string, number> {
  const unsortedCounts = skillNames.reduce<Record<string, number>>((counts, skillName) => {
    const skillCategory = getSkillCategory(skillName);
    counts[skillCategory] = (counts[skillCategory] ?? 0) + 1;
    return counts;
  }, {});

  return Object.fromEntries(
    Object.entries(unsortedCounts).sort(([left], [right]) => compareSkillCategory(left, right)),
  );
}

function hasGroupedSkillCategories(skillIds: string[]): boolean {
  return skillIds.some((skillId) => typeof skillId === 'string' && skillId.includes('/'));
}

function detectSampleManifestRelativePath(rootDir: string): string | null {
  const sampleDir = path.join(rootDir, 'samples');
  const canonicalRelativePath = 'samples/harry-materials.json';
  const canonicalPath = path.join(rootDir, canonicalRelativePath);
  if (fs.existsSync(canonicalPath)) {
    const canonicalSummary = readSampleManifestSummary(rootDir, canonicalRelativePath);
    if (canonicalSummary.status === 'loaded') {
      return canonicalRelativePath;
    }
  }

  const candidates = listRelativeFiles(sampleDir, '.json');
  for (const fileName of candidates) {
    const relativePath = ['samples', fileName].join('/');
    if (relativePath === canonicalRelativePath) {
      continue;
    }

    const summary = readSampleManifestSummary(rootDir, relativePath);
    if (summary.status === 'loaded') {
      return relativePath;
    }
  }

  return fs.existsSync(canonicalPath) ? canonicalRelativePath : null;
}

function detectSampleTextRelativePath(rootDir: string, sampleManifest: SampleManifestSummary): string | null {
  const canonicalRelativePath = 'samples/harry-post.txt';
  const canonicalPath = path.join(rootDir, canonicalRelativePath);
  if (fs.existsSync(canonicalPath) && sampleManifest?.textFilePersonIds?.[canonicalRelativePath]) {
    return canonicalRelativePath;
  }

  const candidatePaths = Object.keys(sampleManifest?.textFilePersonIds ?? {}).sort();
  for (const relativePath of candidatePaths) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      return relativePath;
    }
  }

  return fs.existsSync(canonicalPath) ? canonicalRelativePath : null;
}


function buildFoundationRefreshLabel(
  reasonsSource: { refreshReasons?: string[]; candidateSignalSummary?: string | null } | null,
  label: string | null = null,
): string | null {
  const normalizedLabel = typeof label === 'string' && label.length > 0 ? label : null;
  if (!normalizedLabel) {
    return null;
  }

  const reasons = Array.isArray(reasonsSource?.refreshReasons)
    ? reasonsSource.refreshReasons.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const refreshLabel = `refresh ${normalizedLabel}`;
  const candidateSignalSummary = typeof reasonsSource?.candidateSignalSummary === 'string' && reasonsSource.candidateSignalSummary.length > 0
    ? reasonsSource.candidateSignalSummary
    : null;

  return `${reasons.length > 0
    ? `${refreshLabel} — reasons ${reasons.join(' + ')}`
    : refreshLabel}${candidateSignalSummary ? `; evidence ${candidateSignalSummary}` : ''}`;
}

function buildFoundationPriority(foundation: any, coreFoundation: any, profiles: ProfileSummaryLike[] = []): WorkPriority {
  const maintenance = foundation?.maintenance ?? {};
  const coreMaintenance = coreFoundation?.maintenance ?? {};
  const coreOverview = coreFoundation?.overview ?? {};
  const queuedProfile = Array.isArray(maintenance.queuedProfiles) ? maintenance.queuedProfiles[0] : null;
  const recommendedProfileId = typeof maintenance?.recommendedProfileId === 'string' && maintenance.recommendedProfileId.length > 0
    ? maintenance.recommendedProfileId
    : null;
  const recommendedProfile = recommendedProfileId
    ? (Array.isArray(maintenance.queuedProfiles)
      ? maintenance.queuedProfiles.find((profile: any) => profile?.id === recommendedProfileId) ?? queuedProfile
      : queuedProfile)
    : queuedProfile;
  const queuedAreas = Array.isArray(coreMaintenance.queuedAreas) ? coreMaintenance.queuedAreas : [];
  const queuedArea = queuedAreas[0] ?? null;
  const queuedAreaCommand = queuedArea?.command ?? buildCoreFoundationCommand(queuedArea);
  const recommendedCoreAction = typeof coreMaintenance?.recommendedAction === 'string' && coreMaintenance.recommendedAction.length > 0
    ? coreMaintenance.recommendedAction
    : null;
  const recommendedCoreCommand = typeof coreMaintenance?.recommendedCommand === 'string' && coreMaintenance.recommendedCommand.length > 0
    ? coreMaintenance.recommendedCommand
    : null;
  const recommendedCorePaths = Array.isArray(coreMaintenance?.recommendedPaths)
    ? coreMaintenance.recommendedPaths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const recommendedProfileAction = typeof maintenance?.recommendedAction === 'string' && maintenance.recommendedAction.length > 0
    ? maintenance.recommendedAction
    : null;
  const recommendedProfileCommand = typeof maintenance?.recommendedCommand === 'string' && maintenance.recommendedCommand.length > 0
    ? maintenance.recommendedCommand
    : null;
  const recommendedProfilePaths = Array.isArray(maintenance?.recommendedPaths)
    ? maintenance.recommendedPaths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const queuedProfileSummary = recommendedProfile?.id
    ? profiles.find((profile) => profile?.id === recommendedProfile.id) ?? null
    : null;
  const refreshProfileCount = maintenance.refreshProfileCount ?? 0;
  const incompleteProfileCount = maintenance.incompleteProfileCount ?? 0;
  const thinAreaCount = coreMaintenance.thinAreaCount ?? 0;
  const missingAreaCount = coreMaintenance.missingAreaCount ?? 0;
  const status: WorkPriority['status'] = refreshProfileCount > 0 || incompleteProfileCount > 0 || thinAreaCount > 0 || missingAreaCount > 0
    ? 'queued'
    : 'ready';

  const useBulkRefreshCommand = refreshProfileCount > 1
    && (typeof maintenance?.refreshBundleCommand === 'string' && maintenance.refreshBundleCommand.length > 0
      || typeof maintenance?.staleRefreshCommand === 'string' && maintenance.staleRefreshCommand.length > 0);
  const queuedProfileReasons = Array.isArray(recommendedProfile?.refreshReasons)
    ? recommendedProfile.refreshReasons.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const queuedProfileLabel = recommendedProfile?.label ?? recommendedProfile?.id ?? null;
  const queuedProfileCandidateSignalSummary = typeof recommendedProfile?.candidateSignalSummary === 'string' && recommendedProfile.candidateSignalSummary.length > 0
    ? recommendedProfile.candidateSignalSummary
    : null;
  const bulkRefreshLabel = queuedProfileLabel
    ? `refresh stale or incomplete target profiles — starting with ${queuedProfileLabel}${queuedProfileReasons.length > 0 ? ` (${queuedProfileReasons.join(' + ')})` : ''}${queuedProfileCandidateSignalSummary ? `; evidence ${queuedProfileCandidateSignalSummary}` : ''}`
    : 'refresh stale or incomplete target profiles';
  const queuedProfileSummaries = useBulkRefreshCommand
    ? (Array.isArray(maintenance.queuedProfiles)
      ? maintenance.queuedProfiles
        .map((profile: any) => profile?.id
          ? profiles.find((summary) => summary?.id === profile.id) ?? null
          : null)
        .filter((profile): profile is ProfileSummaryLike => Boolean(profile?.id))
      : [])
    : [];
  const bulkRefreshPaths = useBulkRefreshCommand
    ? collectFoundationDraftPaths(queuedProfileSummaries.map((profile) => ({
      profileId: profile.id,
      draftFiles: profile.foundationDrafts,
      missingDrafts: profile.foundationDraftStatus?.missingDrafts ?? null,
    })))
    : [];
  const bulkCoreScaffoldCommand = (() => {
    if (queuedAreas.length <= 1) {
      return null;
    }

    const scaffoldMissing = typeof coreMaintenance?.helperCommands?.scaffoldMissing === 'string' && coreMaintenance.helperCommands.scaffoldMissing.length > 0
      ? coreMaintenance.helperCommands.scaffoldMissing
      : null;
    const scaffoldThin = typeof coreMaintenance?.helperCommands?.scaffoldThin === 'string' && coreMaintenance.helperCommands.scaffoldThin.length > 0
      ? coreMaintenance.helperCommands.scaffoldThin
      : null;
    const scaffoldAll = typeof coreMaintenance?.helperCommands?.scaffoldAll === 'string' && coreMaintenance.helperCommands.scaffoldAll.length > 0
      ? coreMaintenance.helperCommands.scaffoldAll
      : null;
    const queuedStatuses = new Set(queuedAreas.map((area: any) => area?.status).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0));

    if (queuedStatuses.size === 1 && queuedStatuses.has('missing') && scaffoldMissing) {
      return scaffoldMissing;
    }

    if (queuedStatuses.size === 1 && queuedStatuses.has('thin') && scaffoldThin) {
      return scaffoldThin;
    }

    return scaffoldAll;
  })();
  const useBulkCoreScaffoldCommand = queuedAreas.length > 1 && Boolean(bulkCoreScaffoldCommand);
  const bulkCoreScaffoldPaths = useBulkCoreScaffoldCommand
    ? Array.from(new Set(
      queuedAreas.flatMap((area: any) => Array.isArray(area?.paths)
        ? area.paths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
        : []),
    ))
    : [];
  const bulkCoreScaffoldLabel = (() => {
    if (!queuedArea?.action) {
      if (missingAreaCount > 0 && thinAreaCount === 0) {
        return 'scaffold missing core foundation areas';
      }

      if (thinAreaCount > 0 && missingAreaCount === 0) {
        return 'repair thin core foundation areas';
      }

      return 'scaffold missing or thin core foundation areas';
    }

    if (missingAreaCount > 0 && thinAreaCount === 0) {
      return `scaffold missing core foundation areas — starting with ${queuedArea.action}`;
    }

    if (thinAreaCount > 0 && missingAreaCount === 0) {
      return `repair thin core foundation areas — starting with ${queuedArea.action}`;
    }

    return `scaffold missing or thin core foundation areas — starting with ${queuedArea.action}`;
  })();

  const coreQueueSummary = thinAreaCount > 0 || missingAreaCount > 0
    ? ` (${thinAreaCount} thin, ${missingAreaCount} missing)`
    : '';
  const hasQueuedCoreFoundation = queuedAreas.length > 0;
  const coreNextAction = useBulkCoreScaffoldCommand
    ? bulkCoreScaffoldLabel
    : (recommendedCoreAction ?? queuedArea?.action ?? null);
  const coreCommand = useBulkCoreScaffoldCommand
    ? bulkCoreScaffoldCommand
    : (recommendedCoreCommand ?? queuedAreaCommand);
  const corePaths: string[] = useBulkCoreScaffoldCommand
    ? bulkCoreScaffoldPaths
    : (recommendedCorePaths.length > 0
      ? recommendedCorePaths
      : (Array.isArray(queuedArea?.paths) ? queuedArea.paths.filter((value: unknown): value is string => typeof value === 'string') : []));
  const coreEditPaths: string[] = Array.from(new Set(corePaths));
  const coreEditPath: string | null = coreEditPaths[0] ?? null;
  const profileNextAction = recommendedProfile?.refreshCommand
    ? (useBulkRefreshCommand ? bulkRefreshLabel : (recommendedProfileAction ?? buildFoundationRefreshLabel(recommendedProfile, queuedProfileLabel)))
    : null;
  const profileCommand = recommendedProfile?.refreshCommand
    ? (useBulkRefreshCommand
      ? (typeof maintenance?.refreshBundleCommand === 'string' && maintenance.refreshBundleCommand.length > 0
        ? maintenance.refreshBundleCommand
        : maintenance.staleRefreshCommand)
      : (recommendedProfileCommand ?? recommendedProfile.refreshCommand))
    : null;
  const profilePaths = recommendedProfile?.refreshCommand
    ? (useBulkRefreshCommand
      ? bulkRefreshPaths
      : (recommendedProfilePaths.length > 0 ? recommendedProfilePaths : buildFoundationDraftPaths({
        profileId: queuedProfileSummary?.id ?? null,
        draftFiles: queuedProfileSummary?.foundationDrafts,
        missingDrafts: queuedProfileSummary?.foundationDraftStatus?.missingDrafts ?? null,
      })))
    : [];
  const profileEditPaths: string[] = Array.from(new Set(profilePaths));
  const profileEditPath: string | null = profileEditPaths[0] ?? null;
  const profileLatestMaterialAt = typeof recommendedProfile?.latestMaterialAt === 'string' && recommendedProfile.latestMaterialAt.length > 0
    ? recommendedProfile.latestMaterialAt
    : null;
  const profileLatestMaterialId = typeof recommendedProfile?.latestMaterialId === 'string' && recommendedProfile.latestMaterialId.length > 0
    ? recommendedProfile.latestMaterialId
    : null;
  const profileLatestMaterialSourcePath = typeof recommendedProfile?.latestMaterialSourcePath === 'string' && recommendedProfile.latestMaterialSourcePath.length > 0
    ? (normalizeDraftPath(recommendedProfile.latestMaterialSourcePath) ?? null)
    : null;
  const profileRefreshReasons = Array.isArray(recommendedProfile?.refreshReasons)
    ? recommendedProfile.refreshReasons.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const profileMissingDrafts = Array.isArray(recommendedProfile?.missingDrafts)
    ? recommendedProfile.missingDrafts.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const profileCandidateSignalSummary = typeof recommendedProfile?.candidateSignalSummary === 'string' && recommendedProfile.candidateSignalSummary.length > 0
    ? recommendedProfile.candidateSignalSummary
    : null;
  const profileDraftSourcesSummary = typeof recommendedProfile?.draftSourcesSummary === 'string' && recommendedProfile.draftSourcesSummary.length > 0
    ? recommendedProfile.draftSourcesSummary
    : null;
  const profileDraftGapSummary = typeof recommendedProfile?.draftGapSummary === 'string' && recommendedProfile.draftGapSummary.length > 0
    ? recommendedProfile.draftGapSummary
    : null;
  const coreRootThinReadySections = Array.isArray(queuedArea?.rootThinReadySections)
    ? queuedArea.rootThinReadySections.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const coreRootThinMissingSections = Array.isArray(queuedArea?.rootThinMissingSections)
    ? queuedArea.rootThinMissingSections.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const coreRootThinReadySectionCount = typeof queuedArea?.rootThinReadySectionCount === 'number'
    ? queuedArea.rootThinReadySectionCount
    : (coreRootThinReadySections.length > 0 ? coreRootThinReadySections.length : null);
  const coreRootThinTotalSectionCount = typeof queuedArea?.rootThinTotalSectionCount === 'number'
    ? queuedArea.rootThinTotalSectionCount
    : ((coreRootThinReadySections.length > 0 || coreRootThinMissingSections.length > 0)
      ? coreRootThinReadySections.length + coreRootThinMissingSections.length
      : null);
  const coreRootHeadingAliases = Array.isArray(queuedArea?.rootHeadingAliases)
    ? queuedArea.rootHeadingAliases.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];

  const followUpCommand = status === 'queued' ? 'node src/index.js' : null;

  return {
    id: 'foundation',
    label: 'Foundation',
    status,
    summary: `core ${coreOverview.readyAreaCount ?? 0}/${coreOverview.totalAreaCount ?? 0} ready${coreQueueSummary}; profiles ${refreshProfileCount} queued for refresh, ${incompleteProfileCount} incomplete`,
    nextAction: hasQueuedCoreFoundation ? coreNextAction : profileNextAction,
    command: hasQueuedCoreFoundation ? coreCommand : profileCommand,
    latestMaterialAt: hasQueuedCoreFoundation ? null : profileLatestMaterialAt,
    latestMaterialId: hasQueuedCoreFoundation ? null : profileLatestMaterialId,
    latestMaterialSourcePath: hasQueuedCoreFoundation ? null : profileLatestMaterialSourcePath,
    refreshReasons: hasQueuedCoreFoundation ? [] : profileRefreshReasons,
    missingDrafts: hasQueuedCoreFoundation ? [] : profileMissingDrafts,
    ...(hasQueuedCoreFoundation && coreRootThinReadySections.length > 0 ? { rootThinReadySections: coreRootThinReadySections } : {}),
    ...(hasQueuedCoreFoundation && coreRootThinMissingSections.length > 0 ? { rootThinMissingSections: coreRootThinMissingSections } : {}),
    ...(hasQueuedCoreFoundation && coreRootThinReadySectionCount !== null ? { rootThinReadySectionCount: coreRootThinReadySectionCount } : {}),
    ...(hasQueuedCoreFoundation && coreRootThinTotalSectionCount !== null ? { rootThinTotalSectionCount: coreRootThinTotalSectionCount } : {}),
    ...(hasQueuedCoreFoundation && coreRootHeadingAliases.length > 0 ? { rootHeadingAliases: coreRootHeadingAliases } : {}),
    candidateSignalSummary: hasQueuedCoreFoundation ? null : profileCandidateSignalSummary,
    draftSourcesSummary: hasQueuedCoreFoundation ? null : profileDraftSourcesSummary,
    draftGapSummary: hasQueuedCoreFoundation ? null : profileDraftGapSummary,
    editPath: hasQueuedCoreFoundation ? coreEditPath : profileEditPath,
    editPaths: hasQueuedCoreFoundation ? coreEditPaths : profileEditPaths,
    followUpCommand,
    paths: hasQueuedCoreFoundation ? corePaths : profilePaths,
  };
}

function buildSampleImportNextAction(ingestionSummary: any) {
  const sampleStarterLabel = typeof ingestionSummary?.sampleStarterLabel === 'string' && ingestionSummary.sampleStarterLabel.length > 0
    ? ingestionSummary.sampleStarterLabel
    : null;

  if (!sampleStarterLabel) {
    return 'import the checked-in sample target profile';
  }

  const sampleProfileCount = Array.isArray(ingestionSummary?.sampleManifestProfileIds)
    ? ingestionSummary.sampleManifestProfileIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0).length
    : 0;

  return sampleProfileCount > 1
    ? `import the checked-in sample target profiles for ${sampleStarterLabel}`
    : `import the checked-in sample target profile for ${sampleStarterLabel}`;
}

function collectSampleManifestPaths(ingestionSummary: any) {
  const sampleManifestPath = typeof ingestionSummary?.sampleManifestPath === 'string' && ingestionSummary.sampleManifestPath.length > 0
    ? ingestionSummary.sampleManifestPath
    : null;
  const sampleManifestFilePaths = Array.isArray(ingestionSummary?.sampleManifestFilePaths)
    ? ingestionSummary.sampleManifestFilePaths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const sampleTextPath = typeof ingestionSummary?.sampleTextPath === 'string' && ingestionSummary.sampleTextPath.length > 0
    ? ingestionSummary.sampleTextPath
    : null;

  return Array.from(new Set([
    sampleManifestPath,
    ...sampleManifestFilePaths,
    sampleTextPath,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)));
}

function stripEnvInlineComment(value: string) {
  let result = '';
  let quote: 'single' | 'double' | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "'" && quote !== 'double') {
      quote = quote === 'single' ? null : 'single';
      result += character;
      continue;
    }

    if (character === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double';
      result += character;
      continue;
    }

    if (character === '#' && quote === null) {
      const previousCharacter = result[result.length - 1] ?? '';
      if (result.trim().length === 0 || /\s/.test(previousCharacter)) {
        break;
      }
    }

    result += character;
  }

  return result.trimEnd();
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readEnvFileValues(envFileAbsolutePath: string): NodeJS.ProcessEnv {
  if (!fs.existsSync(envFileAbsolutePath)) {
    return {};
  }

  return fs.readFileSync(envFileAbsolutePath, 'utf8')
    .split(/\r?\n/)
    .reduce<NodeJS.ProcessEnv>((environment, rawLine) => {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith('#')) {
        return environment;
      }

      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) {
        return environment;
      }

      const [, envVar, rawValue] = match;
      environment[envVar] = stripWrappingQuotes(stripEnvInlineComment(rawValue));
      return environment;
    }, {});
}

function mergeDeliveryEnvironment(repoEnv: NodeJS.ProcessEnv, runtimeEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const mergedEnvironment: NodeJS.ProcessEnv = { ...repoEnv };

  Object.entries(runtimeEnv).forEach(([key, value]) => {
    if (typeof value === 'string') {
      mergedEnvironment[key] = value;
    }
  });

  return mergedEnvironment;
}

function readEnvTemplateVarNames(envTemplateAbsolutePath: string): string[] {
  if (!fs.existsSync(envTemplateAbsolutePath)) {
    return [];
  }

  return Array.from(new Set(
    fs.readFileSync(envTemplateAbsolutePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1] ?? null)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  ));
}

function buildIngestionPriority(ingestionSummary: any, _rootDir: string, _profiles: ProfileSummaryLike[] = []): WorkPriority {
  const importedProfileCount = ingestionSummary?.importedProfileCount ?? 0;
  const metadataOnlyProfileCount = ingestionSummary?.metadataOnlyProfileCount ?? 0;
  const intakeStaleProfileCount = ingestionSummary?.intakeStaleProfileCount ?? 0;
  const refreshProfileCount = ingestionSummary?.refreshProfileCount ?? 0;
  const incompleteProfileCount = ingestionSummary?.incompleteProfileCount ?? 0;
  const importedStarterIntakeProfileCount = ingestionSummary?.importedStarterIntakeProfileCount ?? 0;
  const importedIntakeReadyProfileCount = ingestionSummary?.importedIntakeReadyProfileCount ?? 0;
  const importedIntakeBackfillProfileCount = ingestionSummary?.importedIntakeBackfillProfileCount ?? 0;
  const importedInvalidIntakeManifestProfileCount = ingestionSummary?.importedInvalidIntakeManifestProfileCount ?? 0;
  const status: WorkPriority['status'] = importedProfileCount > 0
    && metadataOnlyProfileCount === 0
    && refreshProfileCount === 0
    && incompleteProfileCount === 0
    && importedIntakeBackfillProfileCount === 0
    && importedInvalidIntakeManifestProfileCount === 0
    ? 'ready'
    : 'queued';

  const recommendedAction = typeof ingestionSummary?.recommendedAction === 'string' && ingestionSummary.recommendedAction.length > 0
    ? ingestionSummary.recommendedAction
    : null;
  const recommendedLatestMaterialAt = typeof ingestionSummary?.recommendedLatestMaterialAt === 'string' && ingestionSummary.recommendedLatestMaterialAt.length > 0
    ? ingestionSummary.recommendedLatestMaterialAt
    : null;
  const recommendedLatestMaterialId = typeof ingestionSummary?.recommendedLatestMaterialId === 'string' && ingestionSummary.recommendedLatestMaterialId.length > 0
    ? ingestionSummary.recommendedLatestMaterialId
    : null;
  const recommendedLatestMaterialSourcePath = typeof ingestionSummary?.recommendedLatestMaterialSourcePath === 'string' && ingestionSummary.recommendedLatestMaterialSourcePath.length > 0
    ? (normalizeDraftPath(ingestionSummary.recommendedLatestMaterialSourcePath) ?? null)
    : null;
  const recommendedCommand = typeof ingestionSummary?.recommendedCommand === 'string' && ingestionSummary.recommendedCommand.length > 0
    ? ingestionSummary.recommendedCommand
    : null;
  const recommendedFallbackCommand = typeof ingestionSummary?.recommendedFallbackCommand === 'string' && ingestionSummary.recommendedFallbackCommand.length > 0
    ? ingestionSummary.recommendedFallbackCommand
    : null;
  const recommendedRefreshIntakeCommand = typeof ingestionSummary?.recommendedRefreshIntakeCommand === 'string' && ingestionSummary.recommendedRefreshIntakeCommand.length > 0
    ? ingestionSummary.recommendedRefreshIntakeCommand
    : null;
  const recommendedEditPath = typeof ingestionSummary?.recommendedEditPath === 'string' && ingestionSummary.recommendedEditPath.length > 0
    ? ingestionSummary.recommendedEditPath
    : null;
  const recommendedEditPaths = Array.isArray(ingestionSummary?.recommendedEditPaths)
    ? ingestionSummary.recommendedEditPaths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const recommendedInspectCommand = typeof ingestionSummary?.recommendedInspectCommand === 'string' && ingestionSummary.recommendedInspectCommand.length > 0
    ? ingestionSummary.recommendedInspectCommand
    : null;
  const recommendedManifestInspectCommand = typeof ingestionSummary?.recommendedManifestInspectCommand === 'string' && ingestionSummary.recommendedManifestInspectCommand.length > 0
    ? ingestionSummary.recommendedManifestInspectCommand
    : null;
  const recommendedManifestImportCommand = typeof ingestionSummary?.recommendedManifestImportCommand === 'string' && ingestionSummary.recommendedManifestImportCommand.length > 0
    ? ingestionSummary.recommendedManifestImportCommand
    : null;
  const recommendedIntakeManifestEntryTemplateTypes = Array.isArray(ingestionSummary?.recommendedIntakeManifestEntryTemplateTypes)
    ? ingestionSummary.recommendedIntakeManifestEntryTemplateTypes.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const recommendedIntakeManifestEntryTemplateDetails = Array.isArray(ingestionSummary?.recommendedIntakeManifestEntryTemplateDetails)
    ? ingestionSummary.recommendedIntakeManifestEntryTemplateDetails.filter((value: unknown): value is { type: string; source: 'file' | 'text'; path: string | null; preview: string | null } => Boolean(value) && typeof value === 'object' && !Array.isArray(value))
    : [];
  const recommendedIntakeManifestEntryTemplateCount = Number.isFinite(ingestionSummary?.recommendedIntakeManifestEntryTemplateCount)
    ? ingestionSummary.recommendedIntakeManifestEntryTemplateCount
    : recommendedIntakeManifestEntryTemplateTypes.length;
  const recommendedProfileSlices = Array.isArray(ingestionSummary?.recommendedProfileSlices)
    ? ingestionSummary.recommendedProfileSlices.filter((value: unknown): value is {
      personId: string | null;
      label: string | null;
      latestMaterialAt: string | null;
      latestMaterialId: string | null;
      latestMaterialSourcePath: string | null;
      fallbackCommand: string | null;
      refreshIntakeCommand: string | null;
      editPath: string | null;
      editPaths: string[];
      manifestInspectCommand: string | null;
      manifestImportCommand: string | null;
      intakeManifestEntryTemplateTypes: string[];
      intakeManifestEntryTemplateDetails: Array<{ type: string; source: 'file' | 'text'; path: string | null; preview: string | null }>;
      intakeManifestEntryTemplateCount: number;
      inspectCommand: string | null;
      followUpCommand: string | null;
      paths: string[];
    } => Boolean(value) && typeof value === 'object' && !Array.isArray(value))
    : [];
  const recommendedFollowUpCommand = typeof ingestionSummary?.recommendedFollowUpCommand === 'string' && ingestionSummary.recommendedFollowUpCommand.length > 0
    ? ingestionSummary.recommendedFollowUpCommand
    : null;
  const recommendedPaths = Array.isArray(ingestionSummary?.recommendedPaths)
    ? ingestionSummary.recommendedPaths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];

  const intakeBackfillSummary = importedIntakeBackfillProfileCount > 0
    ? `, ${importedIntakeBackfillProfileCount} intake backfill${importedIntakeBackfillProfileCount === 1 ? '' : 's'}`
    : '';
  const importedStarterIntakeSummary = importedStarterIntakeProfileCount > 0
    ? `, ${importedStarterIntakeProfileCount} imported intake starter scaffold${importedStarterIntakeProfileCount === 1 ? '' : 's'} available`
    : '';
  const importedReadyIntakeSummary = importedIntakeReadyProfileCount > 0
    ? `, ${importedIntakeReadyProfileCount} imported intake replay${importedIntakeReadyProfileCount === 1 ? ' ready' : 's ready'}`
    : '';
  const invalidMetadataOnlyIntakeSummary = (ingestionSummary?.invalidMetadataOnlyIntakeManifestProfileCount ?? 0) > 0
    ? `, ${ingestionSummary.invalidMetadataOnlyIntakeManifestProfileCount} invalid metadata-only intake manifest${ingestionSummary.invalidMetadataOnlyIntakeManifestProfileCount === 1 ? '' : 's'}`
    : '';
  const invalidImportedIntakeSummary = importedInvalidIntakeManifestProfileCount > 0
    ? `, ${importedInvalidIntakeManifestProfileCount} invalid imported intake manifest${importedInvalidIntakeManifestProfileCount === 1 ? '' : 's'}`
    : '';

  return {
    id: 'ingestion',
    label: 'Ingestion',
    status,
    summary: `${importedProfileCount} imported, ${metadataOnlyProfileCount} metadata-only, drafts ${ingestionSummary?.readyProfileCount ?? 0} ready, ${refreshProfileCount} queued for refresh${importedStarterIntakeSummary}${importedReadyIntakeSummary}${intakeBackfillSummary}${invalidMetadataOnlyIntakeSummary}${invalidImportedIntakeSummary}`,
    nextAction: recommendedAction,
    command: recommendedCommand,
    latestMaterialAt: recommendedLatestMaterialAt,
    latestMaterialId: recommendedLatestMaterialId,
    latestMaterialSourcePath: recommendedLatestMaterialSourcePath,
    fallbackCommand: recommendedFallbackCommand,
    refreshIntakeCommand: recommendedRefreshIntakeCommand,
    editPath: recommendedEditPath,
    editPaths: recommendedEditPaths,
    manifestInspectCommand: recommendedManifestInspectCommand,
    manifestImportCommand: recommendedManifestImportCommand,
    intakeManifestEntryTemplateTypes: recommendedIntakeManifestEntryTemplateTypes,
    intakeManifestEntryTemplateDetails: recommendedIntakeManifestEntryTemplateDetails,
    intakeManifestEntryTemplateCount: recommendedIntakeManifestEntryTemplateCount,
    recommendedProfileSlices,
    inspectCommand: recommendedInspectCommand,
    followUpCommand: recommendedFollowUpCommand,
    paths: recommendedPaths,
  };
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildRelativeFileTouchCommand(relativePath: string | null | undefined): string | null {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    return null;
  }

  const normalizedPath = relativePath.split(path.sep).join('/');
  const directory = path.posix.dirname(normalizedPath);
  if (!directory || directory === '.') {
    return `touch ${shellSingleQuote(normalizedPath)}`;
  }

  return `mkdir -p ${shellSingleQuote(directory)} && touch ${shellSingleQuote(normalizedPath)}`;
}

function buildDeliveryPriority({
  id,
  label,
  pendingCount,
  configuredCount,
  authBlockedCount,
  queue,
  envTemplatePath = null,
  envTemplateCommand = null,
  envTemplatePopulateCommand = null,
  envTemplateVarNames = [],
  envConfigPath = '.env',
  envConfigPresent = false,
  envConfigPopulateCommand = null,
  implementationBundleCommand = null,
}: {
  id: 'channels' | 'providers';
  label: 'Channels' | 'Providers';
  pendingCount: number;
  configuredCount: number;
  authBlockedCount?: number;
  queue: QueueLike[];
  envTemplatePath?: string | null;
  envTemplateCommand?: string | null;
  envTemplatePopulateCommand?: string | null;
  envTemplateVarNames?: string[];
  envConfigPath?: string | null;
  envConfigPresent?: boolean;
  envConfigPopulateCommand?: string | null;
  implementationBundleCommand?: string | null;
}): WorkPriority {
  const firstQueued = Array.isArray(queue) ? queue[0] : null;
  const firstMissingImplementationItem = Array.isArray(queue)
    ? queue.find((item) => item?.implementationPresent === false && typeof item?.implementationScaffoldPath === 'string' && item.implementationScaffoldPath.length > 0) ?? null
    : null;
  const firstScaffoldOnlyImplementationItem = Array.isArray(queue)
    ? queue.find((item) => item?.implementationPresent === true && item?.implementationReady === false && typeof item?.implementationScaffoldPath === 'string' && item.implementationScaffoldPath.length > 0) ?? null
    : null;
  const implementationActionItem = firstMissingImplementationItem ?? firstScaffoldOnlyImplementationItem ?? null;
  const missingImplementationPaths = Array.isArray(queue)
    ? queue
      .filter((item) => item?.implementationPresent === false)
      .map((item) => typeof item?.implementationScaffoldPath === 'string' && item.implementationScaffoldPath.length > 0
        ? item.implementationScaffoldPath
        : null)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const scaffoldOnlyImplementationPaths = Array.isArray(queue)
    ? queue
      .filter((item) => item?.implementationPresent === true && item?.implementationReady === false)
      .map((item) => typeof item?.implementationScaffoldPath === 'string' && item.implementationScaffoldPath.length > 0
        ? item.implementationScaffoldPath
        : null)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const bundledImplementationPaths = missingImplementationPaths.length > 0 ? missingImplementationPaths : scaffoldOnlyImplementationPaths;
  const manifestMissing = Boolean(firstQueued?.manifestScaffoldPath) && firstQueued?.manifestPresent === false;
  const implementationMissing = Boolean(implementationActionItem?.implementationScaffoldPath) && implementationActionItem?.implementationPresent === false;
  const implementationNeedsWork = Boolean(implementationActionItem?.implementationScaffoldPath)
    && (implementationActionItem?.implementationPresent === false || implementationActionItem?.implementationReady === false);
  const implementationScaffoldOnly = Boolean(implementationActionItem?.implementationScaffoldPath)
    && implementationActionItem?.implementationPresent === true
    && implementationActionItem?.implementationReady === false;
  const firstQueuedMissingEnvVars = Array.isArray((firstQueued as { missingEnvVars?: unknown })?.missingEnvVars)
    ? (firstQueued as { missingEnvVars: unknown[] }).missingEnvVars.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const normalizedEnvTemplateVarNames = Array.isArray(envTemplateVarNames)
    ? envTemplateVarNames.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const templateCoversLeaderCredentials = firstQueuedMissingEnvVars.length > 0
    && firstQueuedMissingEnvVars.every((envVar) => normalizedEnvTemplateVarNames.includes(envVar));
  const needsCredentialBootstrap = !envConfigPresent && templateCoversLeaderCredentials && pendingCount > configuredCount;
  const needsEnvTemplateRepair = !envConfigPresent
    && !needsCredentialBootstrap
    && firstQueuedMissingEnvVars.length > 0
    && typeof envTemplatePopulateCommand === 'string'
    && envTemplatePopulateCommand.length > 0;
  const bundledImplementationCount = bundledImplementationPaths.length;
  const normalizedAuthBlockedCount = typeof authBlockedCount === 'number'
    ? authBlockedCount
    : Array.isArray(queue)
      ? queue.filter((item) => Array.isArray(item?.missingEnvVars) && item.missingEnvVars.length > 0).length
      : Math.max(pendingCount - configuredCount, 0);
  const implementationPresentCount = Array.isArray(queue)
    ? queue.filter((item) => item?.implementationPresent === true).length
    : 0;
  const implementationReadyCount = Array.isArray(queue)
    ? queue.filter((item) => item?.implementationReady === true).length
    : 0;
  const manifestReady = Array.isArray(queue) && queue.length > 0
    ? queue.every((item) => item?.manifestPresent === true)
    : false;
  const shouldUseImplementationBundle = !(needsCredentialBootstrap && envTemplateCommand)
    && !needsEnvTemplateRepair
    && !manifestMissing
    && implementationMissing
    && bundledImplementationCount > 1
    && typeof implementationBundleCommand === 'string'
    && implementationBundleCommand.length > 0;
  const bundledImplementationBacklog = !manifestMissing && implementationNeedsWork && bundledImplementationCount > 1;
  const includeEnvTemplatePath = (needsCredentialBootstrap && typeof envTemplateCommand === 'string' && envTemplateCommand.length > 0)
    || needsEnvTemplateRepair;
  const normalizedEnvBootstrapPaths = [
    envTemplatePath,
    ...(needsCredentialBootstrap ? [envConfigPath] : []),
  ].filter((value, index, values): value is string => typeof value === 'string' && value.length > 0 && values.indexOf(value) === index);
  const envConfigPaths = [
    envConfigPath,
  ].filter((value, index, values): value is string => typeof value === 'string' && value.length > 0 && values.indexOf(value) === index);
  const paths = includeEnvTemplatePath
    ? normalizedEnvBootstrapPaths
    : [
      typeof firstQueued?.manifestPath === 'string' && firstQueued.manifestPath.length > 0 ? firstQueued.manifestPath : null,
      ...((shouldUseImplementationBundle || bundledImplementationBacklog) ? bundledImplementationPaths : []),
      ...(!(shouldUseImplementationBundle || bundledImplementationBacklog)
        && typeof implementationActionItem?.implementationScaffoldPath === 'string'
        && implementationActionItem.implementationScaffoldPath.length > 0
        ? [implementationActionItem.implementationScaffoldPath]
        : []),
    ].filter((value, index, values): value is string => typeof value === 'string' && value.length > 0 && values.indexOf(value) === index);

  const actionableNextStep = firstQueued?.implementationReady === true
    ? null
    : (firstQueued?.nextStep ? `next: ${firstQueued.nextStep}` : null);
  const followUpParts = [
    firstQueued?.setupHint,
    actionableNextStep,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  let nextAction = firstQueued ? followUpParts.join('; ') : null;
  let command = needsCredentialBootstrap && envTemplateCommand ? envTemplateCommand : null;
  let followUpCommand: string | null = null;

  if (command === envTemplateCommand && needsCredentialBootstrap) {
    const envTarget = typeof envConfigPath === 'string' && envConfigPath.length > 0 ? envConfigPath : '.env';
    const envSource = typeof envTemplatePath === 'string' && envTemplatePath.length > 0 ? envTemplatePath : '.env.example';
    nextAction = [`bootstrap ${envTarget} from ${envSource}`, ...followUpParts].filter(Boolean).join('; ');
  }

  if (!command && needsEnvTemplateRepair) {
    nextAction = [`update .env.example with missing delivery credentials`, ...followUpParts].filter(Boolean).join('; ');
    command = envTemplatePopulateCommand;
    followUpCommand = typeof envTemplateCommand === 'string' && envTemplateCommand.length > 0
      ? envTemplateCommand
      : null;
  } else if (!command && manifestMissing) {
    const manifestPath = typeof firstQueued?.manifestScaffoldPath === 'string' ? firstQueued.manifestScaffoldPath : null;
    nextAction = [`create ${manifestPath}`, ...followUpParts].filter(Boolean).join('; ');
    command = buildRelativeFileTouchCommand(manifestPath);
  } else if (!command && implementationNeedsWork) {
    const implementationPath = typeof implementationActionItem?.implementationScaffoldPath === 'string' ? implementationActionItem.implementationScaffoldPath : null;
    nextAction = implementationMissing
      ? (shouldUseImplementationBundle
        ? [`create pending ${id === 'channels' ? 'channel' : 'provider'} implementations — starting with ${implementationPath}`, ...followUpParts].filter(Boolean).join('; ')
        : [`create ${implementationPath}`, ...followUpParts].filter(Boolean).join('; '))
      : (bundledImplementationBacklog
        ? [`implement pending ${id === 'channels' ? 'channel' : 'provider'} integrations — starting with ${implementationPath}`, ...followUpParts].filter(Boolean).join('; ')
        : [`implement ${implementationPath}`, ...followUpParts].filter(Boolean).join('; '));
    command = implementationMissing
      ? (shouldUseImplementationBundle
        ? implementationBundleCommand
        : buildRelativeFileTouchCommand(implementationPath))
      : null;
  } else if (
    !command
    && envConfigPresent
    && manifestReady
    && implementationReadyCount === pendingCount
    && firstQueuedMissingEnvVars.length > 0
    && typeof envConfigPopulateCommand === 'string'
    && envConfigPopulateCommand.length > 0
  ) {
    nextAction = ['update .env with missing delivery credentials', ...followUpParts].filter(Boolean).join('; ');
    command = envConfigPopulateCommand;
  }

  const leaderAuthBlocked = pendingCount > 0
    && firstQueuedMissingEnvVars.length > 0
    && manifestReady
    && firstQueued?.implementationReady === true
    && (
      command === envTemplateCommand
      || command === envTemplatePopulateCommand
      || command === envConfigPopulateCommand
    );
  const deliveryBlocked = pendingCount > 0
    && normalizedAuthBlockedCount > 0
    && manifestReady
    && (implementationReadyCount === pendingCount || leaderAuthBlocked);

  const resolvedPaths = command && command === envConfigPopulateCommand && envConfigPaths.length > 0
    ? envConfigPaths
    : paths;
  const editPaths = Array.from(new Set(resolvedPaths));
  const editPath = command === envTemplateCommand && needsCredentialBootstrap && typeof envConfigPath === 'string' && envConfigPath.length > 0
    ? envConfigPath
    : (editPaths[0] ?? null);

  return {
    id,
    label,
    status: pendingCount === 0 ? 'ready' : (deliveryBlocked ? 'blocked' : 'queued'),
    summary: pendingCount > 0
      ? `${pendingCount} pending, ${configuredCount} configured, ${normalizedAuthBlockedCount} auth-blocked, manifest ${manifestReady ? 'ready' : 'missing'}, scaffolds ${implementationPresentCount}/${pendingCount} present, implementations ${implementationReadyCount}/${pendingCount} ready`
      : `${pendingCount} pending, ${configuredCount} configured`,
    nextAction,
    command,
    paths: resolvedPaths,
    editPath,
    editPaths,
    followUpCommand,
  };
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, subcommand, ...rest] = argv;
  const options: ParsedOptions = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = rest[index + 1];
    if (!nextToken || nextToken.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = nextToken;
    index += 1;
  }

  return { command, subcommand, options };
}

export function relativizeDraftPaths(rootDir: string, result: DraftRefreshResult): DraftRefreshResult {
  return {
    ...result,
    memoryDraftPath: typeof result.memoryDraftPath === 'string' ? path.relative(rootDir, result.memoryDraftPath) : null,
    voiceDraftPath: typeof result.voiceDraftPath === 'string' ? path.relative(rootDir, result.voiceDraftPath) : null,
    soulDraftPath: typeof result.soulDraftPath === 'string' ? path.relative(rootDir, result.soulDraftPath) : null,
    skillsDraftPath: typeof result.skillsDraftPath === 'string' ? path.relative(rootDir, result.skillsDraftPath) : null,
  };
}

function readOptionalStringOption(options: ParsedOptions, key: string): string | undefined {
  if (!(key in options)) {
    return undefined;
  }

  const value = options[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing value for --${key}`);
  }

  return value;
}

function assertExactlyOneBatchSelector(options: ParsedOptions, selectors: string[], errorMessage: string) {
  const activeSelectors = selectors.filter((selector) => {
    if (selector === 'person') {
      return typeof options.person === 'string' && options.person.trim().length > 0;
    }

    return options[selector] === true;
  });

  if (activeSelectors.length !== 1) {
    throw new Error(errorMessage);
  }
}

function assertAllowedOptions(
  options: ParsedOptions,
  allowedOptions: readonly string[],
  command: 'import' | 'update',
  subcommand: string,
) {
  const unsupportedOption = Object.keys(options).find((key) => !allowedOptions.includes(key));
  if (unsupportedOption) {
    throw new Error(`Unsupported option --${unsupportedOption} for ${command} ${subcommand}`);
  }
}

const supportedImportSubcommands = ['sample', 'intake', 'manifest', 'text', 'message', 'talk', 'screenshot'] as const;
const supportedUpdateSubcommands = ['profile', 'intake', 'foundation'] as const;

function buildCommandFamilyUsageHint(command: 'import' | 'update'): string | null {
  const familyLines = buildCliUsageLines()
    .filter((line) => line.startsWith(`  node src/index.js ${command} `))
    .map((line) => line.trim());

  if (familyLines.length === 0) {
    return null;
  }

  return ['Usage:', ...familyLines].join('\n');
}

export function runImportCommand(rootDir: string, subcommand: string | undefined, options: ParsedOptions) {
  const ingestion = new MaterialIngestion(rootDir);

  const relativizeManifestImportResult = (result: any) => {
    if (!result.foundationRefresh || typeof result.foundationRefresh !== 'object') {
      return result;
    }

    return {
      ...result,
      foundationRefresh: {
        ...result.foundationRefresh,
        results: Array.isArray((result.foundationRefresh as { results?: DraftRefreshResult[] }).results)
          ? (result.foundationRefresh as { results: DraftRefreshResult[] }).results.map((entry) => relativizeDraftPaths(rootDir, entry))
          : [],
      },
    };
  };

  const relativizeManifestImportBatchResult = (result: any) => ({
    ...result,
    ...(result?.foundationRefresh && typeof result.foundationRefresh === 'object'
      ? {
          foundationRefresh: {
            ...result.foundationRefresh,
            results: Array.isArray((result.foundationRefresh as { results?: DraftRefreshResult[] }).results)
              ? (result.foundationRefresh as { results: DraftRefreshResult[] }).results.map((entry) => relativizeDraftPaths(rootDir, entry))
              : [],
          },
        }
      : {}),
    results: Array.isArray(result?.results) ? result.results.map((entry: any) => relativizeManifestImportResult(entry)) : [],
  });

  if (!subcommand) {
    throw new Error('Missing import type');
  }

  if (!supportedImportSubcommands.includes(subcommand as (typeof supportedImportSubcommands)[number])) {
    throw new Error(`Unsupported import type: ${subcommand}`);
  }

  const allowedImportOptions: Record<(typeof supportedImportSubcommands)[number], readonly string[]> = {
    sample: ['file'],
    intake: ['person', 'stale', 'imported', 'all', 'refresh-foundation'],
    manifest: ['file', 'refresh-foundation'],
    text: ['person', 'file', 'notes', 'refresh-foundation'],
    message: ['person', 'text', 'notes', 'refresh-foundation'],
    talk: ['person', 'text', 'notes', 'refresh-foundation'],
    screenshot: ['person', 'file', 'notes', 'refresh-foundation'],
  };
  assertAllowedOptions(options, allowedImportOptions[subcommand as (typeof supportedImportSubcommands)[number]], 'import', subcommand);

  if (subcommand === 'manifest') {
    const manifestFile = readOptionalStringOption(options, 'file');
    const result = ingestion.importManifest({
      manifestFile,
      refreshFoundation: Boolean(options['refresh-foundation']),
    });

    return relativizeManifestImportResult(result);
  }

  if (subcommand === 'sample') {
    const requestedSampleManifestPath = readOptionalStringOption(options, 'file')?.trim() ?? null;
    const sampleManifestRelativePath = requestedSampleManifestPath ?? detectSampleManifestRelativePath(rootDir);
    const sampleManifest = readSampleManifestSummary(rootDir, sampleManifestRelativePath);
    if (sampleManifest.status !== 'loaded' || !sampleManifestRelativePath) {
      throw new Error(requestedSampleManifestPath
        ? `No valid sample manifest found at ${requestedSampleManifestPath}`
        : 'No valid sample manifest found under samples/');
    }

    const result = ingestion.importManifest({
      manifestFile: sampleManifestRelativePath,
      refreshFoundation: true,
    });

    return relativizeManifestImportResult(result);
  }

  if (subcommand === 'intake') {
    const refreshFoundation = Boolean(options['refresh-foundation']);
    assertExactlyOneBatchSelector(options, ['person', 'stale', 'imported', 'all'], 'import intake requires exactly one of --person, --stale, --imported, or --all');

    if (options.all) {
      return relativizeManifestImportBatchResult(ingestion.importAllProfileIntakeManifests({ refreshFoundation }));
    }

    if (options.stale) {
      return relativizeManifestImportBatchResult(ingestion.importStaleProfileIntakeManifests({ refreshFoundation }));
    }

    if (options.imported) {
      return relativizeManifestImportBatchResult(ingestion.importImportedProfileIntakeManifests({ refreshFoundation }));
    }

    const intakePersonId = typeof options.person === 'string' ? options.person : undefined;

    return relativizeManifestImportResult(ingestion.importProfileIntakeManifest({
      personId: intakePersonId,
      refreshFoundation,
    }));
  }

  const personId = typeof options.person === 'string' ? options.person : undefined;
  if (!personId) {
    throw new Error('Missing required --person argument');
  }

  if (subcommand === 'text') {
    const result = ingestion.importTextDocument({
      personId,
      sourceFile: typeof options.file === 'string' ? options.file : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'message') {
    const result = ingestion.importMessage({
      personId,
      text: typeof options.text === 'string' ? options.text : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'talk') {
    const result = ingestion.importTalkSnippet({
      personId,
      text: typeof options.text === 'string' ? options.text : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'screenshot') {
    const result = ingestion.importScreenshotSource({
      personId,
      sourceFile: typeof options.file === 'string' ? options.file : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  throw new Error(`Unsupported import type: ${subcommand}`);
}

export function runUpdateCommand(rootDir: string, subcommand: string | undefined, options: ParsedOptions) {
  const ingestion = new MaterialIngestion(rootDir);
  const personId = readOptionalStringOption(options, 'person');
  const refreshFoundation = Boolean(options['refresh-foundation']);

  if (!subcommand) {
    throw new Error('Missing update type');
  }

  if (!supportedUpdateSubcommands.includes(subcommand as (typeof supportedUpdateSubcommands)[number])) {
    throw new Error(`Unsupported update type: ${subcommand}`);
  }

  const allowedUpdateOptions: Record<(typeof supportedUpdateSubcommands)[number], readonly string[]> = {
    profile: ['person', 'display-name', 'summary', 'refresh-foundation'],
    intake: ['person', 'display-name', 'summary', 'stale', 'imported', 'all', 'refresh-foundation'],
    foundation: ['person', 'stale', 'all'],
  };
  assertAllowedOptions(options, allowedUpdateOptions[subcommand as (typeof supportedUpdateSubcommands)[number]], 'update', subcommand);

  const maybeAttachFoundationRefresh = (result: any) => {
    if (!refreshFoundation) {
      return result;
    }

    const resultEntries = Array.isArray(result?.results)
      ? result.results.filter((entry: any) => entry && typeof entry.personId === 'string')
      : (result && typeof result.personId === 'string' ? [result] : []);
    const eligiblePersonIds = [...new Set(resultEntries
      .map((entry: any) => entry.personId)
      .filter((candidate: string) => typeof candidate === 'string' && candidate.length > 0)
      .filter((candidate: string) => ingestion.loadMaterialRecords(candidate).length > 0))];

    if (eligiblePersonIds.length === 0) {
      return {
        ...result,
        foundationRefresh: {
          profileCount: 0,
          results: [],
        },
      };
    }

    return {
      ...result,
      foundationRefresh: {
        profileCount: eligiblePersonIds.length,
        results: eligiblePersonIds.map((candidate: string) => relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId: candidate }))),
      },
    };
  };

  if (subcommand === 'profile') {
    if (!personId) {
      throw new Error('Missing required --person argument');
    }

    const result = ingestion.updateProfile({
      personId,
      displayName: typeof options['display-name'] === 'string' ? options['display-name'] : undefined,
      summary: typeof options.summary === 'string' ? options.summary : undefined,
    });

    if (!options['refresh-foundation']) {
      return result;
    }

    const hasImportedMaterials = ingestion.loadMaterialRecords(result.personId).length > 0;
    return {
      ...result,
      foundationRefresh: hasImportedMaterials
        ? relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId: result.personId }))
        : null,
    };
  }

  if (subcommand === 'intake') {
    assertExactlyOneBatchSelector(options, ['person', 'stale', 'imported', 'all'], 'update intake requires exactly one of --person, --stale, --imported, or --all');
    const intakeModeAllowedOptions = typeof options.person === 'string' && options.person.trim().length > 0
      ? ['person', 'display-name', 'summary', 'refresh-foundation']
      : ['stale', 'imported', 'all', 'refresh-foundation'];
    assertAllowedOptions(options, intakeModeAllowedOptions, 'update', subcommand);

    if (options.all) {
      return maybeAttachFoundationRefresh(ingestion.scaffoldAllProfileIntakes());
    }

    if (options.stale) {
      return maybeAttachFoundationRefresh(ingestion.scaffoldStaleProfileIntakes());
    }

    if (options.imported) {
      return maybeAttachFoundationRefresh(ingestion.scaffoldImportedProfileIntakes());
    }

    return maybeAttachFoundationRefresh(ingestion.scaffoldProfileIntake({
      personId,
      displayName: typeof options['display-name'] === 'string' ? options['display-name'] : undefined,
      summary: typeof options.summary === 'string' ? options.summary : undefined,
    }));
  }

  if (subcommand === 'foundation') {
    assertExactlyOneBatchSelector(options, ['person', 'stale', 'all'], 'update foundation requires exactly one of --person, --stale, or --all');
  }

  if (subcommand === 'foundation' && options.all) {
    const result = ingestion.refreshAllFoundationDrafts();
    return {
      ...result,
      results: result.results.map((entry: DraftRefreshResult) => relativizeDraftPaths(rootDir, entry)),
    };
  }

  if (subcommand === 'foundation' && options.stale) {
    const result = ingestion.refreshStaleFoundationDrafts();
    return {
      ...result,
      results: result.results.map((entry: DraftRefreshResult) => relativizeDraftPaths(rootDir, entry)),
    };
  }

  if (!personId) {
    throw new Error(subcommand === 'foundation'
      ? 'update foundation requires exactly one of --person, --stale, or --all'
      : 'Missing required --person argument');
  }

  if (subcommand === 'foundation') {
    return relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId }));
  }

  throw new Error(`Unsupported update type: ${subcommand}`);
}

export function buildSummary(rootDir: string) {
  const loader = new FileSystemLoader(rootDir);
  const manifestLoader = new ManifestLoader(rootDir);
  const soulDocument = loader.loadSoul();
  const voiceDocument = loader.loadVoice();
  const memoryIndex = loader.loadMemoryIndex();
  const skillInventory = loader.loadSkillInventory();
  const skillNames = skillInventory.names;
  const documentedSkillNames = new Set(skillInventory.documented ?? []);
  const thinSkillNames = new Set(skillInventory.thin ?? []);
  const skillCategoryCounts = buildSkillCategoryCounts(skillNames);
  const skillRecords = skillNames.map((skillName) => ({
    id: skillName,
    name: skillName,
    description: skillInventory.documentedExcerpts?.[skillName] ?? null,
    status: 'discovered',
    foundationStatus: documentedSkillNames.has(skillName)
      ? 'ready'
      : (thinSkillNames.has(skillName) ? 'thin' : 'missing'),
  }));
  const channelManifest = manifestLoader.loadChannelManifestSummary();
  const providerManifest = manifestLoader.loadProviderManifestSummary();

  const voice = typeof voiceDocument === 'string' && voiceDocument.trim().length > 0
    ? VoiceProfile.fromDocument(voiceDocument)
    : new VoiceProfile({
      tone: 'human',
      style: 'person-specific',
      constraints: ['stay faithful to learned voice'],
      signatures: ['consistent persona', 'compact but vivid phrasing'],
      languageHints: ['preserve bilingual or multilingual behavior when present'],
    });
  const soul = SoulProfile.fromDocument(soulDocument);

  const profile = new AgentProfile({
    name: 'ManSkill',
    soul: 'A configurable personality core for imitating a specific person from text.',
    identity: {
      role: 'person-like AI agent',
      architecture: 'memory + skills + soul + voice',
    },
    goals: ['imitate a specific person faithfully', 'stay practical and extensible'],
    voice: voice.summary(),
  });

  const memory = new MemoryStore({
    daily: memoryIndex.daily,
    legacyShortTerm: memoryIndex.legacyShortTerm,
    longTerm: memoryIndex.longTerm,
    scratch: memoryIndex.scratch,
  });
  const skills = new SkillRegistry(skillRecords);
  const skillSummary = {
    ...skills.summary(),
    ...(hasGroupedSkillCategories(skillNames) ? { categoryCounts: skillCategoryCounts } : {}),
  };
  const channels = new ChannelRegistry();
  if (Array.isArray(channelManifest.records)) {
    channelManifest.records.forEach((channel: unknown) => channels.register(channel as any));
  }

  const models = new ModelRegistry();
  if (Array.isArray(providerManifest.records)) {
    providerManifest.records.forEach((provider: unknown) => models.register(provider as any));
  }
  const workLoopObjectives = loadWorkLoopObjectives(rootDir);
  const profiles = loader.loadProfilesIndex() as any;
  const sampleManifestRelativePath = detectSampleManifestRelativePath(rootDir);
  const sampleManifest = readSampleManifestSummary(rootDir, sampleManifestRelativePath);
  const sampleTextRelativePath = detectSampleTextRelativePath(rootDir, sampleManifest);
  const sampleText = readSampleTextSummary(rootDir, sampleTextRelativePath);
  const foundation = buildFoundationRollup(profiles) as any;
  const ingestionSummary = buildIngestionSummary(profiles, {
    rootDir,
    sampleManifestPath: sampleManifestRelativePath,
    sampleManifest,
    sampleTextPath: sampleText.present ? sampleText.path : null,
  }) as any;
  const coreFoundation = buildCoreFoundationSummary({
    soulDocument,
    voiceDocument,
    memoryIndex,
    skillNames,
    skillInventory,
  });
  const rawChannelsSummary = {
    ...channels.summary(),
    manifest: {
      path: channelManifest.path,
      status: channelManifest.status,
      entryCount: channelManifest.entryCount,
      error: channelManifest.error,
    },
  };
  const rawModelsSummary = {
    ...models.summary(),
    manifest: {
      path: providerManifest.path,
      status: providerManifest.status,
      entryCount: providerManifest.entryCount,
      error: providerManifest.error,
    },
  };
  const envTemplateRelativePath = '.env.example';
  const envTemplateAbsolutePath = path.join(rootDir, envTemplateRelativePath);
  const envConfigAbsolutePath = path.join(rootDir, '.env');
  const envTemplatePresent = fs.existsSync(envTemplateAbsolutePath);
  const envConfigPresent = fs.existsSync(envConfigAbsolutePath);
  const rawEnvTemplateVarNames = envTemplatePresent ? readEnvTemplateVarNames(envTemplateAbsolutePath) : [];
  const repoEnvValues = readEnvFileValues(envConfigAbsolutePath);
  const deliveryEnvironment = mergeDeliveryEnvironment(repoEnvValues, process.env);
  const channelRolloutOrder = deriveDeliveryRolloutOrder(workLoopObjectives, CHANNEL_ROLLOUT_ORDER);
  const providerRolloutOrder = deriveDeliveryRolloutOrder(workLoopObjectives, PROVIDER_ROLLOUT_ORDER);
  const baseDeliverySummary = buildDeliverySummary(rawChannelsSummary, rawModelsSummary, deliveryEnvironment, {
    rootDir,
    channelRolloutOrder,
    providerRolloutOrder,
  });
  const promotedChannelQueue = baseDeliverySummary.channelQueue.map((channel) => ({
    ...channel,
    status: promoteRuntimeReadyStatus(channel.status, channel.implementationReady),
  }));
  const promotedProviderQueue = baseDeliverySummary.providerQueue.map((provider) => ({
    ...provider,
    status: promoteRuntimeReadyStatus(provider.status, provider.implementationReady),
  }));
  const channelsSummary = applyRuntimeReadyStatuses(rawChannelsSummary, promotedChannelQueue, 'channels', channelRolloutOrder);
  const modelsSummary = applyRuntimeReadyStatuses(rawModelsSummary, promotedProviderQueue, 'providers', providerRolloutOrder);
  const envTemplateVarNames = orderStringsByPreferredSequence(rawEnvTemplateVarNames, baseDeliverySummary.requiredEnvVars);
  const envTemplateMissingRequiredVars = orderStringsByPreferredSequence(
    baseDeliverySummary.requiredEnvVars.filter((envVar) => !envTemplateVarNames.includes(envVar)),
    baseDeliverySummary.requiredEnvVars,
  );
  const completeEnvBootstrapCommand = envTemplatePresent && !envConfigPresent ? 'cp .env.example .env' : null;
  const populateEnvTemplateCommand = envTemplatePresent && envTemplateMissingRequiredVars.length > 0
    ? buildPopulateEnvCommand(envTemplateMissingRequiredVars, '.env.example')
    : null;
  const sanitizeDeliveryQueueBootstrap = <T extends { missingEnvVars?: string[]; helperCommands?: Record<string, unknown> }>(queue: T[] = []): T[] => {
    const canBootstrapEnv = envTemplatePresent && !envConfigPresent && envTemplateMissingRequiredVars.length === 0 && Boolean(completeEnvBootstrapCommand);

    return queue.map((item) => {
      const missingEnvVars = Array.isArray(item?.missingEnvVars)
        ? item.missingEnvVars.filter((value): value is string => typeof value === 'string' && value.length > 0)
        : [];

      return {
        ...item,
        helperCommands: {
          ...item.helperCommands,
          bootstrapEnv: canBootstrapEnv && missingEnvVars.length > 0 ? completeEnvBootstrapCommand : null,
        },
      };
    });
  };
  const deliverySummary = {
    ...baseDeliverySummary,
    envTemplatePath: envTemplateRelativePath,
    envTemplatePresent,
    envTemplateCommand: completeEnvBootstrapCommand,
    envTemplateVarNames,
    envTemplateMissingRequiredVars,
    channelQueue: sanitizeDeliveryQueueBootstrap(promotedChannelQueue),
    providerQueue: sanitizeDeliveryQueueBootstrap(promotedProviderQueue),
    helperCommands: {
      ...baseDeliverySummary.helperCommands,
      bootstrapEnv: envTemplatePresent && envTemplateMissingRequiredVars.length === 0 ? completeEnvBootstrapCommand : null,
      populateEnvTemplate: populateEnvTemplateCommand,
    },
  };
  const workLoop = new WorkLoop({
    intervalMinutes: 10,
    objectives: workLoopObjectives,
    priorities: [
      buildFoundationPriority(foundation, coreFoundation, profiles),
      buildIngestionPriority(ingestionSummary, rootDir, profiles),
      buildDeliveryPriority({
        id: 'channels',
        label: 'Channels',
        pendingCount: deliverySummary.pendingChannelCount,
        configuredCount: deliverySummary.configuredChannelCount,
        authBlockedCount: deliverySummary.authBlockedChannelCount,
        queue: deliverySummary.channelQueue,
        envTemplatePath: deliverySummary.envTemplatePresent ? deliverySummary.envTemplatePath : null,
        envTemplateCommand: deliverySummary.envTemplatePresent ? deliverySummary.envTemplateCommand : null,
        envTemplatePopulateCommand: deliverySummary.helperCommands.populateEnvTemplate,
        envTemplateVarNames: deliverySummary.envTemplateVarNames,
        envConfigPath: '.env',
        envConfigPresent,
        envConfigPopulateCommand: deliverySummary.helperCommands.populateChannelEnv,
        implementationBundleCommand: deliverySummary.helperCommands.scaffoldChannelImplementationBundle,
      }),
      buildDeliveryPriority({
        id: 'providers',
        label: 'Providers',
        pendingCount: deliverySummary.pendingProviderCount,
        configuredCount: deliverySummary.configuredProviderCount,
        authBlockedCount: deliverySummary.authBlockedProviderCount,
        queue: deliverySummary.providerQueue,
        envTemplatePath: deliverySummary.envTemplatePresent ? deliverySummary.envTemplatePath : null,
        envTemplateCommand: deliverySummary.envTemplatePresent ? deliverySummary.envTemplateCommand : null,
        envTemplatePopulateCommand: deliverySummary.helperCommands.populateEnvTemplate,
        envTemplateVarNames: deliverySummary.envTemplateVarNames,
        envConfigPath: '.env',
        envConfigPresent,
        envConfigPopulateCommand: deliverySummary.helperCommands.populateProviderEnv,
        implementationBundleCommand: deliverySummary.helperCommands.scaffoldProviderImplementationBundle,
      }),
    ],
  });
  const workLoopSummary = workLoop.summary();
  const profileSnapshots = buildProfileSnapshotSummaries(profiles);
  const prompt = new PromptAssembler({
    profile: profile.summary(),
    soul: soulDocument,
    soulProfile: soul.summary(),
    voice: {
      ...voice.summary(),
      document: voiceDocument,
    },
    memory: memoryIndex,
    memorySummary: memory.summary(),
    skills: skillSummary,
    skillsSummary: skillSummary,
    profiles,
    foundationRollup: foundation,
    foundationCore: coreFoundation,
    ingestion: ingestionSummary,
    channels: channelsSummary,
    models: modelsSummary,
    delivery: deliverySummary,
    workLoop: workLoopSummary,
  } as any);

  return {
    profile: profile.summary(),
    soul: soul.summary(),
    memory: memory.summary(),
    skills: skillSummary,
    voice: voice.summary(),
    foundation: {
      ...foundation,
      core: coreFoundation,
    },
    ingestion: ingestionSummary,
    channels: channelsSummary,
    models: modelsSummary,
    delivery: deliverySummary,
    profiles,
    profileSnapshots,
    workLoop: workLoopSummary,
    promptPreview: prompt.buildPreview(120000),
  };
}

function buildCliUsageLines(): string[] {
  return [
    'Usage: node src/index.js [command] [subcommand] [options]',
    '',
    'Commands:',
    '  node src/index.js                                  Show the repo summary JSON',
    '  node src/index.js --help                           Show this usage guide',
    '  node src/index.js import sample [--file <manifest.json>]  Import the checked-in sample manifest and refresh drafts',
    '  node src/index.js import intake --person <person-id> [--refresh-foundation] Import a ready profile-local intake manifest',
    '  node src/index.js import intake --stale [--refresh-foundation]             Import ready intake manifests for metadata-only profiles that still need first imports',
    '  node src/index.js import intake --imported [--refresh-foundation]          Import ready intake manifests only for already-imported profiles',
    '  node src/index.js import intake --all [--refresh-foundation]               Import every ready profile-local intake manifest, including already-imported profiles',
    '  node src/index.js import manifest --file <manifest.json> [--refresh-foundation]',
    '  node src/index.js import text --person <person-id> --file <sample.txt> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js import message --person <person-id> --text <message> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js import talk --person <person-id> --text <snippet> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js import screenshot --person <person-id> --file <image.png> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js update profile --person <person-id> [--display-name <name>] [--summary <text>] [--refresh-foundation]',
    '  node src/index.js update intake --person <person-id> [--display-name <name>] [--summary <text>] [--refresh-foundation]',
    '  node src/index.js update intake --stale [--refresh-foundation]             Complete intake scaffolds only for metadata-only profiles with missing or partial imports/ assets',
    '  node src/index.js update intake --imported [--refresh-foundation]          Backfill intake scaffolds only for already-imported profiles missing imports/ assets',
    '  node src/index.js update intake --all [--refresh-foundation]               Rebuild intake scaffolds for every metadata-only profile',
    '  node src/index.js update foundation --person <person-id>',
    '  node src/index.js update foundation --stale',
    '  node src/index.js update foundation --all',
  ];
}

function formatCliUsage(): string {
  return `${buildCliUsageLines().join('\n')}\n`;
}

function formatUsageHint(usage: string, examples: string[] = []): string {
  if (examples.length === 0) {
    return usage;
  }

  return [
    usage,
    'Examples:',
    ...examples.map((example) => `  ${example}`),
  ].join('\n');
}

function buildCommandUsageHint(command?: string, subcommand?: string): string | null {
  if (command === 'import' && subcommand === 'manifest') {
    return 'Usage: node src/index.js import manifest --file <manifest.json> [--refresh-foundation]';
  }

  if (command === 'import' && subcommand === 'sample') {
    return 'Usage: node src/index.js import sample [--file <manifest.json>]';
  }

  if (command === 'import' && subcommand === 'intake') {
    return formatUsageHint(
      'Usage: node src/index.js import intake --person <person-id> [--refresh-foundation] | --stale [--refresh-foundation] | --imported [--refresh-foundation] | --all [--refresh-foundation]',
      [
        "node src/index.js import intake --person 'harry-han' --refresh-foundation",
        'node src/index.js import intake --stale',
        'node src/index.js import intake --imported --refresh-foundation',
        'node src/index.js import intake --all',
      ],
    );
  }

  if (command === 'import' && subcommand === 'text') {
    return 'Usage: node src/index.js import text --person <person-id> --file <sample.txt> [--notes <text>] [--refresh-foundation]';
  }

  if (command === 'import' && subcommand === 'message') {
    return 'Usage: node src/index.js import message --person <person-id> --text <message> [--notes <text>] [--refresh-foundation]';
  }

  if (command === 'import' && subcommand === 'talk') {
    return 'Usage: node src/index.js import talk --person <person-id> --text <snippet> [--notes <text>] [--refresh-foundation]';
  }

  if (command === 'import' && subcommand === 'screenshot') {
    return 'Usage: node src/index.js import screenshot --person <person-id> --file <image.png> [--notes <text>] [--refresh-foundation]';
  }

  if (command === 'update' && subcommand === 'profile') {
    return 'Usage: node src/index.js update profile --person <person-id> [--display-name <name>] [--summary <text>] [--refresh-foundation]';
  }

  if (command === 'update' && subcommand === 'intake') {
    return formatUsageHint(
      'Usage: node src/index.js update intake --person <person-id> [--display-name <name>] [--summary <text>] [--refresh-foundation] | --stale [--refresh-foundation] | --imported [--refresh-foundation] | --all [--refresh-foundation]',
      [
        "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
        'node src/index.js update intake --stale',
        'node src/index.js update intake --imported --refresh-foundation',
        'node src/index.js update intake --all --refresh-foundation',
      ],
    );
  }

  if (command === 'update' && subcommand === 'foundation') {
    return formatUsageHint(
      'Usage: node src/index.js update foundation --person <person-id> | --stale | --all',
      [
        "node src/index.js update foundation --person 'harry-han'",
        'node src/index.js update foundation --stale',
        'node src/index.js update foundation --all',
      ],
    );
  }

  if (command === 'import' || command === 'update') {
    return buildCommandFamilyUsageHint(command);
  }

  return null;
}

export function main(argv: string[] = process.argv.slice(2), rootDir: string = process.cwd()): void {
  const { command, subcommand, options } = parseArgs(argv);

  if (command === '--help' || command === 'help' || options.help) {
    console.log(formatCliUsage());
    return;
  }

  try {
    if (command === 'import') {
      const result = runImportCommand(rootDir, subcommand, options);
      console.log(JSON.stringify({ ok: true, ...result }, null, 2));
      return;
    }

    if (command === 'update') {
      const result = runUpdateCommand(rootDir, subcommand, options);
      console.log(JSON.stringify({ ok: true, ...result }, null, 2));
      return;
    }

    console.log(JSON.stringify(buildSummary(rootDir), null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const usageHint = buildCommandUsageHint(command, subcommand);
    const lines = [`Error: ${message}`];

    if (usageHint) {
      lines.push(usageHint);
    }

    lines.push('Run `node src/index.js --help` for more commands.');
    console.error(lines.join('\n'));
    process.exitCode = 1;
  }
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  main();
}

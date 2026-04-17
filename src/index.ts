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
import { buildCoreFoundationSummary } from './core/foundation-core.ts';
import { buildCoreFoundationCommand } from './core/foundation-core-commands.ts';
import { buildIngestionSummary } from './core/ingestion-summary.js';
import { buildDeliverySummary } from './core/delivery-summary.ts';
import { PromptAssembler } from './core/prompt-assembler.ts';
import { MaterialIngestion } from './core/material-ingestion.js';
import { ManifestLoader } from './core/manifest-loader.ts';
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

type QueueLike = {
  status?: string;
  setupHint?: string | null;
  nextStep?: string | null;
  implementationPath?: string | null;
  implementationPresent?: boolean;
  implementationScaffoldPath?: string | null;
  manifestPath?: string | null;
  manifestPresent?: boolean;
  manifestScaffoldPath?: string | null;
  missingEnvVars?: string[];
};

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
  const normalizedDisplayName = typeof displayName === 'string' ? displayName.trim() : '';
  if (!normalizedDisplayName || normalizedDisplayName === personId) {
    return personId;
  }

  return `${normalizedDisplayName} (${personId})`;
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
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
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

    const manifest = Array.isArray(parsed)
      ? { entries: parsed }
      : (parsed && typeof parsed === 'object' ? parsed as { entries?: unknown; profiles?: unknown; personId?: unknown } : null);

    if (!manifest) {
      throw new Error('Sample manifest must be an array or object');
    }

    const fallbackPersonId = registerPersonId(
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

        const profilePersonId = registerPersonId(
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
      const resolvedPersonId = entryRecord.personId ?? fallbackPersonId;
      const normalizedPersonId = registerPersonId(resolvedPersonId);
      if (!normalizedPersonId) {
        throw new Error(`Manifest entry ${index} is missing personId`);
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

function buildFoundationDraftPaths(profile: ProfileSummaryLike | null): string[] {
  if (!profile?.id) {
    return [];
  }

  const draftPathByKey: Record<string, string> = {
    memory: `profiles/${profile.id}/memory/long-term/foundation.json`,
    skills: `profiles/${profile.id}/skills/README.md`,
    soul: `profiles/${profile.id}/soul/README.md`,
    voice: `profiles/${profile.id}/voice/README.md`,
  };
  const missingDrafts = Array.isArray(profile.foundationDraftStatus?.missingDrafts)
    ? [...profile.foundationDraftStatus.missingDrafts]
      .filter((value): value is string => typeof value === 'string' && value in draftPathByKey)
      .sort()
    : [];

  if (missingDrafts.length > 0) {
    return missingDrafts.map((draftKey) => draftPathByKey[draftKey]);
  }

  const draftPaths = profile.foundationDrafts && typeof profile.foundationDrafts === 'object'
    ? Object.entries(profile.foundationDrafts)
      .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1].length > 0)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([, value]) => value)
    : [];

  return draftPaths.length > 0
    ? draftPaths
    : Object.keys(draftPathByKey).sort().map((draftKey) => draftPathByKey[draftKey]);
}

function collectFoundationDraftPaths(profiles: ProfileSummaryLike[]): string[] {
  return Array.from(new Set(
    profiles.flatMap((profile) => buildFoundationDraftPaths(profile)),
  ));
}

function buildFoundationRefreshLabel(
  reasonsSource: { refreshReasons?: string[] } | null,
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

  return reasons.length > 0
    ? `${refreshLabel} — reasons ${reasons.join(' + ')}`
    : refreshLabel;
}

function buildFoundationPriority(foundation: any, coreFoundation: any, profiles: ProfileSummaryLike[] = []): WorkPriority {
  const maintenance = foundation?.maintenance ?? {};
  const coreMaintenance = coreFoundation?.maintenance ?? {};
  const coreOverview = coreFoundation?.overview ?? {};
  const queuedProfile = Array.isArray(maintenance.queuedProfiles) ? maintenance.queuedProfiles[0] : null;
  const queuedAreas = Array.isArray(coreMaintenance.queuedAreas) ? coreMaintenance.queuedAreas : [];
  const queuedArea = queuedAreas[0] ?? null;
  const queuedAreaCommand = queuedArea?.command ?? buildCoreFoundationCommand(queuedArea);
  const queuedProfileSummary = queuedProfile?.id
    ? profiles.find((profile) => profile?.id === queuedProfile.id) ?? null
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
  const queuedProfileReasons = Array.isArray(queuedProfile?.refreshReasons)
    ? queuedProfile.refreshReasons.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const queuedProfileLabel = queuedProfile?.label ?? queuedProfile?.id ?? null;
  const bulkRefreshLabel = queuedProfileLabel
    ? `refresh stale or incomplete target profiles — starting with ${queuedProfileLabel}${queuedProfileReasons.length > 0 ? ` (${queuedProfileReasons.join(' + ')})` : ''}`
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
    ? collectFoundationDraftPaths(queuedProfileSummaries)
    : [];
  const bulkCoreScaffoldCommand = typeof coreMaintenance?.helperCommands?.scaffoldAll === 'string' && coreMaintenance.helperCommands.scaffoldAll.length > 0
    ? coreMaintenance.helperCommands.scaffoldAll
    : null;
  const useBulkCoreScaffoldCommand = queuedAreas.length > 1 && Boolean(bulkCoreScaffoldCommand);
  const bulkCoreScaffoldPaths = useBulkCoreScaffoldCommand
    ? Array.from(new Set(
      queuedAreas.flatMap((area: any) => Array.isArray(area?.paths)
        ? area.paths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
        : []),
    ))
    : [];
  const bulkCoreScaffoldLabel = queuedArea?.action
    ? `scaffold missing or thin core foundation areas — starting with ${queuedArea.action}`
    : 'scaffold missing or thin core foundation areas';

  const coreQueueSummary = thinAreaCount > 0 || missingAreaCount > 0
    ? ` (${thinAreaCount} thin, ${missingAreaCount} missing)`
    : '';
  const hasQueuedCoreFoundation = queuedAreas.length > 0;
  const coreNextAction = useBulkCoreScaffoldCommand ? bulkCoreScaffoldLabel : (queuedArea?.action ?? null);
  const coreCommand = useBulkCoreScaffoldCommand ? bulkCoreScaffoldCommand : queuedAreaCommand;
  const corePaths = useBulkCoreScaffoldCommand
    ? bulkCoreScaffoldPaths
    : (Array.isArray(queuedArea?.paths) ? queuedArea.paths.filter((value: unknown): value is string => typeof value === 'string') : []);
  const profileNextAction = queuedProfile?.refreshCommand
    ? (useBulkRefreshCommand ? bulkRefreshLabel : buildFoundationRefreshLabel(queuedProfile, queuedProfileLabel))
    : null;
  const profileCommand = queuedProfile?.refreshCommand
    ? (useBulkRefreshCommand
      ? (typeof maintenance?.refreshBundleCommand === 'string' && maintenance.refreshBundleCommand.length > 0
        ? maintenance.refreshBundleCommand
        : maintenance.staleRefreshCommand)
      : queuedProfile.refreshCommand)
    : null;
  const profilePaths = queuedProfile?.refreshCommand
    ? (useBulkRefreshCommand
      ? bulkRefreshPaths
      : buildFoundationDraftPaths(queuedProfileSummary))
    : [];

  return {
    id: 'foundation',
    label: 'Foundation',
    status,
    summary: `core ${coreOverview.readyAreaCount ?? 0}/${coreOverview.totalAreaCount ?? 0} ready${coreQueueSummary}; profiles ${refreshProfileCount} queued for refresh, ${incompleteProfileCount} incomplete`,
    nextAction: hasQueuedCoreFoundation ? coreNextAction : profileNextAction,
    command: hasQueuedCoreFoundation ? coreCommand : profileCommand,
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
  )).sort((left, right) => left.localeCompare(right));
}

function buildIngestionPriority(ingestionSummary: any, rootDir: string, profiles: ProfileSummaryLike[] = []): WorkPriority {
  const importedProfileCount = ingestionSummary?.importedProfileCount ?? 0;
  const metadataOnlyProfileCount = ingestionSummary?.metadataOnlyProfileCount ?? 0;
  const intakeStaleProfileCount = ingestionSummary?.intakeStaleProfileCount ?? 0;
  const refreshProfileCount = ingestionSummary?.refreshProfileCount ?? 0;
  const incompleteProfileCount = ingestionSummary?.incompleteProfileCount ?? 0;
  const status: WorkPriority['status'] = importedProfileCount > 0 && metadataOnlyProfileCount === 0 && refreshProfileCount === 0 && incompleteProfileCount === 0
    ? 'ready'
    : 'queued';

  const getReadyIntakeManifestSummary = (profile: any) => {
    const intakePaths = Array.isArray(profile?.intakePaths)
      ? profile.intakePaths.filter((value: any): value is string => typeof value === 'string' && (value.endsWith('materials.template.json') || value.endsWith('sample.txt')))
      : [];
    const starterManifestPath = intakePaths.find((value) => value.endsWith('materials.template.json')) ?? null;
    if (!starterManifestPath) {
      return {
        intakePaths,
        starterManifestPath: null,
        manifestSummary: null,
      };
    }

    const manifestSummary = readSampleManifestSummary(rootDir, starterManifestPath);
    if (manifestSummary.status === 'invalid') {
      try {
        const parsedManifest = JSON.parse(fs.readFileSync(path.join(rootDir, starterManifestPath), 'utf8')) as {
          entries?: unknown;
          entryTemplates?: unknown;
        };
        const hasStarterTemplates = parsedManifest
          && typeof parsedManifest === 'object'
          && !Array.isArray(parsedManifest)
          && Array.isArray(parsedManifest.entries)
          && parsedManifest.entries.length === 0
          && parsedManifest.entryTemplates
          && typeof parsedManifest.entryTemplates === 'object'
          && !Array.isArray(parsedManifest.entryTemplates)
          && Object.keys(parsedManifest.entryTemplates).length > 0;
        if (hasStarterTemplates) {
          return {
            intakePaths,
            starterManifestPath,
            manifestSummary: null,
          };
        }
      } catch {
        // Preserve the invalid manifest summary below.
      }
    }

    return {
      intakePaths,
      starterManifestPath,
      manifestSummary,
    };
  };

  const collectReadyIntakeImportPaths = (profile: any) => {
    const { intakePaths, manifestSummary } = getReadyIntakeManifestSummary(profile);
    if (!manifestSummary || manifestSummary.status !== 'loaded') {
      return intakePaths;
    }

    return Array.from(new Set([
      ...intakePaths,
      ...manifestSummary.filePaths,
    ]));
  };

  let nextAction: string | null = null;
  let command: string | null = null;
  let paths: string[] = [];

  if ((ingestionSummary?.profileCount ?? 0) === 0) {
    const sampleStarterCommand = ingestionSummary?.sampleStarterCommand ?? null;
    const exactSampleManifestCommand = typeof ingestionSummary?.sampleManifestCommand === 'string' && ingestionSummary.sampleManifestCommand.length > 0
      ? ingestionSummary.sampleManifestCommand
      : null;
    const samplePaths = collectSampleManifestPaths(ingestionSummary);
    const sampleManifestPath = typeof ingestionSummary?.sampleManifestPath === 'string' && ingestionSummary.sampleManifestPath.length > 0
      ? ingestionSummary.sampleManifestPath
      : null;
    const sampleManifestInvalid = ingestionSummary?.sampleManifestStatus === 'invalid' && sampleManifestPath;

    if (sampleStarterCommand) {
      nextAction = buildSampleImportNextAction(ingestionSummary);
      command = exactSampleManifestCommand ?? sampleStarterCommand;
      paths = samplePaths;
    } else if (sampleManifestInvalid) {
      nextAction = 'fix the checked-in sample manifest for first imports';
      command = null;
      paths = [sampleManifestPath];
    } else {
      nextAction = 'bootstrap a target profile';
      command = ingestionSummary?.bootstrapProfileCommand ?? null;
      paths = samplePaths;
    }
  } else if (refreshProfileCount > 0 || incompleteProfileCount > 0) {
    nextAction = 'refresh stale or incomplete target profiles';
    command = typeof ingestionSummary?.refreshFoundationBundleCommand === 'string' && ingestionSummary.refreshFoundationBundleCommand.length > 0
      ? ingestionSummary.refreshFoundationBundleCommand
      : (ingestionSummary?.staleRefreshCommand ?? null);
    const refreshProfileIds = Array.isArray(ingestionSummary?.allProfileCommands)
      ? ingestionSummary.allProfileCommands
        .filter((profile: any) => profile?.refreshFoundationCommand && (profile?.needsRefresh || (profile?.missingDrafts?.length ?? 0) > 0))
        .map((profile: any) => profile.personId)
        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
      : [];
    const refreshProfiles = refreshProfileIds.length > 0
      ? refreshProfileIds
        .map((profileId) => profiles.find((profile) => profile?.id === profileId) ?? null)
        .filter((profile): profile is ProfileSummaryLike => Boolean(profile?.id))
      : [];
    paths = collectFoundationDraftPaths(refreshProfiles);
  } else if (metadataOnlyProfileCount > 0) {
    const metadataProfileCommands = Array.isArray(ingestionSummary?.metadataProfileCommands)
      ? ingestionSummary.metadataProfileCommands
      : [];
    const metadataOnlyProfileNeedingScaffold = metadataProfileCommands.find((profile: any) => profile?.intakeReady === false && profile?.updateIntakeCommand);
    const readyIntakeProfiles = metadataProfileCommands.filter((profile: any) =>
      profile?.intakeReady === true
      && profile?.intakeManifestStatus !== 'invalid'
      && profile?.importManifestCommand
      && profile.importManifestCommand === profile.importMaterialCommand
      && !profile.importManifestCommand.includes('<'),
    );
    const invalidReadyIntakeProfiles = metadataProfileCommands
      .filter((profile: any) =>
        profile?.intakeReady === true
        && profile?.intakeManifestStatus === 'invalid'
        && typeof profile?.intakeManifestPath === 'string'
        && profile.intakeManifestPath.length > 0,
      )
      .map((profile: any) => ({
        profile,
        starterManifestPath: profile.intakeManifestPath,
        manifestSummary: {
          status: 'invalid',
          error: profile.intakeManifestError ?? null,
        },
      }));
    const metadataOnlyProfile = metadataProfileCommands.find((profile: any) => profile?.importMaterialCommand) ?? metadataOnlyProfileNeedingScaffold ?? invalidReadyIntakeProfiles[0]?.profile ?? null;
    const runnableImportCommand = metadataOnlyProfile?.importMaterialCommand && !metadataOnlyProfile.importMaterialCommand.includes('<')
      ? metadataOnlyProfile.importMaterialCommand
      : null;
    const sampleManifestPaths = collectSampleManifestPaths(ingestionSummary);
    const sampleTextPath = typeof ingestionSummary?.sampleTextPath === 'string' && ingestionSummary.sampleTextPath.length > 0
      ? ingestionSummary.sampleTextPath
      : null;
    const sampleTextPersonId = typeof ingestionSummary?.sampleTextPersonId === 'string' && ingestionSummary.sampleTextPersonId.length > 0
      ? ingestionSummary.sampleTextPersonId
      : null;
    const sampleFileCommands = Array.isArray(ingestionSummary?.sampleFileCommands)
      ? ingestionSummary.sampleFileCommands.filter((entry: any) => entry && typeof entry === 'object')
      : [];

    if (metadataOnlyProfileNeedingScaffold) {
      const intakeCompletion = metadataOnlyProfileNeedingScaffold?.intakeCompletion;
      const isPartialIntake = intakeCompletion === 'partial';
      const bundledIntakeCommand = typeof ingestionSummary?.helperCommands?.scaffoldBundle === 'string' && ingestionSummary.helperCommands.scaffoldBundle.length > 0
        ? ingestionSummary.helperCommands.scaffoldBundle
        : null;
      const fallbackBulkIntakeCommand = typeof ingestionSummary?.intakeStaleCommand === 'string' && ingestionSummary.intakeStaleCommand.length > 0
        ? ingestionSummary.intakeStaleCommand
        : null;
      const useBulkIntakeCommand = intakeStaleProfileCount > 1 && Boolean(bundledIntakeCommand ?? fallbackBulkIntakeCommand);
      nextAction = metadataOnlyProfileNeedingScaffold?.label
        ? (useBulkIntakeCommand
          ? `${isPartialIntake ? 'complete' : 'scaffold'} incomplete intake landing zones — starting with ${metadataOnlyProfileNeedingScaffold.label}`
          : `${isPartialIntake ? 'complete' : 'scaffold'} the intake landing zone for ${metadataOnlyProfileNeedingScaffold.label}`)
        : `${isPartialIntake ? 'complete' : 'scaffold'} intake landing zones for metadata-only profiles`;
      command = useBulkIntakeCommand
        ? (bundledIntakeCommand ?? fallbackBulkIntakeCommand)
        : metadataOnlyProfileNeedingScaffold.updateIntakeCommand;
      const collectIntakePaths = (profile: any) => {
        const missingIntakePaths = Array.isArray(profile?.intakeMissingPaths)
          ? profile.intakeMissingPaths.filter((value: any): value is string => typeof value === 'string' && value.length > 0)
          : [];
        if (missingIntakePaths.length > 0) {
          return missingIntakePaths;
        }

        return Array.isArray(profile?.intakePaths)
          ? profile.intakePaths.filter((value: any): value is string => typeof value === 'string' && value.length > 0)
          : [];
      };
      paths = useBulkIntakeCommand
        ? metadataProfileCommands
          .filter((profile: any) => profile?.intakeReady === false && profile?.updateIntakeCommand)
          .flatMap((profile: any) => collectIntakePaths(profile))
        : collectIntakePaths(metadataOnlyProfileNeedingScaffold);
    } else if (invalidReadyIntakeProfiles.length > 0) {
      const [firstInvalidReadyIntakeProfile] = invalidReadyIntakeProfiles;
      nextAction = invalidReadyIntakeProfiles.length > 1
        ? (firstInvalidReadyIntakeProfile?.profile?.label
          ? `repair invalid profile-local intake manifests — starting with ${firstInvalidReadyIntakeProfile.profile.label}`
          : 'repair invalid profile-local intake manifests')
        : (firstInvalidReadyIntakeProfile?.profile?.label
          ? `repair the invalid intake manifest for ${firstInvalidReadyIntakeProfile.profile.label}`
          : 'repair the invalid profile-local intake manifest');
      command = typeof firstInvalidReadyIntakeProfile?.profile?.updateIntakeCommand === 'string'
        ? firstInvalidReadyIntakeProfile.profile.updateIntakeCommand
        : null;
      paths = Array.from(new Set(invalidReadyIntakeProfiles.map((entry: any) => entry.starterManifestPath)));
    } else if (readyIntakeProfiles.length > 1) {
      nextAction = readyIntakeProfiles[0]?.label
        ? `import source materials for ready intake profiles — starting with ${readyIntakeProfiles[0].label}`
        : 'import source materials for ready intake profiles';
      command = typeof ingestionSummary?.helperCommands?.importIntakeBundle === 'string' && ingestionSummary.helperCommands.importIntakeBundle.length > 0
        ? ingestionSummary.helperCommands.importIntakeBundle
        : (typeof ingestionSummary?.intakeImportStaleCommand === 'string' && ingestionSummary.intakeImportStaleCommand.length > 0
            ? ingestionSummary.intakeImportStaleCommand
            : (typeof ingestionSummary?.intakeImportAllCommand === 'string' && ingestionSummary.intakeImportAllCommand.length > 0
                ? ingestionSummary.intakeImportAllCommand
                : null));
      paths = readyIntakeProfiles.flatMap((profile: any) => collectReadyIntakeImportPaths(profile));
    } else if (runnableImportCommand) {
      nextAction = metadataOnlyProfile?.label
        ? `import source materials for ${metadataOnlyProfile.label}`
        : 'import source materials for metadata-only profiles';
      command = runnableImportCommand;
      paths = metadataOnlyProfile?.importManifestCommand === runnableImportCommand
        ? collectReadyIntakeImportPaths(metadataOnlyProfile)
        : (() => {
          const matchingSampleFile = sampleFileCommands.find((entry: any) =>
            entry?.personId === metadataOnlyProfile?.personId
            && entry?.command === runnableImportCommand
            && typeof entry?.path === 'string'
            && entry.path.length > 0,
          );

          if (matchingSampleFile) {
            return Array.from(new Set([
              typeof matchingSampleFile.sourcePath === 'string' && matchingSampleFile.sourcePath.length > 0
                ? matchingSampleFile.sourcePath
                : null,
              matchingSampleFile.path,
            ].filter((value): value is string => typeof value === 'string' && value.length > 0)));
          }

          const sampleInlineCommands = Array.isArray(ingestionSummary?.sampleInlineCommands)
            ? ingestionSummary.sampleInlineCommands.filter((entry: any) => entry && typeof entry === 'object')
            : [];
          const matchingSampleInline = sampleInlineCommands.find((entry: any) =>
            entry?.personId === metadataOnlyProfile?.personId
            && entry?.command === runnableImportCommand
            && typeof entry?.sourcePath === 'string'
            && entry.sourcePath.length > 0,
          );

          if (matchingSampleInline) {
            return [matchingSampleInline.sourcePath];
          }

          if (sampleTextPath && sampleTextPersonId === metadataOnlyProfile?.personId) {
            return [sampleTextPath];
          }

          return [];
        })();
    } else if (ingestionSummary?.sampleManifestCommand || ingestionSummary?.importManifestCommand) {
      nextAction = 'import source materials for metadata-only profiles';
      command = ingestionSummary?.sampleManifestCommand ?? ingestionSummary?.importManifestCommand ?? null;
      paths = ingestionSummary?.sampleManifestCommand
        ? sampleManifestPaths
        : [];
    } else {
      nextAction = metadataOnlyProfile?.label
        ? `import source materials for ${metadataOnlyProfile.label}`
        : 'import source materials for metadata-only profiles';
      command = runnableImportCommand;
    }
  }

  return {
    id: 'ingestion',
    label: 'Ingestion',
    status,
    summary: `${importedProfileCount} imported, ${metadataOnlyProfileCount} metadata-only, ${ingestionSummary?.readyProfileCount ?? 0} ready, ${refreshProfileCount} queued for refresh`,
    nextAction,
    command,
    paths,
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
  envTemplateVarNames = [],
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
  envTemplateVarNames?: string[];
  implementationBundleCommand?: string | null;
}): WorkPriority {
  const firstQueued = Array.isArray(queue) ? queue[0] : null;
  const bundledImplementationPaths = Array.isArray(queue)
    ? queue
      .filter((item) => item?.implementationPresent === false)
      .map((item) => typeof item?.implementationScaffoldPath === 'string' && item.implementationScaffoldPath.length > 0
        ? item.implementationScaffoldPath
        : null)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const manifestMissing = Boolean(firstQueued?.manifestScaffoldPath) && firstQueued?.manifestPresent === false;
  const implementationMissing = Boolean(firstQueued?.implementationScaffoldPath) && firstQueued?.implementationPresent === false;
  const firstQueuedMissingEnvVars = Array.isArray((firstQueued as { missingEnvVars?: unknown })?.missingEnvVars)
    ? (firstQueued as { missingEnvVars: unknown[] }).missingEnvVars.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const normalizedEnvTemplateVarNames = Array.isArray(envTemplateVarNames)
    ? envTemplateVarNames.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const templateCoversLeaderCredentials = firstQueuedMissingEnvVars.length > 0
    && firstQueuedMissingEnvVars.every((envVar) => normalizedEnvTemplateVarNames.includes(envVar));
  const needsCredentialBootstrap = templateCoversLeaderCredentials && pendingCount > configuredCount;
  const bundledImplementationCount = Array.isArray(queue)
    ? queue.filter((item) => item?.implementationPresent === false && typeof item?.implementationScaffoldPath === 'string' && item.implementationScaffoldPath.length > 0).length
    : 0;
  const normalizedAuthBlockedCount = typeof authBlockedCount === 'number'
    ? authBlockedCount
    : Array.isArray(queue)
      ? queue.filter((item) => Array.isArray(item?.missingEnvVars) && item.missingEnvVars.length > 0).length
      : Math.max(pendingCount - configuredCount, 0);
  const implementationPresentCount = Array.isArray(queue)
    ? queue.filter((item) => item?.implementationPresent === true).length
    : 0;
  const manifestReady = Array.isArray(queue) && queue.length > 0
    ? queue.every((item) => item?.manifestPresent === true)
    : false;
  const shouldUseImplementationBundle = !(needsCredentialBootstrap && envTemplateCommand) && !manifestMissing && implementationMissing && bundledImplementationCount > 1 && typeof implementationBundleCommand === 'string' && implementationBundleCommand.length > 0;
  const includeEnvTemplatePath = needsCredentialBootstrap && typeof envTemplateCommand === 'string' && envTemplateCommand.length > 0;
  const paths = includeEnvTemplatePath
    ? [envTemplatePath].filter((value, index, values): value is string => typeof value === 'string' && value.length > 0 && values.indexOf(value) === index)
    : [
      typeof firstQueued?.manifestPath === 'string' && firstQueued.manifestPath.length > 0 ? firstQueued.manifestPath : null,
      ...(shouldUseImplementationBundle ? bundledImplementationPaths : []),
      ...(!shouldUseImplementationBundle && typeof firstQueued?.implementationPath === 'string' && firstQueued.implementationPath.length > 0
        ? [firstQueued.implementationPath]
        : []),
    ].filter((value, index, values): value is string => typeof value === 'string' && value.length > 0 && values.indexOf(value) === index);

  const followUpParts = [
    firstQueued?.setupHint,
    firstQueued?.nextStep ? `next: ${firstQueued.nextStep}` : null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  let nextAction = firstQueued ? followUpParts.join('; ') : null;
  let command = needsCredentialBootstrap && envTemplateCommand ? envTemplateCommand : null;

  if (!command && manifestMissing) {
    const manifestPath = typeof firstQueued?.manifestScaffoldPath === 'string' ? firstQueued.manifestScaffoldPath : null;
    nextAction = [`create ${manifestPath}`, ...followUpParts].filter(Boolean).join('; ');
    command = buildRelativeFileTouchCommand(manifestPath);
  } else if (!command && implementationMissing) {
    const implementationPath = typeof firstQueued?.implementationScaffoldPath === 'string' ? firstQueued.implementationScaffoldPath : null;
    nextAction = shouldUseImplementationBundle
      ? [`create pending ${id === 'channels' ? 'channel' : 'provider'} implementations — starting with ${implementationPath}`, ...followUpParts].filter(Boolean).join('; ')
      : [`create ${implementationPath}`, ...followUpParts].filter(Boolean).join('; ');
    command = shouldUseImplementationBundle
      ? implementationBundleCommand
      : buildRelativeFileTouchCommand(implementationPath);
  }

  return {
    id,
    label,
    status: pendingCount > 0 ? 'queued' : 'ready',
    summary: pendingCount > 0
      ? `${pendingCount} pending, ${configuredCount} configured, ${normalizedAuthBlockedCount} auth-blocked, manifest ${manifestReady ? 'ready' : 'missing'}, impl ${implementationPresentCount}/${pendingCount} present`
      : `${pendingCount} pending, ${configuredCount} configured`,
    nextAction,
    command,
    paths,
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
    results: Array.isArray(result?.results) ? result.results.map((entry: any) => relativizeManifestImportResult(entry)) : [],
  });

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
    if (options.all) {
      return relativizeManifestImportBatchResult(ingestion.importAllProfileIntakeManifests());
    }

    if (options.stale) {
      return relativizeManifestImportBatchResult(ingestion.importStaleProfileIntakeManifests());
    }

    const intakePersonId = typeof options.person === 'string' ? options.person : undefined;
    if (!intakePersonId) {
      throw new Error('import intake requires --person, --stale, or --all');
    }

    return relativizeManifestImportResult(ingestion.importProfileIntakeManifest({ personId: intakePersonId }));
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

export function runUpdateCommand(rootDir: string, subcommand: string | undefined, options: ParsedOptions): any {
  const ingestion = new MaterialIngestion(rootDir);
  const personId = typeof options.person === 'string' ? options.person : undefined;

  if (subcommand === 'profile') {
    if (!personId) {
      throw new Error('Missing required --person argument');
    }

    const result = ingestion.updateProfile({
      personId,
      displayName: typeof options['display-name'] === 'string' ? options['display-name'] : undefined,
      summary: typeof options.summary === 'string' ? options.summary : undefined,
    });

    return options['refresh-foundation']
      ? {
          ...result,
          foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId: result.personId })),
        }
      : result;
  }

  if (subcommand === 'intake') {
    if (options.all) {
      return ingestion.scaffoldAllProfileIntakes();
    }

    if (options.stale) {
      return ingestion.scaffoldStaleProfileIntakes();
    }

    if (!personId) {
      throw new Error('update intake requires --person, --stale, or --all');
    }

    return ingestion.scaffoldProfileIntake({
      personId,
      displayName: typeof options['display-name'] === 'string' ? options['display-name'] : undefined,
      summary: typeof options.summary === 'string' ? options.summary : undefined,
    });
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
      ? 'update foundation requires --person, --stale, or --all'
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
  const skillRecords = skillNames.map((skillName) => ({
    id: skillName,
    name: skillName,
    description: skillInventory.documentedExcerpts?.[skillName] ?? null,
    status: 'discovered',
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
    shortTerm: memoryIndex.daily,
    longTerm: memoryIndex.longTerm,
  });
  const skills = new SkillRegistry(skillRecords);
  const channels = new ChannelRegistry();
  if (Array.isArray(channelManifest.records)) {
    channelManifest.records.forEach((channel: unknown) => channels.register(channel as any));
  }

  const models = new ModelRegistry();
  if (Array.isArray(providerManifest.records)) {
    providerManifest.records.forEach((provider: unknown) => models.register(provider as any));
  }
  const workLoopObjectives = [
    'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
    'improve the user-facing ingestion/update entrance for target-person materials',
    'add chat channels Feishu, Telegram, WhatsApp, and Slack',
    'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
    'report progress in small verified increments',
  ];
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
  const channelsSummary = {
    ...channels.summary(),
    manifest: {
      path: channelManifest.path,
      status: channelManifest.status,
      entryCount: channelManifest.entryCount,
      error: channelManifest.error,
    },
  };
  const modelsSummary = {
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
  const envTemplatePresent = fs.existsSync(envTemplateAbsolutePath);
  const envConfigPresent = fs.existsSync(path.join(rootDir, '.env'));
  const envTemplateVarNames = envTemplatePresent ? readEnvTemplateVarNames(envTemplateAbsolutePath) : [];
  const baseDeliverySummary = buildDeliverySummary(channelsSummary, modelsSummary, process.env, { rootDir });
  const envTemplateMissingRequiredVars = baseDeliverySummary.requiredEnvVars.filter((envVar) => !envTemplateVarNames.includes(envVar));
  const completeEnvBootstrapCommand = envTemplatePresent && !envConfigPresent ? 'cp .env.example .env' : null;
  const deliverySummary = {
    ...baseDeliverySummary,
    envTemplatePath: envTemplateRelativePath,
    envTemplatePresent,
    envTemplateCommand: completeEnvBootstrapCommand,
    envTemplateVarNames,
    envTemplateMissingRequiredVars,
    helperCommands: {
      ...baseDeliverySummary.helperCommands,
      bootstrapEnv: envTemplatePresent && envTemplateMissingRequiredVars.length === 0 ? completeEnvBootstrapCommand : null,
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
        envTemplateVarNames: deliverySummary.envTemplateVarNames,
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
        envTemplateVarNames: deliverySummary.envTemplateVarNames,
        implementationBundleCommand: deliverySummary.helperCommands.scaffoldProviderImplementationBundle,
      }),
    ],
  });
  const workLoopSummary = workLoop.summary();
  const prompt = new PromptAssembler({
    profile: profile.summary(),
    soul: soulDocument,
    voice: {
      ...voice.summary(),
      document: voiceDocument,
    },
    memory: memoryIndex,
    skills: skills.summary(),
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
    skills: skills.summary(),
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
    workLoop: workLoopSummary,
    promptPreview: prompt.buildPreview(12500),
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
    '  node src/index.js import intake --person <person-id> Import a ready profile-local intake manifest and refresh drafts',
    '  node src/index.js import intake --stale             Import ready intake manifests for metadata-only profiles that still need first imports',
    '  node src/index.js import intake --all               Import every ready profile-local intake manifest, including already-imported profiles',
    '  node src/index.js import manifest --file <manifest.json> [--refresh-foundation]',
    '  node src/index.js import text --person <person-id> --file <sample.txt> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js import message --person <person-id> --text <message> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js import talk --person <person-id> --text <snippet> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js import screenshot --person <person-id> --file <image.png> [--notes <text>] [--refresh-foundation]',
    '  node src/index.js update profile --person <person-id> [--display-name <name>] [--summary <text>] [--refresh-foundation]',
    '  node src/index.js update intake --person <person-id> [--display-name <name>] [--summary <text>]',
    '  node src/index.js update intake --stale             Complete intake scaffolds only for metadata-only profiles with missing or partial imports/ assets',
    '  node src/index.js update intake --all               Rebuild intake scaffolds for every metadata-only profile',
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
      'Usage: node src/index.js import intake --person <person-id> | --stale | --all',
      [
        "node src/index.js import intake --person 'harry-han' --refresh-foundation",
        'node src/index.js import intake --stale --refresh-foundation',
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
      'Usage: node src/index.js update intake --person <person-id> [--display-name <name>] [--summary <text>] | --stale | --all',
      [
        "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'",
        'node src/index.js update intake --stale',
      ],
    );
  }

  if (command === 'update' && subcommand === 'foundation') {
    return formatUsageHint(
      'Usage: node src/index.js update foundation --person <person-id> | --stale | --all',
      [
        "node src/index.js update foundation --person 'harry-han'",
        'node src/index.js update foundation --stale',
      ],
    );
  }

  if (command === 'import' || command === 'update') {
    return buildCliUsageLines().find((line) => line.startsWith(`  node src/index.js ${command} `))?.trim() ?? null;
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

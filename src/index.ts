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

interface SampleManifestSummary {
  status: 'loaded' | 'missing' | 'invalid';
  entryCount: number;
  profileIds: string[];
  textFilePersonIds: Record<string, string>;
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
  manifestPath?: string | null;
};

type ProfileSummaryLike = {
  id?: string;
  foundationDrafts?: Record<string, string> | null;
  foundationDraftStatus?: {
    missingDrafts?: string[];
  } | null;
};

function slugifyPersonId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readSampleManifestSummary(rootDir: string, relativePath: string | null): SampleManifestSummary {
  if (!relativePath) {
    return {
      status: 'missing',
      entryCount: 0,
      profileIds: [],
      textFilePersonIds: {},
      error: null,
    };
  }

  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      status: 'missing',
      entryCount: 0,
      profileIds: [],
      textFilePersonIds: {},
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
      textFilePersonIds: {},
      error: error instanceof Error ? error.message : 'Unable to parse sample manifest',
    };
  }

  try {
    const profileIds = new Set<string>();
    const textFilePersonIds: Record<string, string> = {};
    const supportedEntryTypes = new Set(['text', 'message', 'talk', 'screenshot']);

    const registerPersonId = (value: unknown) => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
      }

      const normalized = slugifyPersonId(value);
      if (!normalized) {
        return null;
      }

      profileIds.add(normalized);
      return normalized;
    };

    const manifest = Array.isArray(parsed)
      ? { entries: parsed }
      : (parsed && typeof parsed === 'object' ? parsed as { entries?: unknown; profiles?: unknown; personId?: unknown } : null);

    if (!manifest) {
      throw new Error('Sample manifest must be an array or object');
    }

    const fallbackPersonId = registerPersonId(manifest.personId);
    const manifestDir = path.dirname(absolutePath);

    if (Array.isArray(manifest.profiles)) {
      manifest.profiles.forEach((profileEntry, index) => {
        if (!profileEntry || typeof profileEntry !== 'object') {
          throw new Error(`Manifest profile ${index} must be an object`);
        }

        const profilePersonId = registerPersonId((profileEntry as { personId?: unknown }).personId);
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

      const entryRecord = entry as { personId?: unknown; type?: unknown; file?: unknown };
      const resolvedPersonId = entryRecord.personId ?? fallbackPersonId;
      const normalizedPersonId = registerPersonId(resolvedPersonId);
      if (!normalizedPersonId) {
        throw new Error(`Manifest entry ${index} is missing personId`);
      }

      if (typeof entryRecord.type !== 'string' || !supportedEntryTypes.has(entryRecord.type)) {
        throw new Error(`Unsupported manifest entry type at index ${index}: ${entryRecord.type}`);
      }

      if (entryRecord.type === 'text' && typeof entryRecord.file === 'string' && entryRecord.file.trim().length > 0) {
        const resolvedFilePath = path.resolve(manifestDir, entryRecord.file);
        const relativeFilePath = path.relative(rootDir, resolvedFilePath);
        if (relativeFilePath && !relativeFilePath.startsWith('..')) {
          textFilePersonIds[relativeFilePath.split(path.sep).join('/')] = normalizedPersonId;
        }
      }
    });

    return {
      status: 'loaded',
      entryCount: entries.length,
      profileIds: [...profileIds].sort(),
      textFilePersonIds,
      error: null,
    };
  } catch (error) {
    return {
      status: 'invalid',
      entryCount: 0,
      profileIds: [],
      textFilePersonIds: {},
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

function buildFoundationPriority(foundation: any, coreFoundation: any, profiles: ProfileSummaryLike[] = []): WorkPriority {
  const maintenance = foundation?.maintenance ?? {};
  const coreMaintenance = coreFoundation?.maintenance ?? {};
  const coreOverview = coreFoundation?.overview ?? {};
  const queuedProfile = Array.isArray(maintenance.queuedProfiles) ? maintenance.queuedProfiles[0] : null;
  const queuedArea = Array.isArray(coreMaintenance.queuedAreas) ? coreMaintenance.queuedAreas[0] : null;
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

  return {
    id: 'foundation',
    label: 'Foundation',
    status,
    summary: `core ${coreOverview.readyAreaCount ?? 0}/${coreOverview.totalAreaCount ?? 0} ready; profiles ${refreshProfileCount} queued for refresh, ${incompleteProfileCount} incomplete`,
    nextAction: queuedProfile?.refreshCommand
      ? `refresh ${queuedProfile.label ?? queuedProfile.id ?? 'stale profiles'}`
      : queuedArea?.action ?? null,
    command: queuedProfile?.refreshCommand ?? null,
    paths: queuedProfile?.refreshCommand
      ? buildFoundationDraftPaths(queuedProfileSummary)
      : (Array.isArray(queuedArea?.paths) ? queuedArea.paths.filter((value: unknown): value is string => typeof value === 'string') : []),
  };
}

function buildIngestionPriority(ingestionSummary: any): WorkPriority {
  const importedProfileCount = ingestionSummary?.importedProfileCount ?? 0;
  const metadataOnlyProfileCount = ingestionSummary?.metadataOnlyProfileCount ?? 0;
  const refreshProfileCount = ingestionSummary?.refreshProfileCount ?? 0;
  const incompleteProfileCount = ingestionSummary?.incompleteProfileCount ?? 0;
  const status: WorkPriority['status'] = importedProfileCount > 0 && metadataOnlyProfileCount === 0 && refreshProfileCount === 0 && incompleteProfileCount === 0
    ? 'ready'
    : 'queued';

  let nextAction: string | null = null;
  let command: string | null = null;
  let paths: string[] = [];

  if ((ingestionSummary?.profileCount ?? 0) === 0) {
    const sampleStarterCommand = ingestionSummary?.sampleStarterCommand ?? null;
    const sampleManifestPath = typeof ingestionSummary?.sampleManifestPath === 'string' && ingestionSummary.sampleManifestPath.length > 0
      ? ingestionSummary.sampleManifestPath
      : null;
    const sampleTextPath = typeof ingestionSummary?.sampleTextPath === 'string' && ingestionSummary.sampleTextPath.length > 0
      ? ingestionSummary.sampleTextPath
      : null;

    if (sampleStarterCommand) {
      nextAction = 'import the checked-in sample target profile';
      command = sampleStarterCommand;
      paths = [sampleManifestPath, sampleTextPath]
        .filter((value): value is string => typeof value === 'string' && value.length > 0);
    } else {
      nextAction = 'bootstrap a target profile';
      command = ingestionSummary?.bootstrapProfileCommand ?? null;
      paths = [sampleManifestPath, sampleTextPath]
        .filter((value): value is string => typeof value === 'string' && value.length > 0);
    }
  } else if (refreshProfileCount > 0 || incompleteProfileCount > 0) {
    nextAction = 'refresh stale or incomplete target profiles';
    command = ingestionSummary?.staleRefreshCommand ?? null;
  } else if (metadataOnlyProfileCount > 0) {
    const metadataOnlyProfile = Array.isArray(ingestionSummary?.metadataProfileCommands)
      ? ingestionSummary.metadataProfileCommands.find((profile: any) => profile?.importMaterialCommand)
      : null;
    const runnableImportCommand = metadataOnlyProfile?.importMaterialCommand && !metadataOnlyProfile.importMaterialCommand.includes('<')
      ? metadataOnlyProfile.importMaterialCommand
      : null;
    const sampleTextPath = typeof ingestionSummary?.sampleTextPath === 'string' && ingestionSummary.sampleTextPath.length > 0
      ? ingestionSummary.sampleTextPath
      : null;
    const sampleTextPersonId = typeof ingestionSummary?.sampleTextPersonId === 'string' && ingestionSummary.sampleTextPersonId.length > 0
      ? ingestionSummary.sampleTextPersonId
      : null;

    if (runnableImportCommand) {
      nextAction = metadataOnlyProfile?.label
        ? `import source materials for ${metadataOnlyProfile.label}`
        : 'import source materials for metadata-only profiles';
      command = runnableImportCommand;
      paths = sampleTextPath && sampleTextPersonId === metadataOnlyProfile?.personId
        ? [sampleTextPath]
        : [];
    } else if (ingestionSummary?.sampleManifestCommand || ingestionSummary?.importManifestCommand) {
      nextAction = 'import source materials for metadata-only profiles';
      command = ingestionSummary?.sampleManifestCommand ?? ingestionSummary?.importManifestCommand ?? null;
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

function buildDeliveryPriority({
  id,
  label,
  pendingCount,
  configuredCount,
  queue,
  envTemplatePath = null,
}: {
  id: 'channels' | 'providers';
  label: 'Channels' | 'Providers';
  pendingCount: number;
  configuredCount: number;
  queue: QueueLike[];
  envTemplatePath?: string | null;
}): WorkPriority {
  const firstQueued = Array.isArray(queue) ? queue[0] : null;
  const paths = [
    envTemplatePath,
    typeof firstQueued?.manifestPath === 'string' && firstQueued.manifestPath.length > 0 ? firstQueued.manifestPath : null,
    typeof firstQueued?.implementationPath === 'string' && firstQueued.implementationPath.length > 0 ? firstQueued.implementationPath : null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  return {
    id,
    label,
    status: pendingCount > 0 ? 'queued' : 'ready',
    summary: `${pendingCount} pending, ${configuredCount} configured`,
    nextAction: firstQueued
      ? [firstQueued.setupHint, firstQueued.nextStep ? `next: ${firstQueued.nextStep}` : null].filter(Boolean).join('; ')
      : null,
    command: null,
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

  if (subcommand === 'manifest') {
    const result = ingestion.importManifest({
      manifestFile: typeof options.file === 'string' ? options.file : undefined,
      refreshFoundation: Boolean(options['refresh-foundation']),
    });

    return relativizeManifestImportResult(result);
  }

  if (subcommand === 'sample') {
    const sampleManifestRelativePath = detectSampleManifestRelativePath(rootDir);
    const sampleManifest = readSampleManifestSummary(rootDir, sampleManifestRelativePath);
    if (sampleManifest.status !== 'loaded' || !sampleManifestRelativePath) {
      throw new Error('No valid sample manifest found under samples/');
    }

    const result = ingestion.importManifest({
      manifestFile: sampleManifestRelativePath,
      refreshFoundation: true,
    });

    return relativizeManifestImportResult(result);
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
    throw new Error('Missing required --person argument');
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
  const channelManifest = manifestLoader.loadChannelManifestSummary();
  const providerManifest = manifestLoader.loadProviderManifestSummary();

  const voice = new VoiceProfile({
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
  const skills = new SkillRegistry(skillNames);
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
  const deliverySummary = {
    ...buildDeliverySummary(channelsSummary, modelsSummary, process.env, { rootDir }),
    envTemplatePath: envTemplateRelativePath,
    envTemplatePresent,
    envTemplateCommand: envTemplatePresent ? 'cp .env.example .env' : null,
  };
  const workLoop = new WorkLoop({
    intervalMinutes: 10,
    objectives: workLoopObjectives,
    priorities: [
      buildFoundationPriority(foundation, coreFoundation, profiles),
      buildIngestionPriority(ingestionSummary),
      buildDeliveryPriority({
        id: 'channels',
        label: 'Channels',
        pendingCount: deliverySummary.pendingChannelCount ?? 0,
        configuredCount: deliverySummary.configuredChannelCount ?? 0,
        queue: Array.isArray(deliverySummary.channelQueue) ? deliverySummary.channelQueue : [],
        envTemplatePath: deliverySummary.envTemplatePresent ? deliverySummary.envTemplatePath : null,
      }),
      buildDeliveryPriority({
        id: 'providers',
        label: 'Providers',
        pendingCount: deliverySummary.pendingProviderCount ?? 0,
        configuredCount: deliverySummary.configuredProviderCount ?? 0,
        queue: Array.isArray(deliverySummary.providerQueue) ? deliverySummary.providerQueue : [],
        envTemplatePath: deliverySummary.envTemplatePresent ? deliverySummary.envTemplatePath : null,
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
    promptPreview: prompt.buildPreview(4200),
  };
}

export function main(argv: string[] = process.argv.slice(2), rootDir: string = process.cwd()): void {
  const { command, subcommand, options } = parseArgs(argv);

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
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  main();
}

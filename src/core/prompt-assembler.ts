import { buildCoreFoundationCommand } from './foundation-core-commands.ts';

type MaterialTypes = Record<string, number>;

type ProfileMetadata = {
  displayName?: string;
  summary?: string;
};

type FoundationDraftStatus = {
  needsRefresh?: boolean;
  complete?: boolean;
  missingDrafts?: string[];
  refreshReasons?: string[];
  generatedAt?: string | null;
};

type ReadinessSignal = {
  candidateCount?: number;
  latestTypes?: string[];
  sampleSummaries?: string[];
  sampleTypes?: string[];
  sampleExcerpts?: string[];
};

type MemoryDraftSummary = {
  generated?: boolean;
  generatedAt?: string | null;
  latestMaterialAt?: string;
  latestMaterialId?: string;
  sourceCount?: number;
  materialTypes?: MaterialTypes;
  entryCount?: number;
  latestSummaries?: string[];
  [key: string]: unknown;
};

type HighlightDraftSummary = {
  generated?: boolean;
  generatedAt?: string | null;
  latestMaterialAt?: string;
  latestMaterialId?: string;
  sourceCount?: number;
  materialTypes?: MaterialTypes;
  highlights?: string[];
  [key: string]: unknown;
};

type FoundationDraftSummaries = {
  memory?: MemoryDraftSummary;
  voice?: HighlightDraftSummary;
  soul?: HighlightDraftSummary;
  skills?: HighlightDraftSummary;
};

type FoundationReadiness = {
  memory?: ReadinessSignal;
  voice?: ReadinessSignal;
  soul?: ReadinessSignal;
  skills?: ReadinessSignal;
};

type ProfileSnapshot = {
  id?: string;
  profile?: ProfileMetadata;
  materialCount?: number;
  materialTypes?: MaterialTypes;
  latestMaterialAt?: string;
  foundationDraftStatus?: FoundationDraftStatus;
  foundationDraftSummaries?: FoundationDraftSummaries;
  foundationReadiness?: FoundationReadiness;
};

type RollupSection = {
  profileCount?: number;
  generatedProfileCount?: number;
  repoStaleProfileCount?: number;
  totalEntries?: number;
  candidateProfileCount?: number;
  candidateCount?: number;
  highlights?: string[];
};

type MaintenanceQueueItem = {
  id?: string | null;
  displayName?: string | null;
  summary?: string | null;
  label?: string | null;
  status?: string;
  generatedDraftCount?: number;
  expectedDraftCount?: number;
  candidateDraftCount?: number;
  missingDrafts?: string[];
  refreshReasons?: string[];
  latestMaterialAt?: string | null;
  refreshCommand?: string | null;
};

type FoundationMaintenance = {
  profileCount?: number;
  readyProfileCount?: number;
  refreshProfileCount?: number;
  incompleteProfileCount?: number;
  refreshAllCommand?: string | null;
  staleRefreshCommand?: string | null;
  refreshBundleCommand?: string | null;
  helperCommands?: {
    refreshAll?: string | null;
    refreshStale?: string | null;
    refreshBundle?: string | null;
  };
  queuedProfiles?: MaintenanceQueueItem[];
};

type FoundationRollup = {
  maintenance?: FoundationMaintenance;
  memory?: RollupSection;
  voice?: RollupSection;
  soul?: RollupSection;
  skills?: RollupSection;
} | null;

type CoreDocumentFoundationSummary = {
  present?: boolean;
  path?: string;
  lineCount?: number;
  excerpt?: string | null;
};

type FoundationCoreOverview = {
  readyAreaCount?: number;
  totalAreaCount?: number;
  missingAreas?: string[];
  thinAreas?: string[];
  recommendedActions?: string[];
};

type FoundationCoreMaintenanceQueueItem = {
  area?: string;
  status?: 'ready' | 'thin' | 'missing' | string;
  summary?: string;
  action?: string | null;
  paths?: string[];
  command?: string | null;
};

type FoundationCoreMaintenance = {
  areaCount?: number;
  readyAreaCount?: number;
  missingAreaCount?: number;
  thinAreaCount?: number;
  helperCommands?: {
    scaffoldAll?: string | null;
    scaffoldMissing?: string | null;
    scaffoldThin?: string | null;
    memory?: string | null;
    skills?: string | null;
    soul?: string | null;
    voice?: string | null;
  };
  queuedAreas?: FoundationCoreMaintenanceQueueItem[];
};

type FoundationCore = {
  memory?: {
    hasRootDocument?: boolean;
    rootPath?: string;
    dailyCount?: number;
    longTermCount?: number;
    scratchCount?: number;
    totalEntries?: number;
    readyBucketCount?: number;
    totalBucketCount?: number;
    populatedBuckets?: string[];
    emptyBuckets?: string[];
    sampleEntries?: string[];
  };
  skills?: {
    count?: number;
    documentedCount?: number;
    undocumentedCount?: number;
    thinCount?: number;
    sample?: string[];
    samplePaths?: string[];
    sampleExcerpts?: string[];
    undocumentedSample?: string[];
    undocumentedPaths?: string[];
    thinSample?: string[];
    thinPaths?: string[];
  };
  soul?: CoreDocumentFoundationSummary;
  voice?: CoreDocumentFoundationSummary;
  overview?: FoundationCoreOverview;
  maintenance?: FoundationCoreMaintenance;
} | null;

type AgentSummary = {
  name?: string;
  soul?: string;
  identity?: Record<string, unknown>;
};

type VoiceSummary = {
  document?: string;
  [key: string]: unknown;
} | null;

type ChannelAuth = {
  type?: string | null;
  envVars?: string[];
};

type ChannelSummaryRecord = {
  id?: string;
  name?: string;
  status?: string;
  deliveryModes?: string[];
  inboundPath?: string | null;
  outboundMode?: string | null;
  implementationPath?: string | null;
  nextStep?: string | null;
  auth?: ChannelAuth | null;
};

type ChannelManifestSummary = {
  path?: string;
  status?: string;
  entryCount?: number;
  error?: string | null;
};

type ChannelsSummary = {
  channelCount?: number;
  activeCount?: number;
  plannedCount?: number;
  candidateCount?: number;
  authEnvVars?: string[];
  manifest?: ChannelManifestSummary;
  channels?: ChannelSummaryRecord[];
} | null;

type ModelSummaryRecord = {
  id?: string;
  name?: string;
  status?: string;
  defaultModel?: string | null;
  authEnvVar?: string | null;
  modalities?: string[];
  implementationPath?: string | null;
  nextStep?: string | null;
};

type ProviderManifestSummary = {
  path?: string;
  status?: string;
  entryCount?: number;
  error?: string | null;
};

type ModelsSummary = {
  providerCount?: number;
  activeCount?: number;
  plannedCount?: number;
  candidateCount?: number;
  multimodalProviderCount?: number;
  authEnvVars?: string[];
  manifest?: ProviderManifestSummary;
  providers?: ModelSummaryRecord[];
} | null;

type DeliveryQueueItem = {
  id?: string | null;
  name?: string | null;
  status?: string;
  authType?: string | null;
  authEnvVars?: string[];
  capabilities?: string[];
  deliveryModes?: string[];
  inboundPath?: string | null;
  outboundMode?: string | null;
  defaultModel?: string | null;
  authEnvVar?: string | null;
  models?: string[];
  features?: string[];
  modalities?: string[];
  implementationPath?: string | null;
  implementationPresent?: boolean;
  configured?: boolean;
  missingEnvVars?: string[];
  manifestPath?: string;
  setupHint?: string;
  nextStep?: string | null;
};

type DeliverySummary = {
  pendingChannelCount?: number;
  pendingProviderCount?: number;
  configuredChannelCount?: number;
  configuredProviderCount?: number;
  authBlockedChannelCount?: number;
  authBlockedProviderCount?: number;
  readyChannelScaffoldCount?: number;
  readyProviderScaffoldCount?: number;
  missingChannelScaffoldCount?: number;
  missingProviderScaffoldCount?: number;
  missingChannelEnvVars?: string[];
  missingProviderEnvVars?: string[];
  requiredEnvVars?: string[];
  channelManifestPath?: string;
  providerManifestPath?: string;
  envTemplatePath?: string | null;
  envTemplatePresent?: boolean;
  envTemplateCommand?: string | null;
  envTemplateVarNames?: string[];
  envTemplateMissingRequiredVars?: string[];
  helperCommands?: {
    bootstrapEnv?: string | null;
    scaffoldChannelManifest?: string | null;
    scaffoldProviderManifest?: string | null;
    scaffoldChannelImplementation?: string | null;
    scaffoldChannelImplementationBundle?: string | null;
    scaffoldProviderImplementation?: string | null;
    scaffoldProviderImplementationBundle?: string | null;
  };
  channelQueue?: DeliveryQueueItem[];
  providerQueue?: DeliveryQueueItem[];
} | null;

type IngestionProfileCommand = {
  personId?: string | null;
  displayName?: string | null;
  label?: string | null;
  materialCount?: number;
  materialTypes?: MaterialTypes;
  latestMaterialAt?: string | null;
  needsRefresh?: boolean;
  missingDrafts?: string[];
  updateProfileCommand?: string | null;
  updateProfileAndRefreshCommand?: string | null;
  updateIntakeCommand?: string | null;
  importIntakeCommand?: string | null;
  intakeReady?: boolean;
  intakeCompletion?: 'ready' | 'partial' | 'missing' | string;
  intakeStatusSummary?: string | null;
  intakePaths?: string[];
  intakeMissingPaths?: string[];
  refreshFoundationCommand?: string | null;
  importManifestCommand?: string | null;
  importCommands?: {
    text?: string | null;
    message?: string | null;
    talk?: string | null;
    screenshot?: string | null;
  };
  importMaterialCommand?: string | null;
};

type IngestionHelperCommands = {
  bootstrap?: string | null;
  scaffoldAll?: string | null;
  scaffoldStale?: string | null;
  scaffoldBundle?: string | null;
  importManifest?: string | null;
  importManifestAndRefresh?: string | null;
  importIntakeAll?: string | null;
  importIntakeStale?: string | null;
  importIntakeBundle?: string | null;
  refreshAllFoundation?: string | null;
  refreshStaleFoundation?: string | null;
  refreshFoundationBundle?: string | null;
  sampleStarter?: string | null;
  sampleManifest?: string | null;
  sampleText?: string | null;
  sampleMessage?: string | null;
  sampleTalk?: string | null;
  sampleScreenshot?: string | null;
  updateProfileAndRefresh?: string | null;
};

type IngestionSummary = {
  profileCount?: number;
  importedProfileCount?: number;
  metadataOnlyProfileCount?: number;
  readyProfileCount?: number;
  refreshProfileCount?: number;
  incompleteProfileCount?: number;
  intakeReadyProfileCount?: number;
  intakePartialProfileCount?: number;
  intakeMissingProfileCount?: number;
  intakeScaffoldProfileCount?: number;
  supportedImportTypes?: string[];
  bootstrapProfileCommand?: string | null;
  sampleImportCommand?: string | null;
  importManifestCommand?: string | null;
  importManifestAndRefreshCommand?: string | null;
  refreshAllFoundationCommand?: string | null;
  sampleManifestPath?: string | null;
  sampleManifestPresent?: boolean;
  sampleManifestStatus?: 'loaded' | 'missing' | 'invalid' | string;
  sampleManifestEntryCount?: number;
  sampleManifestProfileIds?: string[];
  sampleManifestProfileLabels?: string[];
  sampleManifestFilePaths?: string[];
  sampleManifestMaterialTypes?: MaterialTypes;
  sampleManifestError?: string | null;
  sampleStarterCommand?: string | null;
  sampleStarterSource?: string | null;
  sampleStarterLabel?: string | null;
  sampleManifestCommand?: string | null;
  sampleTextPath?: string | null;
  sampleTextPresent?: boolean;
  sampleTextPersonId?: string | null;
  sampleTextCommand?: string | null;
  sampleFileCommands?: Array<{
    type?: 'text' | 'screenshot' | string;
    path?: string | null;
    personId?: string | null;
    sourcePath?: string | null;
    command?: string | null;
  }>;
  sampleInlineCommands?: Array<{
    type?: 'message' | 'talk' | string;
    text?: string | null;
    personId?: string | null;
    sourcePath?: string | null;
    command?: string | null;
  }>;
  staleRefreshCommand?: string | null;
  refreshFoundationBundleCommand?: string | null;
  helperCommands?: IngestionHelperCommands;
  profileCommands?: IngestionProfileCommand[];
  allProfileCommands?: IngestionProfileCommand[];
  metadataProfileCommands?: IngestionProfileCommand[];
} | null;

type WorkLoopPriority = {
  id?: string;
  label?: string;
  status?: 'ready' | 'queued' | string;
  summary?: string;
  nextAction?: string | null;
  command?: string | null;
  paths?: string[];
};

type WorkLoopSummary = {
  intervalMinutes?: number;
  objectiveCount?: number;
  objectives?: string[];
  priorityCount?: number;
  readyPriorityCount?: number;
  queuedPriorityCount?: number;
  currentPriority?: WorkLoopPriority | null;
  priorities?: WorkLoopPriority[];
} | null;

export interface PromptAssemblerOptions {
  profile: AgentSummary;
  soul?: string;
  voice: VoiceSummary;
  memory: unknown;
  skills: unknown;
  channels: ChannelsSummary;
  models: ModelsSummary;
  delivery?: DeliverySummary;
  profiles?: ProfileSnapshot[];
  foundationRollup?: FoundationRollup;
  foundationCore?: FoundationCore;
  ingestion?: IngestionSummary;
  workLoop?: WorkLoopSummary;
}

function formatMaterialCount(count: number) {
  return `${count} material${count === 1 ? '' : 's'}`;
}

function formatMaterialTypes(materialTypes: MaterialTypes = {}) {
  const entries = Object.entries(materialTypes).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return 'no typed materials';
  }

  return entries.map(([type, count]) => `${type}:${count}`).join(', ');
}

function formatDraftStatus(status: FoundationDraftStatus = {}) {
  const freshness = status.needsRefresh ? 'stale' : 'fresh';
  const completeness = status.complete ? 'complete' : `missing ${(status.missingDrafts ?? []).join('/') || 'drafts'}`;
  const generatedAt = status.generatedAt ? `, generated ${status.generatedAt}` : '';
  return `${freshness}, ${completeness}${generatedAt}`;
}

function cleanHighlight(value: string) {
  return value.replace(/^[-\s]*/, '').trim();
}

function formatProfileSnapshot(profile: ProfileSnapshot = {}) {
  const displayName = profile.profile?.displayName;
  const profileId = profile.id ?? 'unknown-profile';
  const profileLabel = displayName && displayName !== profileId ? `${displayName} (${profileId})` : (displayName ?? profileId);
  const lines = [
    `- ${profileLabel}: ${formatMaterialCount(profile.materialCount ?? 0)} (${formatMaterialTypes(profile.materialTypes)})`,
  ];

  if (profile.latestMaterialAt) {
    lines.push(`  latest material: ${profile.latestMaterialAt}`);
  }

  if (profile.profile?.summary) {
    lines.push(`  profile summary: ${profile.profile.summary}`);
  }

  if (profile.foundationDraftStatus) {
    lines.push(`  drafts: ${formatDraftStatus(profile.foundationDraftStatus)}`);
  }

  if (profile.foundationReadiness) {
    lines.push(
      `  memory candidates: ${profile.foundationReadiness.memory?.candidateCount ?? 0} | voice: ${profile.foundationReadiness.voice?.candidateCount ?? 0} | soul: ${profile.foundationReadiness.soul?.candidateCount ?? 0} | skills: ${profile.foundationReadiness.skills?.candidateCount ?? 0}`,
    );
  }

  const memoryHighlights = profile.foundationDraftSummaries?.memory?.latestSummaries?.length
    ? profile.foundationDraftSummaries.memory.latestSummaries
    : (profile.foundationReadiness?.memory?.sampleSummaries ?? []);
  if (memoryHighlights.length > 0) {
    lines.push(`  memory highlights: ${memoryHighlights.join(' | ')}`);
  }

  const voiceHighlights = (profile.foundationDraftSummaries?.voice?.highlights ?? []).map(cleanHighlight).filter(Boolean);
  const voiceSnapshotHighlights = voiceHighlights.length > 0
    ? voiceHighlights
    : (profile.foundationReadiness?.voice?.sampleExcerpts ?? []);
  if (voiceSnapshotHighlights.length > 0) {
    lines.push(`  voice highlights: ${voiceSnapshotHighlights.join(' | ')}`);
  }

  const soulHighlights = (profile.foundationDraftSummaries?.soul?.highlights ?? []).map(cleanHighlight).filter(Boolean);
  const soulSnapshotHighlights = soulHighlights.length > 0
    ? soulHighlights
    : (profile.foundationReadiness?.soul?.sampleExcerpts ?? []);
  if (soulSnapshotHighlights.length > 0) {
    lines.push(`  soul highlights: ${soulSnapshotHighlights.join(' | ')}`);
  }

  const generatedSkillSignals = (profile.foundationDraftSummaries?.skills?.highlights ?? [])
    .map(cleanHighlight)
    .filter((value) => value && !value.startsWith('sample:'));
  const skillSignals = generatedSkillSignals.length > 0
    ? generatedSkillSignals
    : (profile.foundationReadiness?.skills?.sampleExcerpts ?? []);
  if (skillSignals.length > 0) {
    lines.push(`  skills signals: ${skillSignals.join(' | ')}`);
  }

  return lines.join('\n');
}

function buildProfileSnapshots(profiles: ProfileSnapshot[] = []) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return null;
  }

  return profiles.map((profile) => formatProfileSnapshot(profile)).join('\n');
}

function sanitizeProfilesForPrompt(profiles: ProfileSnapshot[] = []) {
  return profiles.map((profile) => ({
    ...profile,
    foundationDraftSummaries: profile.foundationDraftSummaries
      ? {
          ...profile.foundationDraftSummaries,
          skills: profile.foundationDraftSummaries.skills
            ? {
                ...profile.foundationDraftSummaries.skills,
                highlights: (profile.foundationDraftSummaries.skills.highlights ?? [])
                  .map(cleanHighlight)
                  .filter((value) => value && !value.startsWith('sample:')),
              }
            : profile.foundationDraftSummaries.skills,
        }
      : profile.foundationDraftSummaries,
  }));
}

function formatFoundationHighlights(highlights: string[] = []) {
  return highlights.length > 0 ? highlights.join(' | ') : 'none yet';
}

function buildFoundationMaintenanceBlock(foundationRollup: FoundationRollup = null) {
  const maintenance = foundationRollup?.maintenance;
  if (!maintenance || (maintenance.profileCount ?? 0) === 0) {
    return null;
  }

  const queuedProfiles = maintenance.queuedProfiles ?? [];
  const helperLine = [
    maintenance.helperCommands?.refreshAll ? `refresh-all ${maintenance.helperCommands.refreshAll}` : null,
    maintenance.helperCommands?.refreshStale ? `refresh-stale ${maintenance.helperCommands.refreshStale}` : null,
    maintenance.helperCommands?.refreshBundle ? `refresh-bundle ${maintenance.helperCommands.refreshBundle}` : null,
  ].filter(Boolean).join(' | ');

  return [
    `- ${maintenance.readyProfileCount ?? 0} ready, ${maintenance.refreshProfileCount ?? 0} queued for refresh, ${maintenance.incompleteProfileCount ?? 0} incomplete`,
    helperLine ? `- helpers: ${helperLine}` : null,
    maintenance.staleRefreshCommand ? `- refresh command: ${maintenance.staleRefreshCommand}` : null,
    ...queuedProfiles.map((profile) => {
      const reasonSuffix = (profile.refreshReasons ?? []).length > 0
        ? `, reasons ${(profile.refreshReasons ?? []).join(' + ')}`
        : '';
      const coverageSuffix = Number.isFinite(profile.generatedDraftCount) && Number.isFinite(profile.expectedDraftCount)
        ? `, ${profile.generatedDraftCount}/${profile.expectedDraftCount} drafts generated`
        : '';
      return `- ${profile.label ?? profile.id}: ${profile.status}${coverageSuffix}${(profile.missingDrafts ?? []).length > 0 ? `, missing ${profile.missingDrafts?.join('/')}` : ''}${reasonSuffix}`;
    }),
  ].filter(Boolean).join('\n');
}

function buildFoundationRollupBlock(foundationRollup: FoundationRollup = null) {
  const memory = foundationRollup?.memory;
  const voice = foundationRollup?.voice;
  const soul = foundationRollup?.soul;
  const skills = foundationRollup?.skills;

  if (!memory && !voice && !soul && !skills) {
    return null;
  }

  const totalProfiles = [
    memory?.profileCount,
    voice?.profileCount,
    soul?.profileCount,
    skills?.profileCount,
  ]
    .filter((value): value is number => Number.isFinite(value))
    .reduce((maxValue, value) => Math.max(maxValue, value), 0);

  if (totalProfiles === 0) {
    return null;
  }

  return [
    memory
      ? `- memory: ${memory.generatedProfileCount}/${memory.profileCount} generated, ${memory.repoStaleProfileCount} repo-stale profiles, ${memory.totalEntries} entries, highlights: ${formatFoundationHighlights(memory.highlights)}`
      : null,
    voice
      ? `- voice: ${voice.generatedProfileCount}/${voice.profileCount} generated, ${voice.candidateProfileCount} candidate profiles, highlights: ${formatFoundationHighlights(voice.highlights)}`
      : null,
    soul
      ? `- soul: ${soul.generatedProfileCount}/${soul.profileCount} generated, ${soul.candidateProfileCount} candidate profiles, highlights: ${formatFoundationHighlights(soul.highlights)}`
      : null,
    skills
      ? `- skills: ${skills.generatedProfileCount}/${skills.profileCount} generated, ${skills.candidateCount} candidates, highlights: ${formatFoundationHighlights(skills.highlights)}`
      : null,
  ].filter(Boolean).join('\n');
}

function formatChannelAuth(auth: ChannelAuth | null | undefined) {
  if (!auth?.type) {
    return 'no auth';
  }

  const envVars = (auth.envVars ?? []).filter(Boolean);
  return envVars.length > 0 ? `${auth.type}: ${envVars.join(', ')}` : auth.type;
}

function formatChannelFlow(channel: {
  deliveryModes?: string[];
  outboundMode?: string | null;
  inboundPath?: string | null;
}) {
  const deliveryModes = (channel.deliveryModes ?? []).join('/') || 'unspecified';
  const outboundMode = typeof channel.outboundMode === 'string' && channel.outboundMode.length > 0
    ? ` -> ${channel.outboundMode}`
    : '';
  const inboundPath = typeof channel.inboundPath === 'string' && channel.inboundPath.length > 0
    ? ` @ ${channel.inboundPath}`
    : '';

  return `${deliveryModes}${outboundMode}${inboundPath}`;
}

function formatManifestSummary(label: string, manifest: ChannelManifestSummary | ProviderManifestSummary | undefined) {
  if (!manifest?.path) {
    return null;
  }

  if (manifest.status === 'loaded') {
    return `- ${label}: loaded ${manifest.entryCount ?? 0} entr${manifest.entryCount === 1 ? 'y' : 'ies'} from ${manifest.path}`;
  }

  if (manifest.status === 'invalid') {
    return `- ${label}: invalid (${manifest.error ?? 'parse failed'}) at ${manifest.path}`;
  }

  return `- ${label}: missing (${manifest.path})`;
}

function buildDeliveryFoundationBlock(channels: ChannelsSummary = null, models: ModelsSummary = null, delivery: DeliverySummary = null) {
  const channelRecords = channels?.channels ?? [];
  const providerRecords = models?.providers ?? [];
  const channelRecordsById = new Map(channelRecords
    .filter((channel) => channel?.id)
    .map((channel) => [channel.id, channel]));
  const helperCommands = delivery?.helperCommands ?? {};
  const helperLine = [
    helperCommands.bootstrapEnv ? `env ${helperCommands.bootstrapEnv}` : null,
    helperCommands.scaffoldChannelManifest ? `channels ${helperCommands.scaffoldChannelManifest}` : null,
    helperCommands.scaffoldProviderManifest ? `providers ${helperCommands.scaffoldProviderManifest}` : null,
    helperCommands.scaffoldChannelImplementation ? `channel impl ${helperCommands.scaffoldChannelImplementation}` : null,
    helperCommands.scaffoldChannelImplementationBundle
      && helperCommands.scaffoldChannelImplementationBundle !== helperCommands.scaffoldChannelImplementation
      ? `channel impl-all ${helperCommands.scaffoldChannelImplementationBundle}`
      : null,
    helperCommands.scaffoldProviderImplementation ? `provider impl ${helperCommands.scaffoldProviderImplementation}` : null,
    helperCommands.scaffoldProviderImplementationBundle
      && helperCommands.scaffoldProviderImplementationBundle !== helperCommands.scaffoldProviderImplementation
      ? `provider impl-all ${helperCommands.scaffoldProviderImplementationBundle}`
      : null,
  ].filter(Boolean).join(' | ');
  const channelManifestSummary = formatManifestSummary('channel manifest', channels?.manifest);
  const providerManifestSummary = formatManifestSummary('provider manifest', models?.manifest);

  const channelQueue = delivery?.channelQueue ?? channelRecords
    .filter((channel) => channel?.status !== 'active')
    .map((channel) => ({
      name: channel.name ?? channel.id,
      id: channel.id,
      status: channel.status ?? 'unknown',
      deliveryModes: channel.deliveryModes ?? [],
      inboundPath: channel.inboundPath ?? null,
      outboundMode: channel.outboundMode ?? null,
      implementationPath: channel.implementationPath ?? null,
      implementationPresent: false,
      setupHint: (channel.auth?.envVars ?? []).length > 0
        ? `set ${(channel.auth?.envVars ?? []).join(', ')}`
        : 'define channel credentials',
      nextStep: channel.nextStep ?? null,
    }));
  const enrichedChannelQueue = channelQueue.map((channel) => {
    const registryRecord = channel.id ? channelRecordsById.get(channel.id) : null;
    return {
      ...channel,
      inboundPath: channel.inboundPath ?? registryRecord?.inboundPath ?? null,
      outboundMode: channel.outboundMode ?? registryRecord?.outboundMode ?? null,
      deliveryModes: (channel.deliveryModes ?? []).length > 0 ? channel.deliveryModes : (registryRecord?.deliveryModes ?? []),
    };
  });
  const providerQueue = delivery?.providerQueue ?? providerRecords
    .filter((provider) => provider?.status !== 'active')
    .map((provider) => ({
      name: provider.name ?? provider.id,
      id: provider.id,
      status: provider.status ?? 'unknown',
      modalities: provider.modalities ?? [],
      implementationPath: provider.implementationPath ?? null,
      implementationPresent: false,
      setupHint: provider.authEnvVar && provider.defaultModel
        ? `set ${provider.authEnvVar} for ${provider.defaultModel}`
        : provider.authEnvVar
          ? `set ${provider.authEnvVar}`
          : provider.defaultModel
            ? `choose auth for ${provider.defaultModel}`
            : 'choose auth and default model',
      nextStep: provider.nextStep ?? null,
    }));
  if (channelRecords.length === 0 && providerRecords.length === 0 && !channelManifestSummary && !providerManifestSummary && enrichedChannelQueue.length === 0 && providerQueue.length === 0) {
    return null;
  }

  const activeChannelCount = channels?.activeCount ?? channelRecords.filter((channel) => channel.status === 'active').length;
  const plannedChannelCount = channels?.plannedCount ?? channelRecords.filter((channel) => channel.status === 'planned').length;
  const candidateChannelCount = channels?.candidateCount ?? channelRecords.filter((channel) => channel.status === 'candidate').length;
  const activeProviderCount = models?.activeCount ?? providerRecords.filter((provider) => provider.status === 'active').length;
  const plannedProviderCount = models?.plannedCount ?? providerRecords.filter((provider) => provider.status === 'planned').length;
  const candidateProviderCount = models?.candidateCount ?? providerRecords.filter((provider) => provider.status === 'candidate').length;
  const visibleChannelQueue = enrichedChannelQueue.slice(0, 1);
  const remainingChannelQueue = enrichedChannelQueue.slice(1);
  const remainingChannelQueueSummary = remainingChannelQueue.length > 0
    ? `- +${remainingChannelQueue.length} more queued channel${remainingChannelQueue.length === 1 ? '' : 's'}: ${remainingChannelQueue.map((channel) => channel.name ?? channel.id ?? 'unknown-channel').join(', ')}`
    : null;
  const visibleProviderQueue = providerQueue.slice(0, 1);
  const remainingProviderQueue = providerQueue.slice(1);
  const remainingProviderQueueSummary = remainingProviderQueue.length > 0
    ? `- +${remainingProviderQueue.length} more queued provider${remainingProviderQueue.length === 1 ? '' : 's'}: ${remainingProviderQueue.map((provider) => provider.name ?? provider.id ?? 'unknown-provider').join(', ')}`
    : null;
  const envTemplateVarCount = (delivery?.envTemplateVarNames ?? []).length;
  const missingTemplateVars = (delivery?.envTemplateMissingRequiredVars ?? []).filter(Boolean);
  const requiredEnvVars = (delivery?.requiredEnvVars ?? []).filter(Boolean);
  const coveredRequiredEnvVarCount = requiredEnvVars.filter((envVar, index, values) => values.indexOf(envVar) === index && (delivery?.envTemplateVarNames ?? []).includes(envVar)).length;
  const requiredEnvVarCount = requiredEnvVars.length;
  const envTemplateCoverageSuffix = requiredEnvVarCount > 0
    ? ` (${coveredRequiredEnvVarCount}/${requiredEnvVarCount} required vars${missingTemplateVars.length > 0 ? `; missing ${missingTemplateVars.join(', ')}` : ''})`
    : envTemplateVarCount > 0
      ? ` (${envTemplateVarCount} vars)`
      : '';

  return [
    channelManifestSummary,
    channelRecords.length > 0
      ? `- channels: ${channelRecords.length} total (${activeChannelCount} active, ${plannedChannelCount} planned, ${candidateChannelCount} candidate)`
      : null,
    (delivery?.envTemplatePresent && delivery.envTemplatePath)
      ? `- env template: ${delivery.envTemplatePath}${envTemplateCoverageSuffix}`
      : null,
    delivery?.helperCommands?.bootstrapEnv
      ? `- env bootstrap: ${delivery.helperCommands.bootstrapEnv}`
      : null,
    helperLine ? `- helpers: ${helperLine}` : null,
    (delivery?.readyChannelScaffoldCount !== undefined || delivery?.readyProviderScaffoldCount !== undefined)
      ? `- code scaffolds: ${delivery?.readyChannelScaffoldCount ?? 0}/${channelRecords.length} channels, ${delivery?.readyProviderScaffoldCount ?? 0}/${providerRecords.length} providers present`
      : null,
    (delivery?.configuredChannelCount !== undefined || delivery?.configuredProviderCount !== undefined)
      ? `- auth readiness: ${delivery?.configuredChannelCount ?? 0}/${channelQueue.length} channels configured, ${delivery?.configuredProviderCount ?? 0}/${providerQueue.length} providers configured`
      : null,
    ...channelRecords.slice(0, 2).map((channel) =>
      `- ${channel.name ?? channel.id} via ${formatChannelFlow(channel)} [${formatChannelAuth(channel.auth)}]`,
    ),
    enrichedChannelQueue.length > 0
      ? `- channel queue: ${delivery?.pendingChannelCount ?? enrichedChannelQueue.length} pending${typeof delivery?.authBlockedChannelCount === 'number' ? ` (${delivery.authBlockedChannelCount} auth-blocked)` : ''} via ${delivery?.channelManifestPath ?? channels?.manifest?.path ?? 'manifests/channels.json'}`
      : null,
    ...visibleChannelQueue.map((channel) => {
      const authDetails = [
        channel.authType ?? null,
        (channel.capabilities ?? []).length > 0 ? `caps ${(channel.capabilities ?? []).join(', ')}` : null,
      ].filter(Boolean).join('; ');
      const flow = ((channel.deliveryModes ?? []).length > 0 || channel.outboundMode || channel.inboundPath)
        ? ` via ${formatChannelFlow(channel)}`
        : '';
      return `- ${channel.name ?? channel.id} [${channel.status ?? 'unknown'}${channel.configured ? ', configured' : ''}]: ${channel.setupHint ?? 'define channel credentials'}${channel.nextStep ? `; next: ${channel.nextStep}` : ''}${flow}${authDetails ? ` [${authDetails}]` : ''}${channel.implementationPath ? ` @ ${channel.implementationPath}` : ''}`;
    }),
    remainingChannelQueueSummary,
    providerManifestSummary,
    providerRecords.length > 0
      ? `- models: ${providerRecords.length} total (${activeProviderCount} active, ${plannedProviderCount} planned, ${candidateProviderCount} candidate)`
      : null,
    ...providerRecords.slice(0, 2).map((provider) => {
      const modalities = (provider.modalities ?? []).join(', ');
      return `- ${provider.name ?? provider.id} default ${provider.defaultModel ?? 'unspecified'} [${provider.authEnvVar ?? 'no auth env'}] {${modalities}}`;
    }),
    providerQueue.length > 0
      ? `- provider queue: ${delivery?.pendingProviderCount ?? providerQueue.length} pending${typeof delivery?.authBlockedProviderCount === 'number' ? ` (${delivery.authBlockedProviderCount} auth-blocked)` : ''} via ${delivery?.providerManifestPath ?? models?.manifest?.path ?? 'manifests/providers.json'}`
      : null,
    ...visibleProviderQueue.map((provider) => {
      const providerDetails = [
        (provider.features ?? []).length > 0 ? `features: ${(provider.features ?? []).join(', ')}` : null,
        (provider.models ?? []).length > 0 ? `models: ${(provider.models ?? []).join(', ')}` : null,
      ].filter(Boolean).join('; ');
      return `- ${provider.name ?? provider.id} [${provider.status ?? 'unknown'}${provider.configured ? ', configured' : ''}]: ${provider.setupHint ?? 'choose auth and default model'}${provider.nextStep ? `; next: ${provider.nextStep}` : ''}${(provider.modalities ?? []).length > 0 ? ` {${(provider.modalities ?? []).join(', ')}}` : ''}${providerDetails ? ` [${providerDetails}]` : ''}${provider.implementationPath ? ` @ ${provider.implementationPath}` : ''}`;
    }),
    remainingProviderQueueSummary,
  ].filter(Boolean).join('\n');
}

function buildIngestionEntranceBlock(ingestion: IngestionSummary = null) {
  const helperCommands = ingestion?.helperCommands ?? {};
  const sampleTextSourcePath = (ingestion?.sampleFileCommands ?? []).find(
    (entry) => entry?.type === 'text' && entry?.command === ingestion?.sampleTextCommand,
  )?.sourcePath ?? null;
  const hasProfileData = (ingestion?.profileCount ?? 0) > 0;
  const hasBootstrapData = Boolean(
    ingestion?.bootstrapProfileCommand
      || helperCommands.bootstrap
      || ingestion?.sampleImportCommand
      || ingestion?.importManifestCommand
      || ingestion?.importManifestAndRefreshCommand
      || helperCommands.importManifest
      || helperCommands.importManifestAndRefresh
      || ingestion?.sampleManifestCommand
      || ingestion?.sampleTextCommand
      || ingestion?.refreshAllFoundationCommand
      || ingestion?.staleRefreshCommand
      || helperCommands.scaffoldStale
      || helperCommands.importIntakeStale
      || helperCommands.refreshAllFoundation
      || helperCommands.refreshStaleFoundation
      || helperCommands.refreshFoundationBundle
      || (ingestion?.supportedImportTypes?.length ?? 0) > 0,
  );

  if (!ingestion || (!hasProfileData && !hasBootstrapData)) {
    return null;
  }

  const profileCommandRecords = (ingestion.allProfileCommands?.length ?? 0) > 0
    ? (ingestion.allProfileCommands ?? [])
    : (ingestion.profileCommands ?? []);
  const visibleProfileCommands = profileCommandRecords.slice(0, 2);
  const remainingProfileCommands = profileCommandRecords.slice(2);
  const remainingProfileSummary = remainingProfileCommands.length > 0
    ? `- +${remainingProfileCommands.length} more profile${remainingProfileCommands.length === 1 ? '' : 's'}: ${remainingProfileCommands.map((profile) => profile?.label ?? profile?.personId ?? 'unknown-profile').join(', ')}`
    : null;

  return [
    `- profiles: ${ingestion.profileCount ?? 0} total (${ingestion.importedProfileCount ?? 0} imported, ${ingestion.metadataOnlyProfileCount ?? 0} metadata-only)`,
    `- drafts: ${ingestion.readyProfileCount ?? 0} ready, ${ingestion.refreshProfileCount ?? 0} queued for refresh, ${ingestion.incompleteProfileCount ?? 0} incomplete`,
    `- intake scaffolds: ${ingestion.intakeReadyProfileCount ?? 0} ready, ${ingestion.intakePartialProfileCount ?? 0} partial, ${ingestion.intakeMissingProfileCount ?? 0} missing`,
    (ingestion.supportedImportTypes ?? []).length > 0
      ? `- imports: ${(ingestion.supportedImportTypes ?? []).join(', ')}`
      : null,
    ingestion.bootstrapProfileCommand
      ? `- bootstrap: ${ingestion.bootstrapProfileCommand}`
      : null,
    (() => {
      const helperEntries: string[] = [];
      const pushHelperEntry = (entry: string | null | undefined) => {
        if (entry && !helperEntries.includes(entry)) {
          helperEntries.push(entry);
        }
      };

      pushHelperEntry(helperCommands.scaffoldAll ? `scaffold-all ${helperCommands.scaffoldAll}` : null);
      pushHelperEntry(helperCommands.scaffoldStale ? `scaffold-stale ${helperCommands.scaffoldStale}` : null);
      pushHelperEntry(helperCommands.scaffoldBundle ? `scaffold-bundle ${helperCommands.scaffoldBundle}` : null);
      pushHelperEntry(helperCommands.importManifest ? `manifest ${helperCommands.importManifest}` : null);
      pushHelperEntry(helperCommands.importManifestAndRefresh ? `manifest+refresh ${helperCommands.importManifestAndRefresh}` : null);
      pushHelperEntry(helperCommands.importIntakeAll ? `import-all ${helperCommands.importIntakeAll}` : null);
      pushHelperEntry(helperCommands.importIntakeStale ? `import-stale ${helperCommands.importIntakeStale}` : null);
      pushHelperEntry(helperCommands.importIntakeBundle ? `import-bundle ${helperCommands.importIntakeBundle}` : null);
      pushHelperEntry(helperCommands.refreshAllFoundation ? `refresh-all ${helperCommands.refreshAllFoundation}` : null);
      pushHelperEntry(helperCommands.refreshStaleFoundation ? `refresh ${helperCommands.refreshStaleFoundation}` : null);
      pushHelperEntry(helperCommands.refreshFoundationBundle ? `refresh-bundle ${helperCommands.refreshFoundationBundle}` : null);
      pushHelperEntry(helperCommands.sampleStarter ? `sample ${helperCommands.sampleStarter}` : null);
      pushHelperEntry(helperCommands.sampleManifest ? `sample-manifest ${helperCommands.sampleManifest}` : null);
      pushHelperEntry(helperCommands.sampleText ? `sample-text ${helperCommands.sampleText}` : null);
      pushHelperEntry(helperCommands.sampleMessage ? `sample-message ${helperCommands.sampleMessage}` : null);
      pushHelperEntry(helperCommands.sampleTalk ? `sample-talk ${helperCommands.sampleTalk}` : null);
      pushHelperEntry(helperCommands.sampleScreenshot ? `sample-screenshot ${helperCommands.sampleScreenshot}` : null);

      (ingestion.sampleFileCommands ?? [])
        .filter((entry) => {
          if (!entry?.command || !entry?.type) {
            return false;
          }

          if (entry.type !== 'text') {
            return true;
          }

          return entry.command !== ingestion.sampleTextCommand;
        })
        .forEach((entry) => pushHelperEntry(`sample-${entry.type} ${entry.command}`));
      (ingestion.sampleInlineCommands ?? [])
        .filter((entry) => entry?.command && entry?.type)
        .forEach((entry) => pushHelperEntry(`sample-${entry.type} ${entry.command}`));

      return helperEntries.length > 0
        ? `- helpers: ${helperEntries.join(' | ')}`
        : null;
    })(),
    (ingestion.importManifestCommand || ingestion.importManifestAndRefreshCommand || ingestion.refreshAllFoundationCommand || ingestion.staleRefreshCommand)
      ? `- commands: ${[
        ingestion.importManifestCommand,
        ingestion.importManifestAndRefreshCommand,
        ingestion.refreshAllFoundationCommand,
        ingestion.staleRefreshCommand,
      ].filter(Boolean).join(' | ')}`
      : null,
    ingestion.sampleImportCommand
      ? `- sample import: ${ingestion.sampleImportCommand}`
      : null,
    ingestion.sampleStarterCommand
      ? `- starter: ${ingestion.sampleStarterCommand}${ingestion.sampleStarterSource ? ` [${ingestion.sampleStarterSource}]` : ''}${ingestion.sampleStarterLabel ? ` for ${ingestion.sampleStarterLabel}` : ''}`
      : null,
    ingestion.sampleManifestPresent && ingestion.sampleManifestCommand
      ? `- sample manifest: ${(ingestion.sampleManifestEntryCount ?? 0)} entr${(ingestion.sampleManifestEntryCount ?? 0) === 1 ? 'y' : 'ies'}${((ingestion.sampleManifestProfileLabels ?? []).length > 0 ? ingestion.sampleManifestProfileLabels : (ingestion.sampleManifestProfileIds ?? [])).length > 0 ? ` for ${((ingestion.sampleManifestProfileLabels ?? []).length > 0 ? ingestion.sampleManifestProfileLabels : (ingestion.sampleManifestProfileIds ?? [])).join(', ')}` : ''}${Object.keys(ingestion.sampleManifestMaterialTypes ?? {}).length > 0 ? ` (${formatMaterialTypes(ingestion.sampleManifestMaterialTypes)})` : ''} -> ${ingestion.sampleManifestCommand}`
      : null,
    ingestion.sampleTextPresent && ingestion.sampleTextCommand
      ? `- sample text: ${ingestion.sampleTextPersonId ?? 'sample-profile'} -> ${ingestion.sampleTextCommand}${sampleTextSourcePath ? ` @ ${sampleTextSourcePath}` : ''}`
      : null,
    ...((ingestion.sampleFileCommands ?? [])
      .filter((entry) => {
        if (!entry?.command || !entry?.type) {
          return false;
        }

        if (entry.type !== 'text') {
          return true;
        }

        return entry.command !== ingestion.sampleTextCommand;
      })
      .map((entry) => `- sample ${entry.type}: ${entry.personId ?? 'sample-profile'} -> ${entry.command}${entry.sourcePath ? ` @ ${entry.sourcePath}` : ''}`)),
    ...((ingestion.sampleInlineCommands ?? [])
      .filter((entry) => entry?.command && entry?.type)
      .map((entry) => `- sample ${entry.type}: ${entry.personId ?? 'sample-profile'} -> ${entry.command}${entry.sourcePath ? ` @ ${entry.sourcePath}` : ''}`)),
    ingestion.sampleManifestStatus === 'invalid' && ingestion.sampleManifestPath
      ? `- sample manifest invalid: ${ingestion.sampleManifestError ?? 'unable to parse'} @ ${ingestion.sampleManifestPath}`
      : null,
    ...visibleProfileCommands.map((profile) => {
      const actionCommand = profile.importMaterialCommand ?? profile.refreshFoundationCommand;
      const actionLabel = profile.importMaterialCommand ? 'import' : 'refresh';
      const materialSummary = `${formatMaterialCount(profile.materialCount ?? 0)} (${formatMaterialTypes(profile.materialTypes)})`;
      const latestMaterial = profile.latestMaterialAt ? `, latest ${profile.latestMaterialAt}` : '';
      const intakeStatusSegment = (profile.materialCount ?? 0) <= 0 && typeof profile.intakeStatusSummary === 'string' && profile.intakeStatusSummary.length > 0 && profile.intakeStatusSummary !== 'ready'
        ? `, intake ${profile.intakeStatusSummary}`
        : '';
      const scaffoldSegment = (profile.materialCount ?? 0) <= 0 && profile.intakeReady === false && profile.updateIntakeCommand
        ? `; scaffold ${profile.updateIntakeCommand}`
        : '';
      const intakeShortcutSegment = (profile.materialCount ?? 0) <= 0 && profile.intakeReady === true && profile.importIntakeCommand
        ? ` | shortcut ${profile.importIntakeCommand}`
        : '';
      const actionSegment = actionCommand ? ` | ${actionLabel} ${actionCommand}` : '';
      const syncCommand = profile.updateProfileAndRefreshCommand ?? null;
      const updateSegment = syncCommand
        ? ` | sync ${syncCommand}`
        : (profile.updateProfileCommand ? ` | update ${profile.updateProfileCommand}` : '');
      return `- ${profile.label ?? profile.personId}: ${materialSummary}${latestMaterial}${intakeStatusSegment}${scaffoldSegment}${intakeShortcutSegment}${actionSegment}${updateSegment}`;
    }),
    remainingProfileSummary,
  ].filter(Boolean).join('\n');
}

function buildCoreFoundationBlock(foundationCore: FoundationCore = null) {
  if (!foundationCore) {
    return null;
  }

  const memory = foundationCore.memory;
  const skills = foundationCore.skills;
  const soul = foundationCore.soul;
  const voice = foundationCore.voice;
  const overview = foundationCore.overview;
  const maintenance = foundationCore.maintenance;
  const missingAreas = (overview?.missingAreas ?? []).filter(Boolean);
  const thinAreas = (overview?.thinAreas ?? []).filter(Boolean);
  const recommendedActions = (overview?.recommendedActions ?? []).filter(Boolean);
  const coverageLine = overview
    ? `- coverage: ${overview.readyAreaCount ?? 0}/${overview.totalAreaCount ?? 4} ready${missingAreas.length > 0 ? `; missing ${missingAreas.join(', ')}` : ''}${thinAreas.length > 0 ? `; thin ${thinAreas.join(', ')}` : ''}`
    : null;

  const queuedAreas = maintenance?.queuedAreas ?? [];
  const queuedAreaLines = queuedAreas.slice(0, 2).map((area) => {
    const command = area.command ?? buildCoreFoundationCommand(area);
    return `- ${area.area ?? 'foundation'} [${area.status ?? 'unknown'}]: ${area.action ?? area.summary ?? 'needs review'}${(area.paths ?? []).length > 0 ? ` @ ${(area.paths ?? []).join(', ')}` : ''}${command ? `; command ${command}` : ''}`;
  });
  const remainingQueuedAreas = queuedAreas.slice(2);
  const remainingQueuedAreaSummary = remainingQueuedAreas.length > 0
    ? `- +${remainingQueuedAreas.length} more queued: ${remainingQueuedAreas.map((area) => `${area.area ?? 'foundation'} [${area.status ?? 'unknown'}]`).join(', ')}`
    : null;

  return [
    coverageLine,
    maintenance
      ? `- queue: ${maintenance.readyAreaCount ?? 0} ready, ${maintenance.thinAreaCount ?? 0} thin, ${maintenance.missingAreaCount ?? 0} missing`
      : null,
    (() => {
      const helperEntries = [
        maintenance?.helperCommands?.scaffoldAll ? `scaffold-all ${maintenance.helperCommands.scaffoldAll}` : null,
        maintenance?.helperCommands?.scaffoldMissing ? `scaffold-missing ${maintenance.helperCommands.scaffoldMissing}` : null,
        maintenance?.helperCommands?.scaffoldThin ? `scaffold-thin ${maintenance.helperCommands.scaffoldThin}` : null,
        maintenance?.helperCommands?.memory ? `memory ${maintenance.helperCommands.memory}` : null,
        maintenance?.helperCommands?.skills ? `skills ${maintenance.helperCommands.skills}` : null,
        maintenance?.helperCommands?.soul ? `soul ${maintenance.helperCommands.soul}` : null,
        maintenance?.helperCommands?.voice ? `voice ${maintenance.helperCommands.voice}` : null,
      ].filter(Boolean);

      return helperEntries.length > 0
        ? `- helpers: ${helperEntries.join(' | ')}`
        : null;
    })(),
    ...queuedAreaLines,
    remainingQueuedAreaSummary,
    memory
      ? `- memory: README ${memory.hasRootDocument ? 'yes' : 'no'}, daily ${memory.dailyCount ?? 0}, long-term ${memory.longTermCount ?? 0}, scratch ${memory.scratchCount ?? 0}${(memory.emptyBuckets ?? []).length > 0 ? `; empty buckets: ${memory.emptyBuckets?.join(', ')}` : ''}${(memory.sampleEntries ?? []).length > 0 ? `; samples: ${memory.sampleEntries?.join(', ')}` : ''}`
      : null,
    skills
      ? `- skills: ${skills.count ?? 0} registered, ${skills.documentedCount ?? 0} documented${(skills.sample ?? []).length > 0 ? ` (${skills.sample?.join(', ')})` : ''}${(skills.samplePaths ?? []).length > 0 ? `; docs: ${skills.samplePaths?.join(', ')}` : ''}${(skills.sampleExcerpts ?? []).length > 0 ? `; excerpts: ${skills.sampleExcerpts?.join(' | ')}` : ''}${(skills.undocumentedSample ?? []).length > 0 ? `; missing docs: ${skills.undocumentedSample?.join(', ')}${(skills.undocumentedPaths ?? []).length > 0 ? ` @ ${skills.undocumentedPaths?.join(', ')}` : ''}` : ''}${(skills.thinSample ?? []).length > 0 ? `; thin docs: ${skills.thinSample?.join(', ')}${(skills.thinPaths ?? []).length > 0 ? ` @ ${skills.thinPaths?.join(', ')}` : ''}` : ''}`
      : null,
    soul
      ? `- soul: ${soul.present ? 'present' : 'missing'}, ${soul.lineCount ?? 0} lines${soul.excerpt ? `, ${soul.excerpt}` : ''}${soul.path ? ` @ ${soul.path}` : ''}`
      : null,
    voice
      ? `- voice: ${voice.present ? 'present' : 'missing'}, ${voice.lineCount ?? 0} lines${voice.excerpt ? `, ${voice.excerpt}` : ''}${voice.path ? ` @ ${voice.path}` : ''}`
      : null,
    recommendedActions.length > 0
      ? `- next actions: ${recommendedActions.join(' | ')}`
      : null,
  ].filter(Boolean).join('\n');
}

function buildWorkLoopBlock(workLoop: WorkLoopSummary = null) {
  if (!workLoop || (workLoop.priorityCount ?? workLoop.priorities?.length ?? 0) === 0) {
    return null;
  }

  const currentPriority = workLoop.currentPriority;
  const priorities = workLoop.priorities ?? [];
  const cadenceLine = workLoop.intervalMinutes
    ? `- cadence: every ${workLoop.intervalMinutes} minute${workLoop.intervalMinutes === 1 ? '' : 's'}`
    : null;
  const objectiveLine = (workLoop.objectives ?? []).length > 0
    ? `- objectives: ${(workLoop.objectives ?? []).join(' | ')}`
    : null;
  const orderLine = priorities.length > 0
    ? `- order: ${priorities.map((priority) => `${priority.id ?? priority.label ?? 'priority'}:${priority.status ?? 'unknown'}`).join(' | ')}`
    : null;

  return [
    `- priorities: ${workLoop.priorityCount ?? priorities.length} total (${workLoop.readyPriorityCount ?? 0} ready, ${workLoop.queuedPriorityCount ?? 0} queued)`,
    cadenceLine,
    currentPriority
      ? `- current: ${currentPriority.label ?? currentPriority.id ?? 'Current priority'} [${currentPriority.status ?? 'unknown'}] — ${currentPriority.summary ?? 'needs review'}`
      : null,
    currentPriority?.nextAction
      ? `- next action: ${currentPriority.nextAction}`
      : null,
    currentPriority?.command
      ? `- command: ${currentPriority.command}`
      : null,
    (currentPriority?.paths ?? []).length > 0
      ? `- paths: ${(currentPriority?.paths ?? []).join(', ')}`
      : null,
    orderLine,
    objectiveLine,
  ].filter(Boolean).join('\n');
}

export class PromptAssembler {
  profile: AgentSummary;
  soul: string;
  voice: VoiceSummary;
  memory: unknown;
  skills: unknown;
  channels: ChannelsSummary;
  models: ModelsSummary;
  delivery: DeliverySummary;
  profiles: ProfileSnapshot[];
  foundationRollup: FoundationRollup;
  foundationCore: FoundationCore;
  ingestion: IngestionSummary;
  workLoop: WorkLoopSummary;

  constructor({
    profile,
    soul = '',
    voice,
    memory,
    skills,
    channels,
    models,
    delivery = null,
    profiles = [],
    foundationRollup = null,
    foundationCore = null,
    ingestion = null,
    workLoop = null,
  }: PromptAssemblerOptions) {
    this.profile = profile;
    this.soul = soul;
    this.voice = voice;
    this.memory = memory;
    this.skills = skills;
    this.channels = channels;
    this.models = models;
    this.delivery = delivery;
    this.profiles = profiles;
    this.foundationRollup = foundationRollup;
    this.foundationCore = foundationCore;
    this.ingestion = ingestion;
    this.workLoop = workLoop;
  }

  buildPreview(maxLength = 1200) {
    const profileSnapshots = buildProfileSnapshots(this.profiles);
    const foundationMaintenanceBlock = buildFoundationMaintenanceBlock(this.foundationRollup);
    const foundationRollupBlock = buildFoundationRollupBlock(this.foundationRollup);
    const ingestionEntranceBlock = buildIngestionEntranceBlock(this.ingestion);
    const deliveryFoundationBlock = buildDeliveryFoundationBlock(this.channels, this.models, this.delivery);
    const coreFoundationBlock = buildCoreFoundationBlock(this.foundationCore);
    const workLoopBlock = buildWorkLoopBlock(this.workLoop);
    const voicePreview = this.voice
      ? {
          tone: this.voice.tone,
          style: this.voice.style,
          constraints: this.voice.constraints,
          signatures: this.voice.signatures,
          languageHints: this.voice.languageHints,
        }
      : null;

    return [
      `Name: ${this.profile.name}`,
      `Soul summary: ${this.profile.soul}`,
      '',
      'Voice profile:',
      JSON.stringify(voicePreview, null, 2),
      ingestionEntranceBlock ? '' : null,
      ingestionEntranceBlock ? 'Ingestion entrance:' : null,
      ingestionEntranceBlock,
      workLoopBlock ? '' : null,
      workLoopBlock ? 'Work loop:' : null,
      workLoopBlock,
      deliveryFoundationBlock ? '' : null,
      deliveryFoundationBlock ? 'Delivery foundation:' : null,
      deliveryFoundationBlock,
      coreFoundationBlock ? '' : null,
      coreFoundationBlock ? 'Core foundation:' : null,
      coreFoundationBlock,
      foundationMaintenanceBlock ? '' : null,
      foundationMaintenanceBlock ? 'Foundation maintenance:' : null,
      foundationMaintenanceBlock,
      foundationRollupBlock ? '' : null,
      foundationRollupBlock ? 'Foundation rollup:' : null,
      foundationRollupBlock,
      profileSnapshots ? '' : null,
      profileSnapshots ? 'Profile foundation snapshots:' : null,
      profileSnapshots,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, maxLength);
  }

  buildSystemPrompt() {
    const profileSnapshots = buildProfileSnapshots(this.profiles);
    const foundationMaintenanceBlock = buildFoundationMaintenanceBlock(this.foundationRollup);
    const foundationRollupBlock = buildFoundationRollupBlock(this.foundationRollup);
    const ingestionEntranceBlock = buildIngestionEntranceBlock(this.ingestion);
    const deliveryFoundationBlock = buildDeliveryFoundationBlock(this.channels, this.models, this.delivery);
    const coreFoundationBlock = buildCoreFoundationBlock(this.foundationCore);
    const workLoopBlock = buildWorkLoopBlock(this.workLoop);
    const sanitizedProfiles = sanitizeProfilesForPrompt(this.profiles);

    return [
      `Name: ${this.profile.name}`,
      `Soul summary: ${this.profile.soul}`,
      '',
      'Identity:',
      JSON.stringify(this.profile.identity ?? {}, null, 2),
      '',
      'Voice profile:',
      JSON.stringify(this.voice, null, 2),
      '',
      'Voice document:',
      this.voice?.document,
      '',
      'Memory:',
      JSON.stringify(this.memory, null, 2),
      '',
      'Skills:',
      JSON.stringify(this.skills, null, 2),
      '',
      ingestionEntranceBlock ? 'Ingestion entrance:' : null,
      ingestionEntranceBlock,
      '',
      workLoopBlock ? 'Work loop:' : null,
      workLoopBlock,
      '',
      deliveryFoundationBlock ? 'Delivery foundation:' : null,
      deliveryFoundationBlock,
      '',
      coreFoundationBlock ? 'Core foundation:' : null,
      coreFoundationBlock,
      '',
      foundationMaintenanceBlock ? 'Foundation maintenance:' : null,
      foundationMaintenanceBlock,
      '',
      foundationRollupBlock ? 'Foundation rollup:' : null,
      foundationRollupBlock,
      '',
      'Profiles:',
      JSON.stringify(sanitizedProfiles, null, 2),
      profileSnapshots ? '' : null,
      profileSnapshots ? 'Profile foundation snapshots:' : null,
      profileSnapshots,
      '',
      'Channels:',
      JSON.stringify(this.channels, null, 2),
      '',
      'Models:',
      JSON.stringify(this.models, null, 2),
      '',
      'Soul instructions:',
      this.soul,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

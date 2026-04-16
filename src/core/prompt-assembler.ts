type MaterialTypes = Record<string, number>;

type ProfileMetadata = {
  displayName?: string;
  summary?: string;
};

type FoundationDraftStatus = {
  needsRefresh?: boolean;
  complete?: boolean;
  missingDrafts?: string[];
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
  missingDrafts?: string[];
  latestMaterialAt?: string | null;
  refreshCommand?: string | null;
};

type FoundationMaintenance = {
  profileCount?: number;
  readyProfileCount?: number;
  refreshProfileCount?: number;
  incompleteProfileCount?: number;
  staleRefreshCommand?: string | null;
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
};

type FoundationCoreMaintenance = {
  areaCount?: number;
  readyAreaCount?: number;
  missingAreaCount?: number;
  thinAreaCount?: number;
  queuedAreas?: FoundationCoreMaintenanceQueueItem[];
};

type FoundationCore = {
  memory?: {
    hasRootDocument?: boolean;
    dailyCount?: number;
    longTermCount?: number;
    scratchCount?: number;
    totalEntries?: number;
    readyBucketCount?: number;
    totalBucketCount?: number;
    populatedBuckets?: string[];
    emptyBuckets?: string[];
  };
  skills?: {
    count?: number;
    documentedCount?: number;
    undocumentedCount?: number;
    sample?: string[];
    undocumentedSample?: string[];
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
  authEnvVars?: string[];
  deliveryModes?: string[];
  defaultModel?: string | null;
  authEnvVar?: string | null;
  modalities?: string[];
  configured?: boolean;
  missingEnvVars?: string[];
  manifestPath?: string;
  setupHint?: string;
};

type DeliverySummary = {
  pendingChannelCount?: number;
  pendingProviderCount?: number;
  configuredChannelCount?: number;
  configuredProviderCount?: number;
  missingChannelEnvVars?: string[];
  missingProviderEnvVars?: string[];
  requiredEnvVars?: string[];
  channelManifestPath?: string;
  providerManifestPath?: string;
  envTemplatePath?: string | null;
  envTemplatePresent?: boolean;
  envTemplateCommand?: string | null;
  channelQueue?: DeliveryQueueItem[];
  providerQueue?: DeliveryQueueItem[];
} | null;

type IngestionProfileCommand = {
  personId?: string | null;
  displayName?: string | null;
  label?: string | null;
  materialCount?: number;
  needsRefresh?: boolean;
  missingDrafts?: string[];
  updateProfileCommand?: string | null;
  refreshFoundationCommand?: string | null;
};

type IngestionSummary = {
  profileCount?: number;
  importedProfileCount?: number;
  metadataOnlyProfileCount?: number;
  readyProfileCount?: number;
  refreshProfileCount?: number;
  incompleteProfileCount?: number;
  supportedImportTypes?: string[];
  bootstrapProfileCommand?: string | null;
  sampleImportCommand?: string | null;
  importManifestCommand?: string | null;
  staleRefreshCommand?: string | null;
  profileCommands?: IngestionProfileCommand[];
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
  return [
    `- ${maintenance.readyProfileCount ?? 0} ready, ${maintenance.refreshProfileCount ?? 0} queued for refresh, ${maintenance.incompleteProfileCount ?? 0} incomplete`,
    ...queuedProfiles.map((profile) => `- ${profile.label ?? profile.id}: ${profile.status}${(profile.missingDrafts ?? []).length > 0 ? `, missing ${profile.missingDrafts?.join('/')}` : ''}`),
    maintenance.staleRefreshCommand ? `- refresh command: ${maintenance.staleRefreshCommand}` : null,
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
  const channelManifestSummary = formatManifestSummary('channel manifest', channels?.manifest);
  const providerManifestSummary = formatManifestSummary('provider manifest', models?.manifest);
  const channelQueue = delivery?.channelQueue ?? channelRecords
    .filter((channel) => channel?.status !== 'active')
    .map((channel) => ({
      name: channel.name ?? channel.id,
      id: channel.id,
      status: channel.status ?? 'unknown',
      deliveryModes: channel.deliveryModes ?? [],
      setupHint: (channel.auth?.envVars ?? []).length > 0
        ? `set ${(channel.auth?.envVars ?? []).join(', ')}`
        : 'define channel credentials',
    }));
  const providerQueue = delivery?.providerQueue ?? providerRecords
    .filter((provider) => provider?.status !== 'active')
    .map((provider) => ({
      name: provider.name ?? provider.id,
      id: provider.id,
      status: provider.status ?? 'unknown',
      modalities: provider.modalities ?? [],
      setupHint: provider.authEnvVar && provider.defaultModel
        ? `set ${provider.authEnvVar} for ${provider.defaultModel}`
        : provider.authEnvVar
          ? `set ${provider.authEnvVar}`
          : provider.defaultModel
            ? `choose auth for ${provider.defaultModel}`
            : 'choose auth and default model',
    }));
  if (channelRecords.length === 0 && providerRecords.length === 0 && !channelManifestSummary && !providerManifestSummary && channelQueue.length === 0 && providerQueue.length === 0) {
    return null;
  }

  const activeChannelCount = channels?.activeCount ?? channelRecords.filter((channel) => channel.status === 'active').length;
  const plannedChannelCount = channels?.plannedCount ?? channelRecords.filter((channel) => channel.status === 'planned').length;
  const candidateChannelCount = channels?.candidateCount ?? channelRecords.filter((channel) => channel.status === 'candidate').length;
  const activeProviderCount = models?.activeCount ?? providerRecords.filter((provider) => provider.status === 'active').length;
  const plannedProviderCount = models?.plannedCount ?? providerRecords.filter((provider) => provider.status === 'planned').length;
  const candidateProviderCount = models?.candidateCount ?? providerRecords.filter((provider) => provider.status === 'candidate').length;

  return [
    channelManifestSummary,
    channelRecords.length > 0
      ? `- channels: ${channelRecords.length} total (${activeChannelCount} active, ${plannedChannelCount} planned, ${candidateChannelCount} candidate)`
      : null,
    (delivery?.envTemplatePresent && delivery.envTemplatePath)
      ? `- env template: ${delivery.envTemplatePath}${(delivery.requiredEnvVars ?? []).length > 0 ? ` (${delivery.requiredEnvVars.length} vars)` : ''}`
      : null,
    delivery?.envTemplatePresent && delivery.envTemplateCommand
      ? `- env bootstrap: ${delivery.envTemplateCommand}`
      : null,
    (delivery?.configuredChannelCount !== undefined || delivery?.configuredProviderCount !== undefined)
      ? `- auth readiness: ${delivery?.configuredChannelCount ?? 0}/${channelQueue.length} channels configured, ${delivery?.configuredProviderCount ?? 0}/${providerQueue.length} providers configured`
      : null,
    ...channelRecords.slice(0, 2).map((channel) =>
      `- ${channel.name ?? channel.id} via ${(channel.deliveryModes ?? []).join('/') || 'unspecified'} [${formatChannelAuth(channel.auth)}]`,
    ),
    channelQueue.length > 0
      ? `- channel queue: ${delivery?.pendingChannelCount ?? channelQueue.length} pending via ${delivery?.channelManifestPath ?? channels?.manifest?.path ?? 'manifests/channels.json'}`
      : null,
    ...channelQueue.slice(0, 1).map((channel) =>
      `- ${channel.name ?? channel.id} [${channel.status ?? 'unknown'}${channel.configured ? ', configured' : ''}]: ${channel.setupHint ?? 'define channel credentials'}${(channel.deliveryModes ?? []).length > 0 ? ` via ${(channel.deliveryModes ?? []).join('/')}` : ''}`,
    ),
    providerManifestSummary,
    providerRecords.length > 0
      ? `- models: ${providerRecords.length} total (${activeProviderCount} active, ${plannedProviderCount} planned, ${candidateProviderCount} candidate)`
      : null,
    ...providerRecords.slice(0, 2).map((provider) => {
      const modalities = (provider.modalities ?? []).join(', ');
      return `- ${provider.name ?? provider.id} default ${provider.defaultModel ?? 'unspecified'} [${provider.authEnvVar ?? 'no auth env'}] {${modalities}}`;
    }),
    providerQueue.length > 0
      ? `- provider queue: ${delivery?.pendingProviderCount ?? providerQueue.length} pending via ${delivery?.providerManifestPath ?? models?.manifest?.path ?? 'manifests/providers.json'}`
      : null,
    ...providerQueue.slice(0, 1).map((provider) =>
      `- ${provider.name ?? provider.id} [${provider.status ?? 'unknown'}${provider.configured ? ', configured' : ''}]: ${provider.setupHint ?? 'choose auth and default model'}${(provider.modalities ?? []).length > 0 ? ` {${(provider.modalities ?? []).join(', ')}}` : ''}`,
    ),
  ].filter(Boolean).join('\n');
}

function buildIngestionEntranceBlock(ingestion: IngestionSummary = null) {
  const hasProfileData = (ingestion?.profileCount ?? 0) > 0;
  const hasBootstrapData = Boolean(
    ingestion?.bootstrapProfileCommand
      || ingestion?.sampleImportCommand
      || ingestion?.importManifestCommand
      || ingestion?.staleRefreshCommand
      || (ingestion?.supportedImportTypes?.length ?? 0) > 0,
  );

  if (!ingestion || (!hasProfileData && !hasBootstrapData)) {
    return null;
  }

  return [
    `- profiles: ${ingestion.profileCount ?? 0} total (${ingestion.importedProfileCount ?? 0} imported, ${ingestion.metadataOnlyProfileCount ?? 0} metadata-only)`,
    `- drafts: ${ingestion.readyProfileCount ?? 0} ready, ${ingestion.refreshProfileCount ?? 0} queued for refresh, ${ingestion.incompleteProfileCount ?? 0} incomplete`,
    (ingestion.supportedImportTypes ?? []).length > 0
      ? `- imports: ${(ingestion.supportedImportTypes ?? []).join(', ')}`
      : null,
    ingestion.bootstrapProfileCommand
      ? `- bootstrap: ${ingestion.bootstrapProfileCommand}`
      : null,
    (ingestion.importManifestCommand || ingestion.staleRefreshCommand)
      ? `- commands: ${[ingestion.importManifestCommand, ingestion.staleRefreshCommand].filter(Boolean).join(' | ')}`
      : null,
    ingestion.sampleImportCommand
      ? `- sample import: ${ingestion.sampleImportCommand}`
      : null,
    ...(ingestion.profileCommands ?? []).slice(0, 2).map((profile) =>
      `- ${profile.label ?? profile.personId}: refresh ${profile.refreshFoundationCommand}${profile.updateProfileCommand ? ` | update ${profile.updateProfileCommand}` : ''}`,
    ),
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

  return [
    coverageLine,
    maintenance
      ? `- queue: ${maintenance.readyAreaCount ?? 0} ready, ${maintenance.thinAreaCount ?? 0} thin, ${maintenance.missingAreaCount ?? 0} missing`
      : null,
    ...(maintenance?.queuedAreas ?? []).slice(0, 2).map((area) =>
      `- ${area.area ?? 'foundation'} [${area.status ?? 'unknown'}]: ${area.action ?? area.summary ?? 'needs review'}`,
    ),
    memory
      ? `- memory: README ${memory.hasRootDocument ? 'yes' : 'no'}, daily ${memory.dailyCount ?? 0}, long-term ${memory.longTermCount ?? 0}, scratch ${memory.scratchCount ?? 0}${(memory.emptyBuckets ?? []).length > 0 ? `; empty buckets: ${memory.emptyBuckets?.join(', ')}` : ''}`
      : null,
    skills
      ? `- skills: ${skills.count ?? 0} registered, ${skills.documentedCount ?? 0} documented${(skills.sample ?? []).length > 0 ? ` (${skills.sample?.join(', ')})` : ''}${(skills.undocumentedSample ?? []).length > 0 ? `; placeholders: ${skills.undocumentedSample?.join(', ')}` : ''}`
      : null,
    soul
      ? `- soul: ${soul.present ? 'present' : 'missing'}, ${soul.lineCount ?? 0} lines${soul.excerpt ? `, ${soul.excerpt}` : ''}`
      : null,
    voice
      ? `- voice: ${voice.present ? 'present' : 'missing'}, ${voice.lineCount ?? 0} lines${voice.excerpt ? `, ${voice.excerpt}` : ''}`
      : null,
    recommendedActions.length > 0
      ? `- next actions: ${recommendedActions.join(' | ')}`
      : null,
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
  }

  buildPreview(maxLength = 1200) {
    const profileSnapshots = buildProfileSnapshots(this.profiles);
    const foundationMaintenanceBlock = buildFoundationMaintenanceBlock(this.foundationRollup);
    const foundationRollupBlock = buildFoundationRollupBlock(this.foundationRollup);
    const ingestionEntranceBlock = buildIngestionEntranceBlock(this.ingestion);
    const deliveryFoundationBlock = buildDeliveryFoundationBlock(this.channels, this.models, this.delivery);
    const coreFoundationBlock = buildCoreFoundationBlock(this.foundationCore);
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

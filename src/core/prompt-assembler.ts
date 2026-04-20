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
  readySectionCount?: number;
  totalSectionCount?: number;
  readySections?: string[];
  missingSections?: string[];
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
  draftGapSummary?: string | null;
  refreshCommand?: string | null;
};

type FoundationMaintenance = {
  profileCount?: number;
  readyProfileCount?: number;
  refreshProfileCount?: number;
  incompleteProfileCount?: number;
  missingDraftCounts?: Record<string, number>;
  refreshReasonCounts?: Record<string, number>;
  refreshAllCommand?: string | null;
  staleRefreshCommand?: string | null;
  refreshBundleCommand?: string | null;
  recommendedProfileId?: string | null;
  recommendedLabel?: string | null;
  recommendedAction?: string | null;
  recommendedCommand?: string | null;
  recommendedPaths?: string[];
  recommendedDraftGapSummary?: string | null;
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
  rootPath?: string;
  lineCount?: number;
  excerpt?: string | null;
  rootExcerpt?: string | null;
  structured?: boolean;
  readySectionCount?: number;
  totalSectionCount?: number;
  readySections?: string[];
  missingSections?: string[];
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
  thinMissingSections?: Record<string, string[]>;
  thinReadySections?: Record<string, string[]>;
  rootThinMissingSections?: string[];
  rootThinReadySections?: string[];
  command?: string | null;
};

type FoundationCoreMaintenance = {
  areaCount?: number;
  readyAreaCount?: number;
  missingAreaCount?: number;
  thinAreaCount?: number;
  recommendedArea?: string | null;
  recommendedAction?: string | null;
  recommendedCommand?: string | null;
  recommendedPaths?: string[];
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
    rootExcerpt?: string | null;
    rootMissingSections?: string[];
    rootReadySections?: string[];
    rootReadySectionCount?: number;
    rootTotalSectionCount?: number;
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
    hasRootDocument?: boolean;
    rootPath?: string;
    rootExcerpt?: string | null;
    rootMissingSections?: string[];
    rootReadySections?: string[];
    rootReadySectionCount?: number;
    rootTotalSectionCount?: number;
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
    thinMissingSections?: Record<string, string[]>;
    thinReadySections?: Record<string, string[]>;
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

type SoulSummary = {
  excerpt?: string | null;
  coreTruths?: string[];
  boundaries?: string[];
  vibe?: string[];
  continuity?: string[];
  [key: string]: unknown;
} | null;

type VoiceSummary = {
  document?: string;
  [key: string]: unknown;
} | null;

type MemorySummary = {
  shortTermEntries?: number;
  longTermEntries?: number;
  totalEntries?: number;
  shortTermPresent?: boolean;
  longTermPresent?: boolean;
  [key: string]: unknown;
} | null;

type SkillRegistrySummary = {
  skillCount?: number;
  discoveredCount?: number;
  customCount?: number;
  skills?: Array<{
    id?: string;
    name?: string;
    status?: string;
  }>;
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
  implementationReady?: boolean;
  implementationStatus?: 'missing' | 'scaffold' | 'ready';
  configured?: boolean;
  missingEnvVars?: string[];
  manifestPath?: string;
  manifestPresent?: boolean;
  setupHint?: string;
  nextStep?: string | null;
  helperCommands?: {
    bootstrapEnv?: string | null;
    populateEnv?: string | null;
    scaffoldManifest?: string | null;
    scaffoldImplementation?: string | null;
  };
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
  readyChannelImplementationCount?: number;
  readyProviderImplementationCount?: number;
  scaffoldOnlyChannelCount?: number;
  scaffoldOnlyProviderCount?: number;
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
    populateEnvTemplate?: string | null;
    populateDeliveryEnv?: string | null;
    populateChannelEnv?: string | null;
    populateProviderEnv?: string | null;
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
  draftGapSummary?: string | null;
  updateProfileCommand?: string | null;
  updateProfileAndRefreshCommand?: string | null;
  updateIntakeCommand?: string | null;
  importIntakeWithoutRefreshCommand?: string | null;
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
  scaffoldImported?: string | null;
  scaffoldBundle?: string | null;
  scaffoldImportedBundle?: string | null;
  repairInvalidBundle?: string | null;
  repairImportedInvalidBundle?: string | null;
  importManifest?: string | null;
  importManifestAndRefresh?: string | null;
  importIntakeAll?: string | null;
  importIntakeStale?: string | null;
  importIntakeImported?: string | null;
  importIntakeBundle?: string | null;
  updateProfileBundle?: string | null;
  updateProfileAndRefreshBundle?: string | null;
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
  importedIntakeReadyProfileCount?: number;
  importedIntakeBackfillProfileCount?: number;
  importedInvalidIntakeManifestProfileCount?: number;
  invalidMetadataOnlyIntakeManifestProfileCount?: number;
  intakeReadyProfileCount?: number;
  intakePartialProfileCount?: number;
  intakeMissingProfileCount?: number;
  intakeScaffoldProfileCount?: number;
  supportedImportTypes?: string[];
  bootstrapProfileCommand?: string | null;
  intakeImportedCommand?: string | null;
  intakeImportImportedCommand?: string | null;
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
  repairInvalidIntakeBundleCommand?: string | null;
  repairImportedInvalidIntakeBundleCommand?: string | null;
  recommendedProfileId?: string | null;
  recommendedLabel?: string | null;
  recommendedAction?: string | null;
  recommendedCommand?: string | null;
  recommendedPaths?: string[];
  helperCommands?: IngestionHelperCommands;
  profileCommands?: IngestionProfileCommand[];
  allProfileCommands?: IngestionProfileCommand[];
  metadataProfileCommands?: IngestionProfileCommand[];
} | null;

type WorkLoopPriority = {
  id?: string;
  label?: string;
  status?: 'ready' | 'queued' | 'blocked' | string;
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
  blockedPriorityCount?: number;
  leadingPriority?: WorkLoopPriority | null;
  currentPriority?: WorkLoopPriority | null;
  priorities?: WorkLoopPriority[];
} | null;

export interface PromptAssemblerOptions {
  profile: AgentSummary;
  soul?: string;
  soulProfile?: SoulSummary;
  voice: VoiceSummary;
  memory: unknown;
  memorySummary?: MemorySummary;
  skills: unknown;
  skillsSummary?: SkillRegistrySummary;
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
  const refreshReasons = Array.isArray(status.refreshReasons)
    ? status.refreshReasons.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const reasonsSuffix = refreshReasons.length > 0 ? `, reasons ${refreshReasons.join(' + ')}` : '';
  return `${freshness}, ${completeness}${generatedAt}${reasonsSuffix}`;
}

function cleanHighlight(value: string) {
  return value.replace(/^[-\s]*/, '').trim();
}

function summarizeDraftGaps(profile: ProfileSnapshot = {}) {
  const missingDrafts = Array.isArray(profile.foundationDraftStatus?.missingDrafts)
    ? profile.foundationDraftStatus.missingDrafts
    : [];
  const draftKinds = [
    { key: 'voice', summary: profile.foundationDraftSummaries?.voice },
    { key: 'soul', summary: profile.foundationDraftSummaries?.soul },
    { key: 'skills', summary: profile.foundationDraftSummaries?.skills },
  ];

  const memoryGapSummary = (() => {
    if (!missingDrafts.includes('memory')) {
      return null;
    }

    const candidateCount = Number(profile.foundationReadiness?.memory?.candidateCount ?? 0);
    const memoryHighlights = [
      ...(profile.foundationDraftSummaries?.memory?.latestSummaries ?? []),
      ...(profile.foundationReadiness?.memory?.sampleSummaries ?? []),
    ].filter((value, index, values) => typeof value === 'string' && value.trim().length > 0 && values.indexOf(value) === index);

    if (candidateCount > 0) {
      const candidateLabel = `${candidateCount} candidate${candidateCount === 1 ? '' : 's'}`;
      return memoryHighlights.length > 0
        ? `memory missing, ${candidateLabel} (${memoryHighlights[0]})`
        : `memory missing, ${candidateLabel}`;
    }

    return 'memory missing';
  })();

  const gapSummaries = [
    memoryGapSummary,
    ...draftKinds
      .map(({ key, summary }) => {
        const totalSectionCount = summary?.totalSectionCount ?? 0;
        const readySectionCount = summary?.readySectionCount ?? totalSectionCount;
        const readySections = Array.isArray(summary?.readySections)
          ? summary.readySections.filter((value): value is string => typeof value === 'string' && value.length > 0)
          : [];
        const missingSections = Array.isArray(summary?.missingSections)
          ? summary.missingSections.filter((value): value is string => typeof value === 'string' && value.length > 0)
          : [];
        if (totalSectionCount <= 0 || missingSections.length === 0) {
          return null;
        }

        return `${key} ${readySectionCount}/${totalSectionCount}${readySections.length > 0 ? ` ready (${readySections.join(', ')})` : ''}, missing ${missingSections.join('/')}`;
      })
      .filter(Boolean),
  ].filter(Boolean);

  return gapSummaries.length > 0 ? gapSummaries.join(' | ') : null;
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

  const draftGaps = summarizeDraftGaps(profile);
  if (draftGaps) {
    lines.push(`  draft gaps: ${draftGaps}`);
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

function formatCountMap(counts: Record<string, number> | null | undefined) {
  if (!counts || typeof counts !== 'object') {
    return null;
  }

  const entries = Object.entries(counts)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  if (entries.length === 0) {
    return null;
  }

  return entries.map(([key, count]) => `${key} ${count}`).join(', ');
}

function buildFoundationMaintenanceBlock(foundationRollup: FoundationRollup = null) {
  const maintenance = foundationRollup?.maintenance;
  if (!maintenance || (maintenance.profileCount ?? 0) === 0) {
    return null;
  }

  const queuedProfiles = maintenance.queuedProfiles ?? [];
  const visibleQueuedProfiles = queuedProfiles.slice(0, 2);
  const remainingQueuedProfiles = queuedProfiles.slice(2);
  const helperLine = [
    maintenance.helperCommands?.refreshAll ? `refresh-all ${maintenance.helperCommands.refreshAll}` : null,
    maintenance.helperCommands?.refreshStale ? `refresh-stale ${maintenance.helperCommands.refreshStale}` : null,
    maintenance.helperCommands?.refreshBundle ? `refresh-bundle ${maintenance.helperCommands.refreshBundle}` : null,
  ].filter(Boolean).join(' | ');
  const recommendedPaths = Array.isArray(maintenance.recommendedPaths)
    ? maintenance.recommendedPaths.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const recommendedDraftGapSummary = typeof maintenance.recommendedDraftGapSummary === 'string' && maintenance.recommendedDraftGapSummary.length > 0
    ? maintenance.recommendedDraftGapSummary
    : null;
  const nextRefreshLine = typeof maintenance.recommendedAction === 'string' && maintenance.recommendedAction.length > 0
    ? `- next refresh: ${maintenance.recommendedAction}${typeof maintenance.recommendedCommand === 'string' && maintenance.recommendedCommand.length > 0 ? `; command ${maintenance.recommendedCommand}` : ''}${recommendedPaths.length > 0 ? ` @ ${recommendedPaths.join(', ')}` : ''}${recommendedDraftGapSummary ? `; gaps ${recommendedDraftGapSummary}` : ''}`
    : null;
  const missingDraftSummary = formatCountMap(maintenance.missingDraftCounts);
  const refreshReasonSummary = formatCountMap(maintenance.refreshReasonCounts);
  const formatQueuedProfileLine = (profile: MaintenanceQueueItem) => {
    const reasonSuffix = (profile.refreshReasons ?? []).length > 0
      ? `, reasons ${(profile.refreshReasons ?? []).join(' + ')}`
      : '';
    const coverageSuffix = Number.isFinite(profile.generatedDraftCount) && Number.isFinite(profile.expectedDraftCount)
      ? `, ${profile.generatedDraftCount}/${profile.expectedDraftCount} drafts generated`
      : '';
    const draftGapSuffix = typeof profile.draftGapSummary === 'string' && profile.draftGapSummary.length > 0
      ? `, gaps ${profile.draftGapSummary}`
      : '';
    return `${profile.status}${coverageSuffix}${(profile.missingDrafts ?? []).length > 0 ? `, missing ${profile.missingDrafts?.join('/')}` : ''}${reasonSuffix}${draftGapSuffix}`;
  };
  const formatCompactQueuedProfileLabel = (profile: MaintenanceQueueItem) => {
    const segments = [profile.status ?? 'stale'];
    if (Number.isFinite(profile.generatedDraftCount) && Number.isFinite(profile.expectedDraftCount)) {
      segments.push(`${profile.generatedDraftCount}/${profile.expectedDraftCount} drafts`);
    }
    if ((profile.missingDrafts ?? []).length > 0) {
      segments.push(`missing ${profile.missingDrafts?.join('/')}`);
    }
    return `${profile.label ?? profile.id} [${segments.join(', ')}]`;
  };
  const remainingQueuedProfilePreview = remainingQueuedProfiles
    .slice(0, 2)
    .map((profile) => formatCompactQueuedProfileLabel(profile))
    .join(', ');
  const hiddenQueuedProfileCount = Math.max(remainingQueuedProfiles.length - 2, 0);
  const remainingQueuedProfileSummary = remainingQueuedProfiles.length > 0
    ? `- +${remainingQueuedProfiles.length} more queued profile${remainingQueuedProfiles.length === 1 ? '' : 's'}: ${remainingQueuedProfilePreview}${hiddenQueuedProfileCount > 0 ? `, +${hiddenQueuedProfileCount} more hidden` : ''}`
    : null;

  return [
    `- ${maintenance.readyProfileCount ?? 0} ready, ${maintenance.refreshProfileCount ?? 0} queued for refresh, ${maintenance.incompleteProfileCount ?? 0} incomplete`,
    missingDraftSummary ? `- missing drafts: ${missingDraftSummary}` : null,
    refreshReasonSummary ? `- refresh reasons: ${refreshReasonSummary}` : null,
    helperLine ? `- helpers: ${helperLine}` : null,
    maintenance.staleRefreshCommand ? `- refresh command: ${maintenance.staleRefreshCommand}` : null,
    nextRefreshLine,
    ...visibleQueuedProfiles.map((profile) => `- ${profile.label ?? profile.id}: ${formatQueuedProfileLine(profile)}`),
    remainingQueuedProfileSummary,
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

  const skillsCandidateCount = skills?.candidateCount ?? 0;
  const skillsCandidateLabel = formatCountLabel(skillsCandidateCount, 'candidate');

  return [
    memory
      ? `- memory: ${memory.generatedProfileCount}/${memory.profileCount} generated, ${formatCountLabel(memory.candidateProfileCount ?? 0, 'candidate profile')}, ${formatCountLabel(memory.repoStaleProfileCount, 'repo-stale profile')}, ${memory.totalEntries} entries, highlights: ${formatFoundationHighlights(memory.highlights)}`
      : null,
    voice
      ? `- voice: ${voice.generatedProfileCount}/${voice.profileCount} generated, ${formatCountLabel(voice.candidateProfileCount, 'candidate profile')}, highlights: ${formatFoundationHighlights(voice.highlights)}`
      : null,
    soul
      ? `- soul: ${soul.generatedProfileCount}/${soul.profileCount} generated, ${formatCountLabel(soul.candidateProfileCount, 'candidate profile')}, highlights: ${formatFoundationHighlights(soul.highlights)}`
      : null,
    skills
      ? `- skills: ${skills.generatedProfileCount}/${skills.profileCount} generated, ${skillsCandidateLabel}, highlights: ${formatFoundationHighlights(skills.highlights)}`
      : null,
  ].filter(Boolean).join('\n');
}

function formatCountLabel(count: number, singularLabel: string) {
  return `${count} ${singularLabel}${count === 1 ? '' : 's'}`;
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
  const showPopulateDeliveryEnv = Boolean(
    helperCommands.populateDeliveryEnv
      && helperCommands.populateDeliveryEnv !== helperCommands.populateChannelEnv
      && helperCommands.populateDeliveryEnv !== helperCommands.populateProviderEnv,
  );
  const helperLine = [
    helperCommands.bootstrapEnv ? `env ${helperCommands.bootstrapEnv}` : null,
    helperCommands.populateEnvTemplate ? `template env ${helperCommands.populateEnvTemplate}` : null,
    showPopulateDeliveryEnv ? `delivery env ${helperCommands.populateDeliveryEnv}` : null,
    helperCommands.populateChannelEnv ? `channel env ${helperCommands.populateChannelEnv}` : null,
    helperCommands.populateProviderEnv ? `provider env ${helperCommands.populateProviderEnv}` : null,
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
      implementationReady: false,
      implementationStatus: 'missing',
      manifestPath: channels?.manifest?.path ?? 'manifests/channels.json',
      manifestPresent: channels?.manifest?.status === 'loaded',
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
      implementationReady: false,
      implementationStatus: 'missing',
      manifestPath: models?.manifest?.path ?? 'manifests/providers.json',
      manifestPresent: models?.manifest?.status === 'loaded',
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
  const formatCompactDeliveryQueueLabel = (item: DeliveryQueueItem, fallbackLabel: string) => {
    const implementationTag = item?.implementationStatus === 'scaffold'
      ? 'scaffold-only'
      : (item?.implementationStatus === 'ready' ? 'runtime-ready' : null);
    const statusTags = [
      item?.status ?? null,
      item?.configured ? 'configured' : null,
      implementationTag,
    ].filter(Boolean);
    return `${item?.name ?? item?.id ?? fallbackLabel}${statusTags.length > 0 ? ` [${statusTags.join(', ')}]` : ''}`;
  };
  const formatCompactDeliveryRecordLabel = (item: ChannelSummaryRecord | ModelSummaryRecord, queue: DeliveryQueueItem[], fallbackLabel: string) => {
    const queueMatch = queue.find((queueItem) => queueItem?.id && item?.id && queueItem.id === item.id);
    return queueMatch
      ? formatCompactDeliveryQueueLabel(queueMatch, fallbackLabel)
      : `${item?.name ?? item?.id ?? fallbackLabel} [${item?.status ?? 'unknown'}]`;
  };
  const visibleChannelRecords = channelRecords.slice(0, 2);
  const remainingChannelRecords = channelRecords.slice(2);
  const remainingChannelRecordsSummary = remainingChannelRecords.length > 0
    ? `- +${remainingChannelRecords.length} more channel${remainingChannelRecords.length === 1 ? '' : 's'}: ${remainingChannelRecords.map((channel) => formatCompactDeliveryRecordLabel(channel, enrichedChannelQueue, 'unknown-channel')).join(', ')}`
    : null;
  const visibleProviderRecords = providerRecords.slice(0, 2);
  const remainingProviderRecords = providerRecords.slice(2);
  const remainingProviderRecordsSummary = remainingProviderRecords.length > 0
    ? `- +${remainingProviderRecords.length} more provider${remainingProviderRecords.length === 1 ? '' : 's'}: ${remainingProviderRecords.map((provider) => formatCompactDeliveryRecordLabel(provider, providerQueue, 'unknown-provider')).join(', ')}`
    : null;
  const visibleChannelQueue = enrichedChannelQueue.slice(0, 1);
  const remainingChannelQueue = enrichedChannelQueue.slice(1);
  const remainingChannelQueueSummary = remainingChannelQueue.length > 0
    ? `- +${remainingChannelQueue.length} more queued channel${remainingChannelQueue.length === 1 ? '' : 's'}: ${remainingChannelQueue.map((channel) => formatCompactDeliveryQueueLabel(channel, 'unknown-channel')).join(', ')}`
    : null;
  const visibleProviderQueue = providerQueue.slice(0, 1);
  const remainingProviderQueue = providerQueue.slice(1);
  const remainingProviderQueueSummary = remainingProviderQueue.length > 0
    ? `- +${remainingProviderQueue.length} more queued provider${remainingProviderQueue.length === 1 ? '' : 's'}: ${remainingProviderQueue.map((provider) => formatCompactDeliveryQueueLabel(provider, 'unknown-provider')).join(', ')}`
    : null;
  const formatDeliveryQueueSummary = (queue: DeliveryQueueItem[], {
    pendingCount,
    authBlockedCount,
    manifestPath,
  }: {
    pendingCount?: number;
    authBlockedCount?: number;
    manifestPath: string;
  }) => {
    if (queue.length === 0) {
      return null;
    }

    const queuePendingCount = typeof pendingCount === 'number' ? pendingCount : queue.length;
    const queueAuthBlockedCount = typeof authBlockedCount === 'number'
      ? authBlockedCount
      : undefined;
    const manifestReady = queue.every((item) => item?.manifestPresent === true);
    const implementationPresentCount = queue.filter((item) => item?.implementationPresent === true).length;
    const implementationReadyCount = queue.filter((item) => item?.implementationReady === true).length;

    return `${queuePendingCount} pending${typeof queueAuthBlockedCount === 'number' ? ` (${queueAuthBlockedCount} auth-blocked)` : ''}, manifest ${manifestReady ? 'ready' : 'missing'}, scaffolds ${implementationPresentCount}/${queuePendingCount} present, implementations ${implementationReadyCount}/${queuePendingCount} ready via ${manifestPath}`;
  };
  const channelQueueSummary = formatDeliveryQueueSummary(enrichedChannelQueue, {
    pendingCount: delivery?.pendingChannelCount,
    authBlockedCount: delivery?.authBlockedChannelCount,
    manifestPath: delivery?.channelManifestPath ?? channels?.manifest?.path ?? 'manifests/channels.json',
  });
  const providerQueueSummary = formatDeliveryQueueSummary(providerQueue, {
    pendingCount: delivery?.pendingProviderCount,
    authBlockedCount: delivery?.authBlockedProviderCount,
    manifestPath: delivery?.providerManifestPath ?? models?.manifest?.path ?? 'manifests/providers.json',
  });
  const envTemplateVarCount = (delivery?.envTemplateVarNames ?? []).length;
  const missingTemplateVars = (delivery?.envTemplateMissingRequiredVars ?? []).filter(Boolean);
  const requiredEnvVars = (delivery?.requiredEnvVars ?? []).filter(Boolean);
  const missingChannelEnvVars = (delivery?.missingChannelEnvVars ?? []).filter(Boolean);
  const missingProviderEnvVars = (delivery?.missingProviderEnvVars ?? []).filter(Boolean);
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
    (delivery?.readyChannelImplementationCount !== undefined || delivery?.readyProviderImplementationCount !== undefined)
      ? `- runtime implementations: ${delivery?.readyChannelImplementationCount ?? 0}/${channelRecords.length} channels, ${delivery?.readyProviderImplementationCount ?? 0}/${providerRecords.length} providers ready`
      : null,
    (delivery?.configuredChannelCount !== undefined || delivery?.configuredProviderCount !== undefined)
      ? `- auth readiness: ${delivery?.configuredChannelCount ?? 0}/${channelQueue.length} channels configured, ${delivery?.configuredProviderCount ?? 0}/${providerQueue.length} providers configured`
      : null,
    missingChannelEnvVars.length > 0
      ? `- channel env backlog: ${missingChannelEnvVars.join(', ')}`
      : null,
    missingProviderEnvVars.length > 0
      ? `- provider env backlog: ${missingProviderEnvVars.join(', ')}`
      : null,
    ...visibleChannelRecords.map((channel) =>
      `- ${formatCompactDeliveryRecordLabel(channel, enrichedChannelQueue, 'unknown-channel')} via ${formatChannelFlow(channel)} [${formatChannelAuth(channel.auth)}]`,
    ),
    remainingChannelRecordsSummary,
    channelQueueSummary
      ? `- channel queue: ${channelQueueSummary}`
      : null,
    ...visibleChannelQueue.map((channel) => {
      const authDetails = [
        channel.authType ?? null,
        (channel.capabilities ?? []).length > 0 ? `caps ${(channel.capabilities ?? []).join(', ')}` : null,
      ].filter(Boolean).join('; ');
      const flow = ((channel.deliveryModes ?? []).length > 0 || channel.outboundMode || channel.inboundPath)
        ? ` via ${formatChannelFlow(channel)}`
        : '';
      const helperLine = [
        channel.helperCommands?.bootstrapEnv ? `env ${channel.helperCommands.bootstrapEnv}` : null,
        channel.helperCommands?.populateEnv ? `populate ${channel.helperCommands.populateEnv}` : null,
        channel.helperCommands?.scaffoldManifest ? `manifest ${channel.helperCommands.scaffoldManifest}` : null,
        channel.helperCommands?.scaffoldImplementation ? `impl ${channel.helperCommands.scaffoldImplementation}` : null,
      ].filter(Boolean).join(' | ');
      const implementationTag = channel.implementationStatus === 'scaffold'
        ? ', scaffold-only'
        : (channel.implementationStatus === 'ready' ? ', runtime-ready' : '');
      const actionableNextStep = channel.implementationStatus === 'ready' ? null : channel.nextStep;
      return `- ${channel.name ?? channel.id} [${channel.status ?? 'unknown'}${channel.configured ? ', configured' : ''}${implementationTag}]: ${channel.setupHint ?? 'define channel credentials'}${actionableNextStep ? `; next: ${actionableNextStep}` : ''}${flow}${authDetails ? ` [${authDetails}]` : ''}${channel.implementationPath ? ` @ ${channel.implementationPath}` : ''}${helperLine ? ` | helpers: ${helperLine}` : ''}`;
    }),
    remainingChannelQueueSummary,
    providerManifestSummary,
    providerRecords.length > 0
      ? `- models: ${providerRecords.length} total (${activeProviderCount} active, ${plannedProviderCount} planned, ${candidateProviderCount} candidate)`
      : null,
    ...visibleProviderRecords.map((provider) => {
      const modalities = (provider.modalities ?? []).join(', ');
      return `- ${formatCompactDeliveryRecordLabel(provider, providerQueue, 'unknown-provider')} default ${provider.defaultModel ?? 'unspecified'} [${provider.authEnvVar ?? 'no auth env'}] {${modalities}}`;
    }),
    remainingProviderRecordsSummary,
    providerQueueSummary
      ? `- provider queue: ${providerQueueSummary}`
      : null,
    ...visibleProviderQueue.map((provider) => {
      const providerDetails = [
        (provider.features ?? []).length > 0 ? `features: ${(provider.features ?? []).join(', ')}` : null,
        (provider.models ?? []).length > 0 ? `models: ${(provider.models ?? []).join(', ')}` : null,
      ].filter(Boolean).join('; ');
      const helperLine = [
        provider.helperCommands?.bootstrapEnv ? `env ${provider.helperCommands.bootstrapEnv}` : null,
        provider.helperCommands?.populateEnv ? `populate ${provider.helperCommands.populateEnv}` : null,
        provider.helperCommands?.scaffoldManifest ? `manifest ${provider.helperCommands.scaffoldManifest}` : null,
        provider.helperCommands?.scaffoldImplementation ? `impl ${provider.helperCommands.scaffoldImplementation}` : null,
      ].filter(Boolean).join(' | ');
      const implementationTag = provider.implementationStatus === 'scaffold'
        ? ', scaffold-only'
        : (provider.implementationStatus === 'ready' ? ', runtime-ready' : '');
      const actionableNextStep = provider.implementationStatus === 'ready' ? null : provider.nextStep;
      return `- ${provider.name ?? provider.id} [${provider.status ?? 'unknown'}${provider.configured ? ', configured' : ''}${implementationTag}]: ${provider.setupHint ?? 'choose auth and default model'}${actionableNextStep ? `; next: ${actionableNextStep}` : ''}${(provider.modalities ?? []).length > 0 ? ` {${(provider.modalities ?? []).join(', ')}}` : ''}${providerDetails ? ` [${providerDetails}]` : ''}${provider.implementationPath ? ` @ ${provider.implementationPath}` : ''}${helperLine ? ` | helpers: ${helperLine}` : ''}`;
    }),
    remainingProviderQueueSummary,
  ].filter(Boolean).join('\n');
}

function summarizeCompactIntakeStatus(profile: IngestionProfileCommand | null | undefined): string | null {
  const intakeStatusSummary = typeof profile?.intakeStatusSummary === 'string'
    ? profile.intakeStatusSummary.trim()
    : '';

  if (intakeStatusSummary && intakeStatusSummary !== 'ready') {
    const [statusPrefix] = intakeStatusSummary.split(' — ');
    return statusPrefix?.trim() || intakeStatusSummary;
  }

  const materialCount = typeof profile?.materialCount === 'number' ? profile.materialCount : 0;
  if (profile?.intakeReady === true && materialCount === 0) {
    return 'ready';
  }

  return null;
}

function formatIngestionProfileLabel(profile: IngestionProfileCommand | null | undefined): string {
  const baseLabel = profile?.label ?? profile?.personId ?? 'unknown-profile';
  const compactIntakeStatus = summarizeCompactIntakeStatus(profile);

  return compactIntakeStatus
    ? `${baseLabel} [intake ${compactIntakeStatus}]`
    : baseLabel;
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
      || helperCommands.repairInvalidBundle
      || helperCommands.repairImportedInvalidBundle
      || helperCommands.importIntakeStale
      || helperCommands.importIntakeImported
      || helperCommands.refreshAllFoundation
      || helperCommands.refreshStaleFoundation
      || helperCommands.refreshFoundationBundle
      || (ingestion?.supportedImportTypes?.length ?? 0) > 0,
  );

  if (!ingestion || (!hasProfileData && !hasBootstrapData)) {
    return null;
  }

  const profileCommandRecords = (ingestion.importedIntakeBackfillProfileCount ?? 0) > 0 && (ingestion.profileCommands?.length ?? 0) > 0
    ? (ingestion.profileCommands ?? [])
    : ((ingestion.allProfileCommands?.length ?? 0) > 0
      ? (ingestion.allProfileCommands ?? [])
      : (ingestion.profileCommands ?? []));
  const visibleProfileCommands = profileCommandRecords.slice(0, 2);
  const remainingProfileCommands = profileCommandRecords.slice(2);
  const remainingProfileSummary = remainingProfileCommands.length > 0
    ? `- +${remainingProfileCommands.length} more profile${remainingProfileCommands.length === 1 ? '' : 's'}: ${remainingProfileCommands.map((profile) => formatIngestionProfileLabel(profile)).join(', ')}`
    : null;
  const recommendedPaths = Array.isArray(ingestion?.recommendedPaths)
    ? ingestion.recommendedPaths.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const nextIntakeLine = typeof ingestion?.recommendedAction === 'string' && ingestion.recommendedAction.length > 0
    ? `- next intake: ${ingestion.recommendedAction}${typeof ingestion?.recommendedCommand === 'string' && ingestion.recommendedCommand.length > 0 ? `; command ${ingestion.recommendedCommand}` : ''}${recommendedPaths.length > 0 ? ` @ ${recommendedPaths.join(', ')}` : ''}`
    : null;

  return [
    `- profiles: ${ingestion.profileCount ?? 0} total (${ingestion.importedProfileCount ?? 0} imported, ${ingestion.metadataOnlyProfileCount ?? 0} metadata-only)`,
    `- drafts: ${ingestion.readyProfileCount ?? 0} ready, ${ingestion.refreshProfileCount ?? 0} queued for refresh, ${ingestion.incompleteProfileCount ?? 0} incomplete`,
    `- metadata-only intake scaffolds: ${ingestion.intakeReadyProfileCount ?? 0} import-ready, ${ingestion.intakePartialProfileCount ?? 0} partial, ${ingestion.intakeMissingProfileCount ?? 0} missing`,
    (ingestion.importedProfileCount ?? 0) > 0
      ? `- imported intake: ${ingestion.importedIntakeReadyProfileCount ?? 0} ready, ${ingestion.importedIntakeBackfillProfileCount ?? 0} backfill${(ingestion.importedIntakeBackfillProfileCount ?? 0) === 1 ? '' : 's'}, ${ingestion.importedInvalidIntakeManifestProfileCount ?? 0} invalid manifest${(ingestion.importedInvalidIntakeManifestProfileCount ?? 0) === 1 ? '' : 's'}`
      : null,
    (ingestion.importedIntakeBackfillProfileCount ?? 0) > 0
      ? `- intake backfill: ${ingestion.importedIntakeBackfillProfileCount} imported profile${ingestion.importedIntakeBackfillProfileCount === 1 ? '' : 's'} queued`
      : null,
    (ingestion.importedInvalidIntakeManifestProfileCount ?? 0) > 0
      ? `- invalid intake manifests: ${ingestion.importedInvalidIntakeManifestProfileCount} imported profile${ingestion.importedInvalidIntakeManifestProfileCount === 1 ? '' : 's'} queued`
      : null,
    (ingestion.invalidMetadataOnlyIntakeManifestProfileCount ?? 0) > 0
      ? `- invalid intake manifests: ${ingestion.invalidMetadataOnlyIntakeManifestProfileCount} metadata-only profile${ingestion.invalidMetadataOnlyIntakeManifestProfileCount === 1 ? '' : 's'} queued`
      : null,
    (ingestion.supportedImportTypes ?? []).length > 0
      ? `- imports: ${(ingestion.supportedImportTypes ?? []).join(', ')}`
      : null,
    nextIntakeLine,
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
      pushHelperEntry(helperCommands.scaffoldImported ? `scaffold-imported ${helperCommands.scaffoldImported}` : null);
      pushHelperEntry(helperCommands.scaffoldBundle ? `scaffold-bundle ${helperCommands.scaffoldBundle}` : null);
      pushHelperEntry(helperCommands.scaffoldImportedBundle ? `scaffold-imported-bundle ${helperCommands.scaffoldImportedBundle}` : null);
      pushHelperEntry(helperCommands.repairInvalidBundle ? `repair-invalid-bundle ${helperCommands.repairInvalidBundle}` : null);
      pushHelperEntry(helperCommands.repairImportedInvalidBundle ? `repair-imported-invalid-bundle ${helperCommands.repairImportedInvalidBundle}` : null);
      pushHelperEntry(helperCommands.importManifest ? `manifest ${helperCommands.importManifest}` : null);
      pushHelperEntry(helperCommands.importManifestAndRefresh ? `manifest+refresh ${helperCommands.importManifestAndRefresh}` : null);
      pushHelperEntry(helperCommands.importIntakeAll ? `import-all ${helperCommands.importIntakeAll}` : null);
      pushHelperEntry(helperCommands.importIntakeStale ? `import-stale ${helperCommands.importIntakeStale}` : null);
      pushHelperEntry(helperCommands.importIntakeImported ? `import-imported ${helperCommands.importIntakeImported}` : null);
      pushHelperEntry(helperCommands.importIntakeBundle ? `import-bundle ${helperCommands.importIntakeBundle}` : null);
      pushHelperEntry(helperCommands.updateProfileBundle ? `update-bundle ${helperCommands.updateProfileBundle}` : null);
      pushHelperEntry(helperCommands.updateProfileAndRefreshBundle ? `sync-bundle ${helperCommands.updateProfileAndRefreshBundle}` : null);
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
      const intakeStatusSegment = typeof profile.intakeStatusSummary === 'string' && profile.intakeStatusSummary.length > 0 && profile.intakeStatusSummary !== 'ready'
        ? `, intake ${profile.intakeStatusSummary}`
        : '';
      const draftGapSegment = typeof profile.draftGapSummary === 'string' && profile.draftGapSummary.length > 0
        ? `; gaps ${profile.draftGapSummary}`
        : '';
      const scaffoldSegment = profile.intakeReady === false && profile.updateIntakeCommand
        ? `; scaffold ${profile.updateIntakeCommand}`
        : '';
      const intakeShortcutCommand = profile.importIntakeCommand ?? profile.importIntakeWithoutRefreshCommand ?? null;
      const intakeShortcutSegment = profile.intakeReady === true && intakeShortcutCommand
        ? ` | shortcut ${intakeShortcutCommand}`
        : '';
      const actionSegment = actionCommand ? ` | ${actionLabel} ${actionCommand}` : '';
      const syncCommand = profile.updateProfileAndRefreshCommand ?? null;
      const updateSegment = syncCommand
        ? ` | sync ${syncCommand}`
        : (profile.updateProfileCommand ? ` | update ${profile.updateProfileCommand}` : '');
      return `- ${profile.label ?? profile.personId}: ${materialSummary}${latestMaterial}${intakeStatusSegment}${draftGapSegment}${scaffoldSegment}${intakeShortcutSegment}${actionSegment}${updateSegment}`;
    }),
    remainingProfileSummary,
  ].filter(Boolean).join('\n');
}

function formatMemoryBucketSummary(memory: FoundationCore['memory'] = null) {
  if (!memory || typeof memory.readyBucketCount !== 'number' || typeof memory.totalBucketCount !== 'number') {
    return null;
  }

  const populatedBuckets = Array.isArray(memory.populatedBuckets)
    ? memory.populatedBuckets.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const emptyBuckets = Array.isArray(memory.emptyBuckets)
    ? memory.emptyBuckets.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];

  return `; buckets ${memory.readyBucketCount}/${memory.totalBucketCount} ready${populatedBuckets.length > 0 ? ` (${populatedBuckets.join(', ')})` : ''}${emptyBuckets.length > 0 ? `, missing ${emptyBuckets.join(', ')}` : ''}`;
}

function formatRootSectionSummary(
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

  return `; root sections ${resolvedReadySectionCount}/${resolvedTotalSectionCount} ready${normalizedReadySections.length > 0 ? ` (${normalizedReadySections.join(', ')})` : ''}${normalizedMissingSections.length > 0 ? `, missing ${normalizedMissingSections.join(', ')}` : ''}`;
}

function formatThinSectionProgress(readySections: string[] | undefined, missingSections: string[] | undefined): string {
  const normalizedReadySections = Array.isArray(readySections)
    ? readySections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const normalizedMissingSections = Array.isArray(missingSections)
    ? missingSections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const totalSectionCount = normalizedReadySections.length + normalizedMissingSections.length;

  if (totalSectionCount === 0) {
    return '';
  }

  const readySummary = normalizedReadySections.length > 0
    ? `sections ${normalizedReadySections.length}/${totalSectionCount} ready (${normalizedReadySections.join(', ')})`
    : `sections 0/${totalSectionCount} ready`;

  return `${readySummary}${normalizedMissingSections.length > 0 ? `, missing ${normalizedMissingSections.join(', ')}` : ''}`;
}

function formatQueuedAreaSectionContext(area: FoundationCoreMaintenanceQueueItem): string {
  const contextParts: string[] = [];
  const rootSummary = formatThinSectionProgress(area.rootThinReadySections, area.rootThinMissingSections);
  if (rootSummary) {
    contextParts.push(`root ${rootSummary}`);
  }

  const thinSectionPaths = new Set<string>([
    ...Object.keys(area.thinReadySections ?? {}),
    ...Object.keys(area.thinMissingSections ?? {}),
  ]);
  const thinPathSummaries = Array.from(thinSectionPaths)
    .sort((left, right) => left.localeCompare(right))
    .map((thinPath) => {
      const summary = formatThinSectionProgress(area.thinReadySections?.[thinPath], area.thinMissingSections?.[thinPath]);
      if (!summary) {
        return null;
      }

      const labelMatch = thinPath.match(/^skills\/([^/]+)\/SKILL\.md$/);
      const label = labelMatch?.[1] ?? thinPath;
      return `${label} ${summary}`;
    })
    .filter((value): value is string => Boolean(value));

  if (thinPathSummaries.length > 0) {
    contextParts.push(`thin docs ${thinPathSummaries.join('; ')}`);
  }

  return contextParts.length > 0 ? `; context ${contextParts.join(' | ')}` : '';
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
    const sectionContext = formatQueuedAreaSectionContext(area);
    return `- ${area.area ?? 'foundation'} [${area.status ?? 'unknown'}]: ${area.action ?? area.summary ?? 'needs review'}${(area.paths ?? []).length > 0 ? ` @ ${(area.paths ?? []).join(', ')}` : ''}${sectionContext}${command ? `; command ${command}` : ''}`;
  });
  const remainingQueuedAreas = queuedAreas.slice(2);
  const remainingQueuedAreaSummary = remainingQueuedAreas.length > 0
    ? `- +${remainingQueuedAreas.length} more queued: ${remainingQueuedAreas.map((area) => {
      const summary = typeof area.summary === 'string' && area.summary.length > 0
        ? ` (${area.summary})`
        : '';
      return `${area.area ?? 'foundation'} [${area.status ?? 'unknown'}]${summary}`;
    }).join(', ')}`
    : null;
  const recommendedRepairLine = maintenance?.recommendedAction
    ? `- next repair: ${maintenance.recommendedAction}${maintenance.recommendedCommand ? `; command ${maintenance.recommendedCommand}` : ''}${(maintenance.recommendedPaths ?? []).length > 0 ? ` @ ${(maintenance.recommendedPaths ?? []).join(', ')}` : ''}`
    : null;

  return [
    coverageLine,
    maintenance
      ? `- queue: ${maintenance.readyAreaCount ?? 0} ready, ${maintenance.thinAreaCount ?? 0} thin, ${maintenance.missingAreaCount ?? 0} missing`
      : null,
    memory
      ? `- memory: README ${memory.hasRootDocument ? 'yes' : 'no'}, daily ${memory.dailyCount ?? 0}, long-term ${memory.longTermCount ?? 0}, scratch ${memory.scratchCount ?? 0}${formatMemoryBucketSummary(memory) ?? ''}${(memory.sampleEntries ?? []).length > 0 ? `; samples: ${memory.sampleEntries?.join(', ')}` : ''}${memory.rootExcerpt ? `; root: ${memory.rootExcerpt}${memory.rootPath ? ` @ ${memory.rootPath}` : ''}` : ''}${formatRootSectionSummary(memory.rootReadySections, memory.rootMissingSections, memory.rootReadySectionCount, memory.rootTotalSectionCount)}`
      : null,
    skills
      ? `- skills: ${skills.count ?? 0} registered, ${skills.documentedCount ?? 0} documented${(skills.sample ?? []).length > 0 ? ` (${skills.sample?.join(', ')})` : ''}${skills.rootExcerpt ? `; root: ${skills.rootExcerpt}${skills.rootPath ? ` @ ${skills.rootPath}` : ''}` : (skills.hasRootDocument === false && skills.rootPath ? `; root missing @ ${skills.rootPath}` : '')}${formatRootSectionSummary(skills.rootReadySections, skills.rootMissingSections, skills.rootReadySectionCount, skills.rootTotalSectionCount)}${(skills.samplePaths ?? []).length > 0 ? `; docs: ${skills.samplePaths?.join(', ')}` : ''}${(skills.sampleExcerpts ?? []).length > 0 ? `; excerpts: ${skills.sampleExcerpts?.join(' | ')}` : ''}${(skills.undocumentedSample ?? []).length > 0 ? `; missing docs: ${skills.undocumentedSample?.join(', ')}${(skills.undocumentedPaths ?? []).length > 0 ? ` @ ${skills.undocumentedPaths?.join(', ')}` : ''}` : ''}${(skills.thinSample ?? []).length > 0 ? `; thin docs: ${skills.thinSample?.map((skillName) => {
        const readySections = skills.thinReadySections?.[skillName] ?? [];
        const missingSections = skills.thinMissingSections?.[skillName] ?? [];
        const readySummary = readySections.length > 0
          ? ` sections ${readySections.length}/${readySections.length + missingSections.length} ready (${readySections.join(', ')})`
          : '';
        const missingSummary = missingSections.length > 0
          ? `${readySections.length > 0 ? ', ' : ' '}missing ${missingSections.join(', ')}`
          : '';
        return `${skillName}${readySummary}${missingSummary}`;
      }).join(', ')}${(skills.thinPaths ?? []).length > 0 ? ` @ ${skills.thinPaths?.join(', ')}` : ''}` : ''}`
      : null,
    soul
      ? `- soul: ${soul.present ? 'present' : 'missing'}, ${soul.lineCount ?? 0} lines${(soul.rootExcerpt ?? soul.excerpt) ? `, ${soul.rootExcerpt ?? soul.excerpt}` : ''}${(soul.rootPath ?? soul.path) ? ` @ ${soul.rootPath ?? soul.path}` : ''}${soul.present && (soul.lineCount ?? 0) > 0 && typeof soul.readySectionCount === 'number' && typeof soul.totalSectionCount === 'number' ? `, sections ${soul.readySectionCount}/${soul.totalSectionCount} ready` : ''}${soul.present && (soul.lineCount ?? 0) > 0 && (soul.readySections ?? []).length > 0 ? ` (${soul.readySections?.join(', ')})` : ''}${soul.present && (soul.lineCount ?? 0) > 0 && (soul.missingSections ?? []).length > 0 ? `, missing ${(soul.missingSections ?? []).join(', ')}` : ''}`
      : null,
    voice
      ? `- voice: ${voice.present ? 'present' : 'missing'}, ${voice.lineCount ?? 0} lines${(voice.rootExcerpt ?? voice.excerpt) ? `, ${voice.rootExcerpt ?? voice.excerpt}` : ''}${(voice.rootPath ?? voice.path) ? ` @ ${voice.rootPath ?? voice.path}` : ''}${voice.present && (voice.lineCount ?? 0) > 0 && typeof voice.readySectionCount === 'number' && typeof voice.totalSectionCount === 'number' ? `, sections ${voice.readySectionCount}/${voice.totalSectionCount} ready` : ''}${voice.present && (voice.lineCount ?? 0) > 0 && (voice.readySections ?? []).length > 0 ? ` (${voice.readySections?.join(', ')})` : ''}${voice.present && (voice.lineCount ?? 0) > 0 && (voice.missingSections ?? []).length > 0 ? `, missing ${(voice.missingSections ?? []).join(', ')}` : ''}`
      : null,
    recommendedActions.length > 0
      ? `- next actions: ${recommendedActions.join(' | ')}`
      : null,
    recommendedRepairLine,
    ...queuedAreaLines,
    remainingQueuedAreaSummary,
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
  ].filter(Boolean).join('\n');
}

function buildWorkLoopBlock(workLoop: WorkLoopSummary = null) {
  if (!workLoop || (workLoop.priorityCount ?? workLoop.priorities?.length ?? 0) === 0) {
    return null;
  }

  const leadingPriority = workLoop.leadingPriority;
  const currentPriority = workLoop.currentPriority;
  const priorities = workLoop.priorities ?? [];
  const showLeadingPriority = Boolean(
    leadingPriority && (!currentPriority || (leadingPriority.id ?? leadingPriority.label) !== (currentPriority.id ?? currentPriority.label)),
  );
  const cadenceLine = workLoop.intervalMinutes
    ? `- cadence: every ${workLoop.intervalMinutes} minute${workLoop.intervalMinutes === 1 ? '' : 's'}`
    : null;
  const objectiveLine = (workLoop.objectives ?? []).length > 0
    ? `- objectives: ${(workLoop.objectives ?? []).join(' | ')}`
    : null;
  const orderLine = priorities.length > 0
    ? `- order: ${priorities.map((priority) => `${priority.id ?? priority.label ?? 'priority'}:${priority.status ?? 'unknown'}`).join(' | ')}`
    : null;

  const prioritySummary = [`${workLoop.readyPriorityCount ?? 0} ready`, `${workLoop.queuedPriorityCount ?? 0} queued`];
  if ((workLoop.blockedPriorityCount ?? 0) > 0) {
    prioritySummary.push(`${workLoop.blockedPriorityCount ?? 0} blocked`);
  }

  return [
    `- priorities: ${workLoop.priorityCount ?? priorities.length} total (${prioritySummary.join(', ')})`,
    cadenceLine,
    showLeadingPriority && leadingPriority
      ? `- lead: ${leadingPriority.label ?? leadingPriority.id ?? 'Leading priority'} [${leadingPriority.status ?? 'unknown'}] — ${leadingPriority.summary ?? 'needs review'}`
      : null,
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

function buildSoulPreviewBlock(soul: SoulSummary): string {
  if (!soul) {
    return '- unavailable';
  }

  const excerpt = typeof soul.excerpt === 'string' && soul.excerpt.length > 0 ? soul.excerpt : 'n/a';
  const coreTruthCount = Array.isArray(soul.coreTruths) ? soul.coreTruths.length : 0;
  const boundaryCount = Array.isArray(soul.boundaries) ? soul.boundaries.length : 0;
  const vibeCount = Array.isArray(soul.vibe) ? soul.vibe.length : 0;
  const continuityCount = Array.isArray(soul.continuity) ? soul.continuity.length : 0;

  return [
    `- excerpt: ${excerpt}`,
    `- core truths: ${coreTruthCount}`,
    `- boundaries: ${boundaryCount}`,
    `- vibe: ${vibeCount}`,
    `- continuity: ${continuityCount}`,
  ].join('\n');
}

function buildMemoryPreviewBlock(memory: MemorySummary): string {
  if (!memory) {
    return '- unavailable';
  }

  const shortTermEntries = memory.shortTermEntries ?? 0;
  const longTermEntries = memory.longTermEntries ?? 0;
  const totalEntries = memory.totalEntries ?? (shortTermEntries + longTermEntries);

  return [
    `- short-term: ${shortTermEntries}`,
    `- long-term: ${longTermEntries}`,
    `- total: ${totalEntries}`,
    `- coverage: short-term ${memory.shortTermPresent ? 'yes' : 'no'}, long-term ${memory.longTermPresent ? 'yes' : 'no'}`,
  ].join('\n');
}

function buildSkillsPreviewBlock(skills: SkillRegistrySummary): string {
  if (!skills) {
    return '- unavailable';
  }

  const truncateDescription = (value: string, maxLength = 96) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  };

  const skillRecords = Array.isArray(skills.skills)
    ? skills.skills.filter((skill): skill is { name?: string; id?: string; status?: string; description?: string | null; foundationStatus?: string | null } => Boolean(skill))
    : [];
  const prioritizedSkillRecords = [...skillRecords].sort((left, right) => {
    const leftHasDescription = typeof left.description === 'string' && left.description.trim().length > 0;
    const rightHasDescription = typeof right.description === 'string' && right.description.trim().length > 0;
    if (leftHasDescription !== rightHasDescription) {
      return leftHasDescription ? -1 : 1;
    }

    return 0;
  });
  const visibleSkills = prioritizedSkillRecords.slice(0, 3).map((skill) => {
    const label = typeof skill.name === 'string' && skill.name.length > 0
      ? skill.name
      : typeof skill.id === 'string' && skill.id.length > 0
        ? skill.id
        : 'unknown';
    const status = typeof skill.status === 'string' && skill.status.length > 0 ? skill.status : 'unknown';
    const foundationStatus = typeof skill.foundationStatus === 'string' && skill.foundationStatus.length > 0
      ? skill.foundationStatus
      : null;
    const statusLabel = foundationStatus && foundationStatus !== 'ready'
      ? `${status}, ${foundationStatus}`
      : status;
    const description = typeof skill.description === 'string' && skill.description.trim().length > 0
      ? `: ${truncateDescription(skill.description)}`
      : '';
    return `${label} [${statusLabel}]${description}`;
  });
  const remainingSkillCount = Math.max(0, skillRecords.length - visibleSkills.length);
  const topSkills = visibleSkills.length > 0
    ? [
      ...visibleSkills,
      ...(remainingSkillCount > 0 ? [`+${remainingSkillCount} more`] : []),
    ].join('; ')
    : 'none';

  return [
    `- total: ${skills.skillCount ?? 0}`,
    `- discovered: ${skills.discoveredCount ?? 0}`,
    `- custom: ${skills.customCount ?? 0}`,
    `- top skills: ${topSkills}`,
  ].join('\n');
}

function formatVoicePreviewItems(label: string, values: unknown): string {
  const items = Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  return items.length > 0
    ? `- ${label}: ${items.length} (${items.join('; ')})`
    : `- ${label}: 0`;
}

function buildVoicePreviewBlock(voice: VoiceSummary): string {
  if (!voice) {
    return '- unavailable';
  }

  const tone = typeof voice.tone === 'string' && voice.tone.length > 0 ? voice.tone : 'n/a';
  const style = typeof voice.style === 'string' && voice.style.length > 0 ? voice.style : 'unknown';

  return [
    `- tone: ${tone}`,
    `- style: ${style}`,
    formatVoicePreviewItems('constraints', voice.constraints),
    formatVoicePreviewItems('signatures', voice.signatures),
    formatVoicePreviewItems('language hints', voice.languageHints),
  ].join('\n');
}

export class PromptAssembler {
  profile: AgentSummary;
  soul: string;
  soulProfile: SoulSummary;
  voice: VoiceSummary;
  memory: unknown;
  memorySummary: MemorySummary;
  skills: unknown;
  skillsSummary: SkillRegistrySummary;
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
    soulProfile = null,
    voice,
    memory,
    memorySummary = null,
    skills,
    skillsSummary = null,
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
    this.soulProfile = soulProfile;
    this.voice = voice;
    this.memory = memory;
    this.memorySummary = memorySummary;
    this.skills = skills;
    this.skillsSummary = skillsSummary;
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
    const soulPreviewBlock = buildSoulPreviewBlock(this.soulProfile);
    const voicePreviewBlock = buildVoicePreviewBlock(this.voice);
    const memoryPreviewBlock = buildMemoryPreviewBlock(this.memorySummary);
    const skillsPreviewBlock = buildSkillsPreviewBlock(this.skillsSummary);

    return [
      `Name: ${this.profile.name}`,
      `Soul summary: ${this.profile.soul}`,
      '',
      'Soul profile:',
      soulPreviewBlock,
      '',
      'Voice profile:',
      voicePreviewBlock,
      '',
      'Memory store:',
      memoryPreviewBlock,
      '',
      'Skill registry:',
      skillsPreviewBlock,
      ingestionEntranceBlock ? '' : null,
      ingestionEntranceBlock ? 'Ingestion entrance:' : null,
      ingestionEntranceBlock,
      workLoopBlock ? '' : null,
      workLoopBlock ? 'Work loop:' : null,
      workLoopBlock,
      coreFoundationBlock ? '' : null,
      coreFoundationBlock ? 'Core foundation:' : null,
      coreFoundationBlock,
      deliveryFoundationBlock ? '' : null,
      deliveryFoundationBlock ? 'Delivery foundation:' : null,
      deliveryFoundationBlock,
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
      coreFoundationBlock ? 'Core foundation:' : null,
      coreFoundationBlock,
      '',
      deliveryFoundationBlock ? 'Delivery foundation:' : null,
      deliveryFoundationBlock,
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

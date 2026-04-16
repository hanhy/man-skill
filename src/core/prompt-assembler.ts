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

type FoundationRollup = {
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

type FoundationCore = {
  memory?: {
    hasRootDocument?: boolean;
    dailyCount?: number;
    longTermCount?: number;
    scratchCount?: number;
    totalEntries?: number;
  };
  skills?: {
    count?: number;
    sample?: string[];
  };
  soul?: CoreDocumentFoundationSummary;
  voice?: CoreDocumentFoundationSummary;
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

export interface PromptAssemblerOptions {
  profile: AgentSummary;
  soul?: string;
  voice: VoiceSummary;
  memory: unknown;
  skills: unknown;
  channels: unknown;
  models: unknown;
  profiles?: ProfileSnapshot[];
  foundationRollup?: FoundationRollup;
  foundationCore?: FoundationCore;
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

function buildFoundationRollupBlock(foundationRollup: FoundationRollup = null) {
  const memory = foundationRollup?.memory;
  const voice = foundationRollup?.voice;
  const soul = foundationRollup?.soul;
  const skills = foundationRollup?.skills;

  if (!memory && !voice && !soul && !skills) {
    return null;
  }

  const totalProfiles = [memory?.profileCount, voice?.profileCount, soul?.profileCount, skills?.profileCount]
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

function buildCoreFoundationBlock(foundationCore: FoundationCore = null) {
  if (!foundationCore) {
    return null;
  }

  const memory = foundationCore.memory;
  const skills = foundationCore.skills;
  const soul = foundationCore.soul;
  const voice = foundationCore.voice;

  return [
    memory
      ? `- memory: README ${memory.hasRootDocument ? 'yes' : 'no'}, daily ${memory.dailyCount ?? 0}, long-term ${memory.longTermCount ?? 0}, scratch ${memory.scratchCount ?? 0}`
      : null,
    skills
      ? `- skills: ${skills.count ?? 0} registered${(skills.sample ?? []).length > 0 ? ` (${skills.sample?.join(', ')})` : ''}`
      : null,
    soul
      ? `- soul: ${soul.present ? 'present' : 'missing'}, ${soul.lineCount ?? 0} lines${soul.excerpt ? `, ${soul.excerpt}` : ''}`
      : null,
    voice
      ? `- voice: ${voice.present ? 'present' : 'missing'}, ${voice.lineCount ?? 0} lines${voice.excerpt ? `, ${voice.excerpt}` : ''}`
      : null,
  ].filter(Boolean).join('\n');
}

export class PromptAssembler {
  profile: AgentSummary;
  soul: string;
  voice: VoiceSummary;
  memory: unknown;
  skills: unknown;
  channels: unknown;
  models: unknown;
  profiles: ProfileSnapshot[];
  foundationRollup: FoundationRollup;
  foundationCore: FoundationCore;

  constructor({
    profile,
    soul = '',
    voice,
    memory,
    skills,
    channels,
    models,
    profiles = [],
    foundationRollup = null,
    foundationCore = null,
  }: PromptAssemblerOptions) {
    this.profile = profile;
    this.soul = soul;
    this.voice = voice;
    this.memory = memory;
    this.skills = skills;
    this.channels = channels;
    this.models = models;
    this.profiles = profiles;
    this.foundationRollup = foundationRollup;
    this.foundationCore = foundationCore;
  }

  buildPreview(maxLength = 1200) {
    const profileSnapshots = buildProfileSnapshots(this.profiles);
    const foundationRollupBlock = buildFoundationRollupBlock(this.foundationRollup);
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
      coreFoundationBlock ? '' : null,
      coreFoundationBlock ? 'Core foundation:' : null,
      coreFoundationBlock,
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
    const foundationRollupBlock = buildFoundationRollupBlock(this.foundationRollup);
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
      coreFoundationBlock ? 'Core foundation:' : null,
      coreFoundationBlock,
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

function formatMaterialCount(count) {
  return `${count} material${count === 1 ? '' : 's'}`;
}

function formatMaterialTypes(materialTypes = {}) {
  const entries = Object.entries(materialTypes).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return 'no typed materials';
  }

  return entries.map(([type, count]) => `${type}:${count}`).join(', ');
}

function formatDraftStatus(status = {}) {
  const freshness = status.needsRefresh ? 'stale' : 'fresh';
  const completeness = status.complete ? 'complete' : `missing ${(status.missingDrafts ?? []).join('/') || 'drafts'}`;
  const generatedAt = status.generatedAt ? `, generated ${status.generatedAt}` : '';
  return `${freshness}, ${completeness}${generatedAt}`;
}

function cleanHighlight(value) {
  return typeof value === 'string' ? value.replace(/^-\s*/, '').trim() : '';
}

function formatProfileSnapshot(profile = {}) {
  const lines = [
    `- ${profile.id}: ${formatMaterialCount(profile.materialCount ?? 0)} (${formatMaterialTypes(profile.materialTypes)})`,
  ];

  if (profile.latestMaterialAt) {
    lines.push(`  latest material: ${profile.latestMaterialAt}`);
  }

  if (profile.foundationDraftStatus) {
    lines.push(`  drafts: ${formatDraftStatus(profile.foundationDraftStatus)}`);
  }

  if (profile.foundationReadiness) {
    lines.push(
      `  memory candidates: ${profile.foundationReadiness.memory?.candidateCount ?? 0} | voice: ${profile.foundationReadiness.voice?.candidateCount ?? 0} | soul: ${profile.foundationReadiness.soul?.candidateCount ?? 0} | skills: ${profile.foundationReadiness.skills?.candidateCount ?? 0}`,
    );
  }

  const memoryHighlights = profile.foundationDraftSummaries?.memory?.latestSummaries ?? [];
  if (memoryHighlights.length > 0) {
    lines.push(`  memory highlights: ${memoryHighlights.join(' | ')}`);
  }

  const voiceHighlights = (profile.foundationDraftSummaries?.voice?.highlights ?? []).map(cleanHighlight).filter(Boolean);
  if (voiceHighlights.length > 0) {
    lines.push(`  voice highlights: ${voiceHighlights.join(' | ')}`);
  }

  const soulHighlights = (profile.foundationDraftSummaries?.soul?.highlights ?? []).map(cleanHighlight).filter(Boolean);
  if (soulHighlights.length > 0) {
    lines.push(`  soul highlights: ${soulHighlights.join(' | ')}`);
  }

  const skillSignals = profile.foundationReadiness?.skills?.sampleExcerpts ?? [];
  if (skillSignals.length > 0) {
    lines.push(`  skills signals: ${skillSignals.join(' | ')}`);
  }

  return lines.join('\n');
}

function buildProfileSnapshots(profiles = []) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return null;
  }

  return profiles.map((profile) => formatProfileSnapshot(profile)).join('\n');
}

export class PromptAssembler {
  constructor({ profile, soul, voice, memory, skills, channels, models, profiles = [] } = {}) {
    this.profile = profile;
    this.soul = soul;
    this.voice = voice;
    this.memory = memory;
    this.skills = skills;
    this.channels = channels;
    this.models = models;
    this.profiles = profiles;
  }

  buildSystemPrompt() {
    const profileSnapshots = buildProfileSnapshots(this.profiles);

    return [
      `Name: ${this.profile.name}`,
      `Soul summary: ${this.profile.soul}`,
      '',
      'Identity:',
      JSON.stringify(this.profile.identity, null, 2),
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
      'Profiles:',
      JSON.stringify(this.profiles, null, 2),
      '',
      'Profile foundation snapshots:',
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

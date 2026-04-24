import { buildFoundationDraftPaths } from './foundation-draft-paths.ts';
import { buildProfileLabel as formatProfileLabel } from './profile-label.js';

function cleanHighlight(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/^-\s*/, '').trim() : null;
}

function collectUnique(values: unknown[], limit = 5): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    results.push(normalized);

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function countGenerated(profiles: any[], key: string): number {
  return profiles.filter((profile) => profile.foundationDraftSummaries?.[key]?.generated).length;
}

function countCandidateProfiles(profiles: any[], key: string): number {
  return profiles.filter((profile) => (profile.foundationReadiness?.[key]?.candidateCount ?? 0) > 0).length;
}

function countCandidates(profiles: any[], key: string): number {
  return profiles.reduce((total, profile) => total + (profile.foundationReadiness?.[key]?.candidateCount ?? 0), 0);
}

function countStringValues(values: unknown[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (typeof value !== 'string') {
      return counts;
    }

    const normalized = value.trim();
    if (!normalized) {
      return counts;
    }

    counts[normalized] = (counts[normalized] ?? 0) + 1;
    return counts;
  }, {});
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeMaterialTypes(materialTypes: unknown): Record<string, number> | null {
  if (!materialTypes || typeof materialTypes !== 'object') {
    return null;
  }

  const entries = Object.entries(materialTypes)
    .filter(([key, value]) => typeof key === 'string' && key.trim().length > 0 && Number.isFinite(value) && Number(value) > 0)
    .map(([key, value]) => [key.trim(), Number(value)] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function formatMaterialTypes(materialTypes: Record<string, number> | null): string | null {
  if (!materialTypes) {
    return null;
  }

  const parts = Object.entries(materialTypes)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .map(([type, count]) => `${type}:${count}`);

  return parts.length > 0 ? parts.join(', ') : null;
}

function summarizeDraftSources(profile: any): string | null {
  const draftKinds = [
    { key: 'memory', summary: profile?.foundationDraftSummaries?.memory },
    { key: 'skills', summary: profile?.foundationDraftSummaries?.skills },
    { key: 'soul', summary: profile?.foundationDraftSummaries?.soul },
    { key: 'voice', summary: profile?.foundationDraftSummaries?.voice },
  ] as const;

  const sourceSummaries = draftKinds
    .map(({ key, summary }) => {
      if (!summary) {
        return null;
      }

      const path = normalizeOptionalString(summary.path);
      const latestMaterialSourcePath = normalizeOptionalString(summary.latestMaterialSourcePath);
      const sourceCount = Number(summary.sourceCount ?? 0);
      const entryCount = key === 'memory' ? Number(summary.entryCount ?? 0) : 0;
      const materialTypes = formatMaterialTypes(normalizeMaterialTypes(summary.materialTypes));

      if (!path && !latestMaterialSourcePath && sourceCount <= 0 && entryCount <= 0 && !materialTypes) {
        return null;
      }

      const sourceLabel = sourceCount > 0 ? formatCountLabel(sourceCount, 'source') : null;
      const entryLabel = entryCount > 0 ? formatCountLabel(entryCount, 'entry', 'entries') : null;
      const latestSourceLabel = latestMaterialSourcePath ? `latest @ ${latestMaterialSourcePath}` : null;
      const sourceDetailLabel = sourceLabel ? `${sourceLabel}${materialTypes ? ` (${materialTypes})` : ''}` : null;
      const fallbackDetails = [
        !sourceLabel && materialTypes ? `types ${materialTypes}` : null,
        entryLabel,
        latestSourceLabel,
      ].filter((value): value is string => typeof value === 'string' && value.length > 0);
      const parts = [
        sourceDetailLabel,
        entryLabel,
        latestSourceLabel,
      ].filter((value): value is string => typeof value === 'string' && value.length > 0);

      if (!sourceLabel && path) {
        return fallbackDetails.length > 0 ? `${key} @ ${path} (${fallbackDetails.join(', ')})` : `${key} @ ${path}`;
      }

      return parts.length > 0 ? `${key} ${parts.join(', ')}` : null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  return sourceSummaries.length > 0 ? sourceSummaries.join(' | ') : null;
}

function buildProfileLabel(profile: any): string {
  const profileId = profile?.id ?? 'unknown-profile';
  const displayName = profile?.profile?.displayName;
  return formatProfileLabel(profileId, displayName);
}

const FOUNDATION_DRAFT_KEYS = ['memory', 'skills', 'soul', 'voice'] as const;
const STRUCTURED_DRAFT_TOTAL_SECTION_COUNTS = {
  skills: 3,
  soul: 4,
  voice: 4,
} as const;

function countGeneratedDrafts(profile: any): number {
  return FOUNDATION_DRAFT_KEYS.filter((key) => profile?.foundationDraftSummaries?.[key]?.generated).length;
}

function countCandidateDrafts(profile: any): number {
  return FOUNDATION_DRAFT_KEYS.filter((key) => (profile?.foundationReadiness?.[key]?.candidateCount ?? 0) > 0).length;
}

function countSectionDraftGaps(summary: any): number {
  const missingSections = Array.isArray(summary?.missingSections)
    ? summary.missingSections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  if (missingSections.length > 0) {
    return missingSections.length;
  }

  const totalSectionCount = Number(summary?.totalSectionCount ?? 0);
  const readySectionCount = Number(summary?.readySectionCount ?? totalSectionCount);
  if (!Number.isFinite(totalSectionCount) || totalSectionCount <= 0) {
    return 0;
  }

  if (!Number.isFinite(readySectionCount)) {
    return totalSectionCount;
  }

  return Math.max(totalSectionCount - readySectionCount, 0);
}

function buildDraftGapCounts(profile: any): Record<string, number> {
  const counts: Record<string, number> = {};
  const missingDrafts = new Set(
    Array.isArray(profile?.foundationDraftStatus?.missingDrafts)
      ? profile.foundationDraftStatus.missingDrafts.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [],
  );

  if (missingDrafts.has('memory')) {
    counts.memory = 1;
  }

  const skillsGapCount = countSectionDraftGaps(profile?.foundationDraftSummaries?.skills);
  if (skillsGapCount > 0 || missingDrafts.has('skills')) {
    counts.skills = skillsGapCount > 0 ? skillsGapCount : STRUCTURED_DRAFT_TOTAL_SECTION_COUNTS.skills;
  }

  const soulGapCount = countSectionDraftGaps(profile?.foundationDraftSummaries?.soul);
  if (soulGapCount > 0 || missingDrafts.has('soul')) {
    counts.soul = soulGapCount > 0 ? soulGapCount : STRUCTURED_DRAFT_TOTAL_SECTION_COUNTS.soul;
  }

  const voiceGapCount = countSectionDraftGaps(profile?.foundationDraftSummaries?.voice);
  if (voiceGapCount > 0 || missingDrafts.has('voice')) {
    counts.voice = voiceGapCount > 0 ? voiceGapCount : STRUCTURED_DRAFT_TOTAL_SECTION_COUNTS.voice;
  }

  return counts;
}

function countDraftGaps(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

const FOUNDATION_REFRESH_REASON_SCORES: Record<string, number> = {
  'profile metadata drift': 4,
  'metadata-updated': 4,
  'draft metadata drift': 2,
  'new materials': 1,
};

function scoreRefreshReasons(refreshReasons: unknown): number {
  return Array.isArray(refreshReasons)
    ? refreshReasons.reduce((score, reason) => {
      if (typeof reason !== 'string') {
        return score;
      }

      return score + (FOUNDATION_REFRESH_REASON_SCORES[reason.trim()] ?? 0);
    }, 0)
    : 0;
}

function mergeCountMaps(countMaps: Array<Record<string, number> | null | undefined>): Record<string, number> {
  return countMaps.reduce<Record<string, number>>((mergedCounts, countMap) => {
    if (!countMap || typeof countMap !== 'object') {
      return mergedCounts;
    }

    for (const [key, value] of Object.entries(countMap)) {
      if (!Number.isFinite(value) || value <= 0) {
        continue;
      }

      mergedCounts[key] = (mergedCounts[key] ?? 0) + value;
    }

    return mergedCounts;
  }, {});
}

function buildCommandBundle(commands: Array<string | null | undefined> = []): string | null {
  const normalizedCommands = commands.filter((command): command is string => typeof command === 'string' && command.length > 0);
  if (normalizedCommands.length === 0) {
    return null;
  }

  if (normalizedCommands.length === 1) {
    return normalizedCommands[0];
  }

  return normalizedCommands.map((command) => `(${command})`).join(' && ');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildFoundationRefreshCommand(profileId: string | null | undefined): string | null {
  if (typeof profileId !== 'string' || profileId.length === 0) {
    return null;
  }

  return `node src/index.js update foundation --person ${shellQuote(profileId)}`;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(values: unknown): string[] {
  return Array.from(new Set(
    Array.isArray(values)
      ? values
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
      : [],
  ));
}

function collectCandidateSignalTypes(signal: any, primarySource: 'latest' | 'sample' = 'sample'): string[] {
  const primaryTypes = normalizeStringArray(primarySource === 'latest'
    ? signal?.latestTypes
    : signal?.sampleTypes);
  const secondaryTypes = normalizeStringArray(primarySource === 'latest'
    ? signal?.sampleTypes
    : signal?.latestTypes);

  return Array.from(new Set([...primaryTypes, ...secondaryTypes]));
}

function buildCandidateSignalSummary(profile: any): string | null {
  const readiness = profile?.foundationReadiness ?? {};
  let hasNonZeroCandidate = false;
  const segments = ['memory', 'voice', 'soul', 'skills'].map((key) => {
    const signal = readiness?.[key] ?? {};
    const candidateCount = Number(signal?.candidateCount ?? 0);
    const normalizedCount = Number.isFinite(candidateCount) && candidateCount > 0 ? candidateCount : 0;
    if (normalizedCount > 0) {
      hasNonZeroCandidate = true;
    }
    const types = collectCandidateSignalTypes(signal, key === 'memory' ? 'latest' : 'sample');
    const typeSuffix = normalizedCount > 0 && types.length > 0
      ? ` (${types.sort((left, right) => left.localeCompare(right)).join(', ')})`
      : '';
    return `${key} ${normalizedCount}${typeSuffix}`;
  });

  return hasNonZeroCandidate && segments.length > 0 ? segments.join(' | ') : null;
}

function formatHeadingAliasSummary(headingAliases: unknown): string | null {
  const normalizedAliases = Array.from(new Set(
    Array.isArray(headingAliases)
      ? headingAliases
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
      : [],
  ));

  if (normalizedAliases.length === 0) {
    return null;
  }

  return `; aliases ${normalizedAliases.join(', ')}`;
}

function summarizeDraftGap(summary: any, key: string): string | null {
  const totalSectionCount = summary?.totalSectionCount ?? 0;
  const readySectionCount = summary?.readySectionCount ?? totalSectionCount;
  const readySections = Array.isArray(summary?.readySections)
    ? summary.readySections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  const missingSections = Array.isArray(summary?.missingSections)
    ? summary.missingSections.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];

  if (totalSectionCount <= 0) {
    return null;
  }

  const hasGap = missingSections.length > 0 || readySectionCount < totalSectionCount;
  if (!hasGap) {
    return null;
  }

  const headingAliasSummary = formatHeadingAliasSummary(summary?.headingAliases);

  return `${key} ${readySectionCount}/${totalSectionCount} ready${readySections.length > 0 ? ` (${readySections.join(', ')})` : ''}${missingSections.length > 0 ? `, missing ${missingSections.join('/')}` : ''}${headingAliasSummary ?? ''}`;
}

function summarizeMemoryDraftGap(profile: any): string | null {
  const missingDrafts = Array.isArray(profile?.foundationDraftStatus?.missingDrafts)
    ? profile.foundationDraftStatus.missingDrafts
    : [];
  if (!missingDrafts.includes('memory')) {
    return null;
  }

  const candidateCount = Number(profile?.foundationReadiness?.memory?.candidateCount ?? 0);
  const summaryPreview = collectUnique([
    ...(profile?.foundationDraftSummaries?.memory?.latestSummaries ?? []),
    ...(profile?.foundationReadiness?.memory?.sampleSummaries ?? []),
  ], 1);

  if (candidateCount > 0) {
    const candidateLabel = `${candidateCount} candidate${candidateCount === 1 ? '' : 's'}`;
    return summaryPreview.length > 0
      ? `memory missing, ${candidateLabel} (${summaryPreview[0]})`
      : `memory missing, ${candidateLabel}`;
  }

  return 'memory missing';
}

function summarizeProfileDraftGaps(profile: any): string | null {
  const gapSummaries = [
    summarizeMemoryDraftGap(profile),
    summarizeDraftGap(profile?.foundationDraftSummaries?.skills, 'skills'),
    summarizeDraftGap(profile?.foundationDraftSummaries?.soul, 'soul'),
    summarizeDraftGap(profile?.foundationDraftSummaries?.voice, 'voice'),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  return gapSummaries.length > 0 ? gapSummaries.join(' | ') : null;
}

function collectProfileDraftFiles(profile: any): Partial<Record<(typeof FOUNDATION_DRAFT_KEYS)[number], string>> {
  return FOUNDATION_DRAFT_KEYS.reduce<Partial<Record<(typeof FOUNDATION_DRAFT_KEYS)[number], string>>>((draftFiles, draftKey) => {
    const draftPath = normalizeOptionalString(profile?.foundationDraftSummaries?.[draftKey]?.path);
    if (!draftPath) {
      return draftFiles;
    }

    draftFiles[draftKey] = draftPath;
    return draftFiles;
  }, {});
}

function summarizeMaintenanceQueue(profiles: any[] = []) {
  const queuedProfiles = profiles
    .filter((profile) => profile.foundationDraftStatus?.needsRefresh)
    .map((profile) => {
      const profileId = normalizeOptionalString(profile.id);
      const draftGapCounts = buildDraftGapCounts(profile);
      const draftPaths = buildFoundationDraftPaths({
        profileId,
        draftFiles: collectProfileDraftFiles(profile),
        missingDrafts: profile.foundationDraftStatus?.missingDrafts,
      });
      const candidateSignalSummary = buildCandidateSignalSummary(profile);
      const draftSourcesSummary = summarizeDraftSources(profile);
      const missingDrafts = normalizeStringArray(profile.foundationDraftStatus?.missingDrafts).sort((left, right) => left.localeCompare(right));
      const refreshReasons = normalizeStringArray(profile.foundationDraftStatus?.refreshReasons);
      return {
        id: profileId,
        displayName: normalizeOptionalString(profile.profile?.displayName),
        summary: normalizeOptionalString(profile.profile?.summary),
        label: buildProfileLabel({
          ...profile,
          id: profileId,
          profile: {
            ...(profile?.profile ?? {}),
            displayName: normalizeOptionalString(profile.profile?.displayName),
          },
        }),
        status: 'stale',
        generatedDraftCount: countGeneratedDrafts(profile),
        expectedDraftCount: FOUNDATION_DRAFT_KEYS.length,
        candidateDraftCount: countCandidateDrafts(profile),
        missingDrafts,
        refreshReasons,
        latestMaterialAt: normalizeOptionalString(profile.latestMaterialAt),
        latestMaterialId: normalizeOptionalString(profile.latestMaterialId),
        latestMaterialSourcePath: normalizeOptionalString(profile.latestMaterialSourcePath),
        candidateSignalSummary,
        ...(draftSourcesSummary ? { draftSourcesSummary } : {}),
        draftGapCount: countDraftGaps(draftGapCounts),
        draftGapCounts,
        draftGapSummary: summarizeProfileDraftGaps(profile),
        refreshCommand: buildFoundationRefreshCommand(profileId),
        paths: draftPaths,
      };
    })
    .sort((left, right) => {
      const missingDraftDifference = (right.missingDrafts?.length ?? 0) - (left.missingDrafts?.length ?? 0);
      if (missingDraftDifference !== 0) {
        return missingDraftDifference;
      }

      const draftGapDifference = (right.draftGapCount ?? 0) - (left.draftGapCount ?? 0);
      if (draftGapDifference !== 0) {
        return draftGapDifference;
      }

      const generatedDraftDifference = (left.generatedDraftCount ?? 0) - (right.generatedDraftCount ?? 0);
      if (generatedDraftDifference !== 0) {
        return generatedDraftDifference;
      }

      const refreshReasonDifference = scoreRefreshReasons(right.refreshReasons) - scoreRefreshReasons(left.refreshReasons);
      if (refreshReasonDifference !== 0) {
        return refreshReasonDifference;
      }

      return (right.latestMaterialAt ?? '').localeCompare(left.latestMaterialAt ?? '')
        || (right.latestMaterialId ?? '').localeCompare(left.latestMaterialId ?? '')
        || (right.latestMaterialSourcePath ?? '').localeCompare(left.latestMaterialSourcePath ?? '')
        || (left.label ?? '').localeCompare(right.label ?? '');
    });
  const recommendedProfile = queuedProfiles[0] ?? null;
  const recommendedPaths = recommendedProfile?.paths ?? [];

  return {
    profileCount: profiles.length,
    readyProfileCount: profiles.filter((profile) => !profile.foundationDraftStatus?.needsRefresh && profile.foundationDraftStatus?.complete).length,
    refreshProfileCount: queuedProfiles.length,
    incompleteProfileCount: profiles.filter((profile) => !profile.foundationDraftStatus?.complete).length,
    draftGapCountTotal: queuedProfiles.reduce((total, profile) => total + (profile.draftGapCount ?? 0), 0),
    draftGapCounts: mergeCountMaps(queuedProfiles.map((profile) => profile.draftGapCounts)),
    missingDraftCounts: FOUNDATION_DRAFT_KEYS.reduce<Record<string, number>>((counts, draftKey) => {
      counts[draftKey] = queuedProfiles.filter((profile) => profile.missingDrafts.includes(draftKey)).length;
      return counts;
    }, {}),
    refreshReasonCounts: countStringValues(queuedProfiles.flatMap((profile) => profile.refreshReasons ?? [])),
    refreshAllCommand: profiles.length > 0 ? 'node src/index.js update foundation --all' : null,
    staleRefreshCommand: queuedProfiles.length > 0 ? 'node src/index.js update foundation --stale' : null,
    refreshBundleCommand: buildCommandBundle(queuedProfiles.map((profile) => profile.refreshCommand)),
    recommendedProfileId: recommendedProfile?.id ?? null,
    recommendedLabel: recommendedProfile?.label ?? recommendedProfile?.id ?? null,
    recommendedAction: recommendedProfile
      ? `refresh ${recommendedProfile.label ?? recommendedProfile.id}${(recommendedProfile.refreshReasons ?? []).length > 0 ? ` — reasons ${(recommendedProfile.refreshReasons ?? []).join(' + ')}` : ''}${recommendedProfile?.candidateSignalSummary ? `; evidence ${recommendedProfile.candidateSignalSummary}` : ''}`
      : null,
    recommendedCommand: recommendedProfile?.refreshCommand ?? null,
    recommendedPaths,
    recommendedLatestMaterialAt: recommendedProfile?.latestMaterialAt ?? null,
    recommendedLatestMaterialId: recommendedProfile?.latestMaterialId ?? null,
    recommendedLatestMaterialSourcePath: recommendedProfile?.latestMaterialSourcePath ?? null,
    ...(recommendedProfile?.draftSourcesSummary ? { recommendedDraftSourcesSummary: recommendedProfile.draftSourcesSummary } : {}),
    recommendedCandidateSignalSummary: recommendedProfile?.candidateSignalSummary ?? null,
    recommendedDraftGapSummary: recommendedProfile?.draftGapSummary ?? null,
    helperCommands: {
      refreshAll: profiles.length > 0 ? 'node src/index.js update foundation --all' : null,
      refreshStale: queuedProfiles.length > 0 ? 'node src/index.js update foundation --stale' : null,
      refreshBundle: buildCommandBundle(queuedProfiles.map((profile) => profile.refreshCommand)),
    },
    queuedProfiles,
  };
}

export function buildFoundationRollup(profiles: any[] = []) {
  const safeProfiles = Array.isArray(profiles)
    ? profiles.filter((profile) => (profile?.materialCount ?? 0) > 0)
    : [];
  const staleProfileCount = safeProfiles.filter((profile) => profile.foundationDraftStatus?.needsRefresh).length;

  return {
    maintenance: summarizeMaintenanceQueue(safeProfiles),
    memory: {
      profileCount: safeProfiles.length,
      generatedProfileCount: countGenerated(safeProfiles, 'memory'),
      candidateProfileCount: countCandidateProfiles(safeProfiles, 'memory'),
      candidateCount: countCandidates(safeProfiles, 'memory'),
      repoStaleProfileCount: staleProfileCount,
      totalEntries: safeProfiles.reduce(
        (total, profile) => total + (profile.foundationDraftSummaries?.memory?.entryCount ?? 0),
        0,
      ),
      highlights: collectUnique(
        safeProfiles.flatMap((profile) => {
          const generatedHighlights = profile.foundationDraftSummaries?.memory?.latestSummaries ?? [];
          if (generatedHighlights.length > 0) {
            return generatedHighlights;
          }

          return profile.foundationReadiness?.memory?.sampleSummaries ?? [];
        }),
      ),
    },
    voice: {
      profileCount: safeProfiles.length,
      generatedProfileCount: countGenerated(safeProfiles, 'voice'),
      candidateProfileCount: countCandidateProfiles(safeProfiles, 'voice'),
      candidateCount: countCandidates(safeProfiles, 'voice'),
      repoStaleProfileCount: staleProfileCount,
      highlights: collectUnique(
        safeProfiles.flatMap((profile) => {
          const generatedHighlights = (profile.foundationDraftSummaries?.voice?.highlights ?? []).map(cleanHighlight).filter(Boolean);
          if (generatedHighlights.length > 0) {
            return generatedHighlights;
          }

          return profile.foundationReadiness?.voice?.sampleExcerpts ?? [];
        }),
      ),
    },
    soul: {
      profileCount: safeProfiles.length,
      generatedProfileCount: countGenerated(safeProfiles, 'soul'),
      candidateProfileCount: countCandidateProfiles(safeProfiles, 'soul'),
      candidateCount: countCandidates(safeProfiles, 'soul'),
      repoStaleProfileCount: staleProfileCount,
      highlights: collectUnique(
        safeProfiles.flatMap((profile) => {
          const generatedHighlights = (profile.foundationDraftSummaries?.soul?.highlights ?? []).map(cleanHighlight).filter(Boolean);
          if (generatedHighlights.length > 0) {
            return generatedHighlights;
          }

          return profile.foundationReadiness?.soul?.sampleExcerpts ?? [];
        }),
      ),
    },
    skills: {
      profileCount: safeProfiles.length,
      generatedProfileCount: countGenerated(safeProfiles, 'skills'),
      candidateProfileCount: countCandidateProfiles(safeProfiles, 'skills'),
      repoStaleProfileCount: staleProfileCount,
      candidateCount: safeProfiles.reduce(
        (total, profile) => total + (profile.foundationReadiness?.skills?.candidateCount ?? 0),
        0,
      ),
      highlights: collectUnique(
        safeProfiles.flatMap((profile) => {
          const generatedHighlights = (profile.foundationDraftSummaries?.skills?.highlights ?? [])
            .map(cleanHighlight)
            .filter((value) => value && !value.startsWith('sample:'));
          if (generatedHighlights.length > 0) {
            return generatedHighlights;
          }

          return profile.foundationReadiness?.skills?.sampleExcerpts ?? [];
        }),
      ),
    },
  };
}
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

  return `${key} ${readySectionCount}/${totalSectionCount} ready${readySections.length > 0 ? ` (${readySections.join(', ')})` : ''}${missingSections.length > 0 ? `, missing ${missingSections.join('/')}` : ''}`;
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

function summarizeMaintenanceQueue(profiles: any[] = []) {
  const queuedProfiles = profiles
    .filter((profile) => profile.foundationDraftStatus?.needsRefresh)
    .map((profile) => {
      const draftGapCounts = buildDraftGapCounts(profile);
      const draftPaths = buildFoundationDraftPaths({ profileId: profile.id ?? null });
      return {
        id: profile.id ?? null,
        displayName: profile.profile?.displayName ?? null,
        summary: profile.profile?.summary ?? null,
        label: buildProfileLabel(profile),
        status: 'stale',
        generatedDraftCount: countGeneratedDrafts(profile),
        expectedDraftCount: FOUNDATION_DRAFT_KEYS.length,
        candidateDraftCount: countCandidateDrafts(profile),
        missingDrafts: [...(profile.foundationDraftStatus?.missingDrafts ?? [])].sort(),
        refreshReasons: [...(profile.foundationDraftStatus?.refreshReasons ?? [])],
        latestMaterialAt: normalizeOptionalString(profile.latestMaterialAt),
        latestMaterialId: normalizeOptionalString(profile.latestMaterialId),
        draftGapCount: countDraftGaps(draftGapCounts),
        draftGapCounts,
        draftGapSummary: summarizeProfileDraftGaps(profile),
        refreshCommand: buildFoundationRefreshCommand(profile.id ?? null),
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

      return (right.latestMaterialAt ?? '').localeCompare(left.latestMaterialAt ?? '')
        || (left.label ?? '').localeCompare(right.label ?? '');
    });
  const recommendedProfile = queuedProfiles[0] ?? null;
  const recommendedPaths = buildFoundationDraftPaths({ profileId: recommendedProfile?.id ?? null });

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
      ? `refresh ${recommendedProfile.label ?? recommendedProfile.id}${(recommendedProfile.refreshReasons ?? []).length > 0 ? ` — reasons ${(recommendedProfile.refreshReasons ?? []).join(' + ')}` : ''}`
      : null,
    recommendedCommand: recommendedProfile?.refreshCommand ?? null,
    recommendedPaths,
    recommendedLatestMaterialAt: recommendedProfile?.latestMaterialAt ?? null,
    recommendedLatestMaterialId: recommendedProfile?.latestMaterialId ?? null,
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
function cleanHighlight(value) {
  return typeof value === 'string' ? value.replace(/^-\s*/, '').trim() : null;
}

function collectUnique(values, limit = 5) {
  const seen = new Set();
  const results = [];

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

function countGenerated(profiles, key) {
  return profiles.filter((profile) => profile.foundationDraftSummaries?.[key]?.generated).length;
}

function countCandidateProfiles(profiles, key) {
  return profiles.filter((profile) => (profile.foundationReadiness?.[key]?.candidateCount ?? 0) > 0).length;
}

function buildProfileLabel(profile) {
  const profileId = profile?.id ?? 'unknown-profile';
  const displayName = profile?.profile?.displayName;
  return displayName && displayName !== profileId ? `${displayName} (${profileId})` : (displayName ?? profileId);
}

const FOUNDATION_DRAFT_KEYS = ['memory', 'skills', 'soul', 'voice'];

function countGeneratedDrafts(profile) {
  return FOUNDATION_DRAFT_KEYS.filter((key) => profile?.foundationDraftSummaries?.[key]?.generated).length;
}

function countCandidateDrafts(profile) {
  return FOUNDATION_DRAFT_KEYS.filter((key) => (profile?.foundationReadiness?.[key]?.candidateCount ?? 0) > 0).length;
}

function buildCommandBundle(commands = []) {
  const normalizedCommands = commands.filter((command) => typeof command === 'string' && command.length > 0);
  if (normalizedCommands.length === 0) {
    return null;
  }

  if (normalizedCommands.length === 1) {
    return normalizedCommands[0];
  }

  return normalizedCommands.map((command) => `(${command})`).join(' && ');
}

function summarizeMaintenanceQueue(profiles) {
  const queuedProfiles = profiles
    .filter((profile) => profile.foundationDraftStatus?.needsRefresh)
    .map((profile) => ({
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
      latestMaterialAt: profile.latestMaterialAt ?? null,
      refreshCommand: profile.id ? `node src/index.js update foundation --person ${profile.id}` : null,
    }))
    .sort((left, right) => {
      const missingDraftDifference = (right.missingDrafts?.length ?? 0) - (left.missingDrafts?.length ?? 0);
      if (missingDraftDifference !== 0) {
        return missingDraftDifference;
      }

      const generatedDraftDifference = (left.generatedDraftCount ?? 0) - (right.generatedDraftCount ?? 0);
      if (generatedDraftDifference !== 0) {
        return generatedDraftDifference;
      }

      return (right.latestMaterialAt ?? '').localeCompare(left.latestMaterialAt ?? '')
        || (left.label ?? '').localeCompare(right.label ?? '');
    });

  return {
    profileCount: profiles.length,
    readyProfileCount: profiles.filter((profile) => !profile.foundationDraftStatus?.needsRefresh && profile.foundationDraftStatus?.complete).length,
    refreshProfileCount: queuedProfiles.length,
    incompleteProfileCount: profiles.filter((profile) => !profile.foundationDraftStatus?.complete).length,
    refreshAllCommand: profiles.length > 0 ? 'node src/index.js update foundation --all' : null,
    staleRefreshCommand: queuedProfiles.length > 0 ? 'node src/index.js update foundation --stale' : null,
    refreshBundleCommand: buildCommandBundle(queuedProfiles.map((profile) => profile.refreshCommand)),
    helperCommands: {
      refreshAll: profiles.length > 0 ? 'node src/index.js update foundation --all' : null,
      refreshStale: queuedProfiles.length > 0 ? 'node src/index.js update foundation --stale' : null,
      refreshBundle: buildCommandBundle(queuedProfiles.map((profile) => profile.refreshCommand)),
    },
    queuedProfiles,
  };
}

export function buildFoundationRollup(profiles = []) {
  const safeProfiles = Array.isArray(profiles)
    ? profiles.filter((profile) => (profile?.materialCount ?? 0) > 0)
    : [];
  const staleProfileCount = safeProfiles.filter((profile) => profile.foundationDraftStatus?.needsRefresh).length;

  return {
    maintenance: summarizeMaintenanceQueue(safeProfiles),
    memory: {
      profileCount: safeProfiles.length,
      generatedProfileCount: countGenerated(safeProfiles, 'memory'),
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

function buildProfileLabel(profile) {
  const profileId = profile?.id ?? 'unknown-profile';
  const displayName = profile?.profile?.displayName;
  return displayName && displayName !== profileId ? `${displayName} (${profileId})` : (displayName ?? profileId);
}

function normalizeRelativePath(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeSampleManifestSummary(sampleManifestPath, sampleManifest) {
  const normalizedPath = normalizeRelativePath(sampleManifestPath);
  const normalizedProfileIds = Array.isArray(sampleManifest?.profileIds)
    ? sampleManifest.profileIds.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];

  return {
    path: normalizedPath,
    present: Boolean(normalizedPath),
    status: sampleManifest?.status ?? (normalizedPath ? 'loaded' : 'missing'),
    entryCount: Number.isFinite(sampleManifest?.entryCount) ? sampleManifest.entryCount : 0,
    profileIds: normalizedProfileIds,
    error: typeof sampleManifest?.error === 'string' && sampleManifest.error.trim().length > 0 ? sampleManifest.error : null,
  };
}

function buildProfileCommands(profile) {
  if (!profile?.id) {
    return null;
  }

  return {
    personId: profile.id,
    displayName: profile.profile?.displayName ?? profile.id,
    label: buildProfileLabel(profile),
    materialCount: profile.materialCount ?? 0,
    needsRefresh: Boolean(profile.foundationDraftStatus?.needsRefresh),
    missingDrafts: [...(profile.foundationDraftStatus?.missingDrafts ?? [])].sort(),
    updateProfileCommand: `node src/index.js update profile --person ${profile.id}`,
    refreshFoundationCommand: `node src/index.js update foundation --person ${profile.id}`,
  };
}

export function buildIngestionSummary(profiles = [], options = {}) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const importedProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) > 0);
  const metadataOnlyProfileCount = safeProfiles.length - importedProfiles.length;
  const sampleManifest = normalizeSampleManifestSummary(options?.sampleManifestPath, options?.sampleManifest);
  const sampleManifestPath = sampleManifest.path;
  const sampleManifestPresent = sampleManifest.present;
  const orderedProfileCommands = importedProfiles
    .slice()
    .sort((left, right) => {
      const refreshDelta = Number(Boolean(right?.foundationDraftStatus?.needsRefresh)) - Number(Boolean(left?.foundationDraftStatus?.needsRefresh));
      if (refreshDelta !== 0) {
        return refreshDelta;
      }

      return buildProfileLabel(left).localeCompare(buildProfileLabel(right));
    })
    .map(buildProfileCommands)
    .filter(Boolean)
    .slice(0, 2);

  return {
    profileCount: safeProfiles.length,
    importedProfileCount: importedProfiles.length,
    metadataOnlyProfileCount,
    readyProfileCount: importedProfiles.filter((profile) => !profile.foundationDraftStatus?.needsRefresh && profile.foundationDraftStatus?.complete).length,
    refreshProfileCount: importedProfiles.filter((profile) => profile.foundationDraftStatus?.needsRefresh).length,
    incompleteProfileCount: importedProfiles.filter((profile) => !profile.foundationDraftStatus?.complete).length,
    supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
    bootstrapProfileCommand: 'node src/index.js update profile --person <person-id> --display-name "<Display Name>"',
    sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
    importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
    sampleManifestPath,
    sampleManifestPresent,
    sampleManifestStatus: sampleManifest.status,
    sampleManifestEntryCount: sampleManifest.entryCount,
    sampleManifestProfileIds: sampleManifest.profileIds,
    sampleManifestError: sampleManifest.error,
    sampleManifestCommand: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? `node src/index.js import manifest --file ${sampleManifestPath} --refresh-foundation`
      : null,
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    profileCommands: orderedProfileCommands,
  };
}

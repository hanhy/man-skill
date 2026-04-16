function buildProfileLabel(profile) {
  const profileId = profile?.id ?? 'unknown-profile';
  const displayName = profile?.profile?.displayName;
  return displayName && displayName !== profileId ? `${displayName} (${profileId})` : (displayName ?? profileId);
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

export function buildIngestionSummary(profiles = []) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const importedProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) > 0);
  const metadataOnlyProfileCount = safeProfiles.length - importedProfiles.length;
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
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    profileCommands: orderedProfileCommands,
  };
}

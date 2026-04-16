function buildProfileLabel(profile) {
  const profileId = profile?.id ?? 'unknown-profile';
  const displayName = profile?.profile?.displayName;
  return displayName && displayName !== profileId ? `${displayName} (${profileId})` : (displayName ?? profileId);
}

function normalizeRelativePath(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function normalizeSampleManifestSummary(sampleManifestPath, sampleManifest) {
  const normalizedPath = normalizeRelativePath(sampleManifestPath);
  const normalizedProfileIds = Array.isArray(sampleManifest?.profileIds)
    ? sampleManifest.profileIds.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
  const normalizedTextFilePersonIds = sampleManifest?.textFilePersonIds && typeof sampleManifest.textFilePersonIds === 'object'
    ? Object.fromEntries(
      Object.entries(sampleManifest.textFilePersonIds)
        .filter(([filePath, personId]) => typeof filePath === 'string' && filePath.trim().length > 0 && typeof personId === 'string' && personId.trim().length > 0),
    )
    : {};

  return {
    path: normalizedPath,
    present: Boolean(normalizedPath),
    status: sampleManifest?.status ?? (normalizedPath ? 'loaded' : 'missing'),
    entryCount: Number.isFinite(sampleManifest?.entryCount) ? sampleManifest.entryCount : 0,
    profileIds: normalizedProfileIds,
    textFilePersonIds: normalizedTextFilePersonIds,
    error: typeof sampleManifest?.error === 'string' && sampleManifest.error.trim().length > 0 ? sampleManifest.error : null,
  };
}

function normalizeSampleTextSummary(sampleTextPath, sampleManifest) {
  const normalizedPath = normalizeRelativePath(sampleTextPath);
  const samplePersonId = normalizedPath && sampleManifest?.status === 'loaded' && sampleManifest?.textFilePersonIds
    ? sampleManifest.textFilePersonIds[normalizedPath] ?? null
    : null;

  return {
    path: normalizedPath,
    present: Boolean(normalizedPath),
    personId: samplePersonId,
    command: normalizedPath && samplePersonId
      ? `node src/index.js import text --person ${samplePersonId} --file ${shellQuote(normalizedPath)} --refresh-foundation`
      : null,
  };
}

function buildProfileCommands(profile, options = {}) {
  if (!profile?.id) {
    return null;
  }

  const materialCount = profile.materialCount ?? 0;
  const imported = materialCount > 0;
  const sampleTextPath = typeof options.sampleTextPath === 'string' && options.sampleTextPath.trim().length > 0
    ? options.sampleTextPath
    : null;
  const sampleTextPersonId = typeof options.sampleTextPersonId === 'string' && options.sampleTextPersonId.trim().length > 0
    ? options.sampleTextPersonId
    : null;
  const runnableSampleTextPath = sampleTextPath && sampleTextPersonId === profile.id ? sampleTextPath : null;

  return {
    personId: profile.id,
    displayName: profile.profile?.displayName ?? profile.id,
    label: buildProfileLabel(profile),
    materialCount,
    materialTypes: profile?.materialTypes && typeof profile.materialTypes === 'object' ? { ...profile.materialTypes } : {},
    latestMaterialAt: imported ? (profile.latestMaterialAt ?? null) : null,
    needsRefresh: imported ? Boolean(profile.foundationDraftStatus?.needsRefresh) : false,
    missingDrafts: imported ? [...(profile.foundationDraftStatus?.missingDrafts ?? [])].sort() : [],
    updateProfileCommand: `node src/index.js update profile --person ${profile.id}`,
    refreshFoundationCommand: imported ? `node src/index.js update foundation --person ${profile.id}` : null,
    importMaterialCommand: imported
      ? null
      : (runnableSampleTextPath
        ? `node src/index.js import text --person ${profile.id} --file ${shellQuote(runnableSampleTextPath)} --refresh-foundation`
        : `node src/index.js import text --person ${profile.id} --file <sample.txt> --refresh-foundation`),
  };
}

export function buildIngestionSummary(profiles = [], options = {}) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const importedProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) > 0);
  const metadataOnlyProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) <= 0);
  const metadataOnlyProfileCount = metadataOnlyProfiles.length;
  const sampleManifest = normalizeSampleManifestSummary(options?.sampleManifestPath, options?.sampleManifest);
  const sampleManifestPath = sampleManifest.path;
  const sampleManifestPresent = sampleManifest.present;
  const sampleText = normalizeSampleTextSummary(options?.sampleTextPath, sampleManifest);
  const metadataProfileCommands = metadataOnlyProfiles
    .slice()
    .sort((left, right) => buildProfileLabel(left).localeCompare(buildProfileLabel(right)))
    .map((profile) => buildProfileCommands(profile, {
      sampleTextPath: sampleText.path,
      sampleTextPersonId: sampleText.personId,
    }))
    .filter(Boolean);
  const orderedProfileCommands = safeProfiles
    .slice()
    .sort((left, right) => {
      const leftImported = Number((left?.materialCount ?? 0) > 0);
      const rightImported = Number((right?.materialCount ?? 0) > 0);
      const leftActionRank = leftImported
        ? Number(Boolean(left?.foundationDraftStatus?.needsRefresh) || !left?.foundationDraftStatus?.complete)
        : 1;
      const rightActionRank = rightImported
        ? Number(Boolean(right?.foundationDraftStatus?.needsRefresh) || !right?.foundationDraftStatus?.complete)
        : 1;
      const actionDelta = rightActionRank - leftActionRank;
      if (actionDelta !== 0) {
        return actionDelta;
      }

      const importDelta = rightImported - leftImported;
      if (importDelta !== 0) {
        return importDelta;
      }

      return buildProfileLabel(left).localeCompare(buildProfileLabel(right));
    })
    .filter((profile) => {
      const imported = (profile?.materialCount ?? 0) > 0;
      return !imported || Boolean(profile?.foundationDraftStatus?.needsRefresh) || !profile?.foundationDraftStatus?.complete;
    })
    .map((profile) => buildProfileCommands(profile, {
      sampleTextPath: sampleText.path,
      sampleTextPersonId: sampleText.personId,
    }))
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
      ? `node src/index.js import manifest --file ${shellQuote(sampleManifestPath)} --refresh-foundation`
      : null,
    sampleTextPath: sampleText.path,
    sampleTextPresent: sampleText.present,
    sampleTextPersonId: sampleText.personId,
    sampleTextCommand: sampleText.command,
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    profileCommands: orderedProfileCommands,
    metadataProfileCommands,
  };
}

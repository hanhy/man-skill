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

function buildProfileImportCommands(profileId: string, options: any = {}) {
  if (typeof profileId !== 'string' || profileId.trim().length === 0) {
    return {
      text: null,
      message: null,
      talk: null,
      screenshot: null,
    };
  }

  const normalizedProfileId = profileId.trim();
  const sampleTextPath = typeof options.sampleTextPath === 'string' && options.sampleTextPath.trim().length > 0
    ? options.sampleTextPath
    : null;
  const sampleTextPersonId = typeof options.sampleTextPersonId === 'string' && options.sampleTextPersonId.trim().length > 0
    ? options.sampleTextPersonId
    : null;
  const sampleFileCommands = Array.isArray(options.sampleFileCommands)
    ? options.sampleFileCommands.filter((entry) => entry && typeof entry === 'object')
    : [];
  const sampleInlineCommands = Array.isArray(options.sampleInlineCommands)
    ? options.sampleInlineCommands.filter((entry) => entry && typeof entry === 'object')
    : [];
  const runnableTextPath = sampleTextPath && sampleTextPersonId === normalizedProfileId ? sampleTextPath : null;
  const matchingSampleFileCommands = sampleFileCommands.filter((entry) =>
    entry.personId === normalizedProfileId
    && typeof entry.type === 'string'
    && typeof entry.command === 'string'
    && entry.command.trim().length > 0,
  );
  const matchingSampleInlineCommands = sampleInlineCommands.filter((entry) =>
    entry.personId === normalizedProfileId
    && typeof entry.type === 'string'
    && typeof entry.command === 'string'
    && entry.command.trim().length > 0,
  );
  const runnableSampleCommandByType = matchingSampleFileCommands.reduce((commands, entry) => {
    if (!commands[entry.type]) {
      commands[entry.type] = entry.command;
    }

    return commands;
  }, {});
  matchingSampleInlineCommands.forEach((entry) => {
    if (!runnableSampleCommandByType[entry.type]) {
      runnableSampleCommandByType[entry.type] = entry.command;
    }
  });

  return {
    text: runnableSampleCommandByType.text
      ?? (runnableTextPath
        ? `node src/index.js import text --person ${normalizedProfileId} --file ${shellQuote(runnableTextPath)} --refresh-foundation`
        : `node src/index.js import text --person ${normalizedProfileId} --file <sample.txt> --refresh-foundation`),
    message: runnableSampleCommandByType.message
      ?? `node src/index.js import message --person ${normalizedProfileId} --text <message> --refresh-foundation`,
    talk: runnableSampleCommandByType.talk
      ?? `node src/index.js import talk --person ${normalizedProfileId} --text <snippet> --refresh-foundation`,
    screenshot: runnableSampleCommandByType.screenshot
      ?? `node src/index.js import screenshot --person ${normalizedProfileId} --file <image.png> --refresh-foundation`,
  };
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
  const normalizedFileEntries = Array.isArray(sampleManifest?.fileEntries)
    ? sampleManifest.fileEntries
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        type: typeof entry.type === 'string' && (entry.type === 'text' || entry.type === 'screenshot') ? entry.type : null,
        path: typeof entry.filePath === 'string' && entry.filePath.trim().length > 0 ? entry.filePath : null,
        personId: typeof entry.personId === 'string' && entry.personId.trim().length > 0 ? entry.personId : null,
      }))
      .filter((entry) => entry.type && entry.path && entry.personId)
      .sort((left, right) => {
        const typeRank = (value) => (value === 'text' ? 0 : 1);
        const typeDelta = typeRank(left.type) - typeRank(right.type);
        if (typeDelta !== 0) {
          return typeDelta;
        }

        const pathDelta = left.path.localeCompare(right.path);
        if (pathDelta !== 0) {
          return pathDelta;
        }

        return left.personId.localeCompare(right.personId);
      })
    : Object.entries(normalizedTextFilePersonIds)
      .map(([path, personId]) => ({ type: 'text', path, personId }));
  const normalizedInlineEntries = Array.isArray(sampleManifest?.inlineEntries)
    ? sampleManifest.inlineEntries
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        type: typeof entry.type === 'string' && (entry.type === 'message' || entry.type === 'talk') ? entry.type : null,
        text: typeof entry.text === 'string' && entry.text.trim().length > 0 ? entry.text.trim() : null,
        personId: typeof entry.personId === 'string' && entry.personId.trim().length > 0 ? entry.personId : null,
        sourcePath: normalizedPath,
      }))
      .filter((entry) => entry.type && entry.text && entry.personId)
      .sort((left, right) => {
        const typeRank = (value) => (value === 'message' ? 0 : 1);
        const typeDelta = typeRank(left.type) - typeRank(right.type);
        if (typeDelta !== 0) {
          return typeDelta;
        }

        const textDelta = left.text.localeCompare(right.text);
        if (textDelta !== 0) {
          return textDelta;
        }

        return left.personId.localeCompare(right.personId);
      })
    : [];
  const normalizedMaterialTypes = sampleManifest?.materialTypes && typeof sampleManifest.materialTypes === 'object'
    ? Object.fromEntries(
      Object.entries(sampleManifest.materialTypes)
        .filter(([type, count]) => typeof type === 'string' && type.trim().length > 0 && Number.isFinite(Number(count)) && Number(count) > 0)
        .sort(([left], [right]) => left.localeCompare(right)),
    )
    : {};

  const normalizedProfileLabels = Array.isArray(sampleManifest?.profileLabels)
    ? sampleManifest.profileLabels.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
  const normalizedFilePaths = Array.isArray(sampleManifest?.filePaths)
    ? sampleManifest.filePaths.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
  const starterTargets = normalizedProfileLabels.length > 0 ? normalizedProfileLabels : normalizedProfileIds;

  return {
    path: normalizedPath,
    present: Boolean(normalizedPath),
    status: sampleManifest?.status ?? (normalizedPath ? 'loaded' : 'missing'),
    entryCount: Number.isFinite(sampleManifest?.entryCount) ? sampleManifest.entryCount : 0,
    profileIds: normalizedProfileIds,
    profileLabels: normalizedProfileLabels,
    filePaths: normalizedFilePaths,
    starterLabel: starterTargets.length > 0 ? starterTargets.join(', ') : null,
    materialTypes: normalizedMaterialTypes,
    textFilePersonIds: normalizedTextFilePersonIds,
    inlineEntries: normalizedInlineEntries,
    fileEntries: normalizedFileEntries,
    error: typeof sampleManifest?.error === 'string' && sampleManifest.error.trim().length > 0 ? sampleManifest.error : null,
  };
}

function normalizeSampleTextSummary(sampleTextPath, sampleManifest) {
  const normalizedPath = normalizeRelativePath(sampleTextPath);
  const textEntry = Array.isArray(sampleManifest?.fileEntries)
    ? sampleManifest.fileEntries.find((entry) => entry?.type === 'text' && (!normalizedPath || entry.path === normalizedPath))
      ?? sampleManifest.fileEntries.find((entry) => entry?.type === 'text')
    : null;
  const samplePersonId = textEntry?.personId ?? null;
  const selectedPath = textEntry?.path ?? normalizedPath;

  return {
    path: selectedPath,
    present: Boolean(selectedPath),
    personId: samplePersonId,
    command: selectedPath && samplePersonId
      ? `node src/index.js import text --person ${samplePersonId} --file ${shellQuote(selectedPath)} --refresh-foundation`
      : null,
  };
}

function buildSampleFileCommand(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const type = entry.type === 'text' || entry.type === 'screenshot' ? entry.type : null;
  const filePath = typeof entry.path === 'string' && entry.path.trim().length > 0 ? entry.path : null;
  const personId = typeof entry.personId === 'string' && entry.personId.trim().length > 0 ? entry.personId : null;
  if (!type || !filePath || !personId) {
    return null;
  }

  return {
    type,
    path: filePath,
    personId,
    command: `node src/index.js import ${type} --person ${personId} --file ${shellQuote(filePath)} --refresh-foundation`,
  };
}

function buildSampleInlineCommand(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const type = entry.type === 'message' || entry.type === 'talk' ? entry.type : null;
  const text = typeof entry.text === 'string' && entry.text.trim().length > 0 ? entry.text.trim() : null;
  const personId = typeof entry.personId === 'string' && entry.personId.trim().length > 0 ? entry.personId : null;
  const sourcePath = typeof entry.sourcePath === 'string' && entry.sourcePath.trim().length > 0 ? entry.sourcePath.trim() : null;
  if (!type || !text || !personId) {
    return null;
  }

  return {
    type,
    text,
    personId,
    sourcePath,
    command: `node src/index.js import ${type} --person ${personId} --text ${shellQuote(text)} --refresh-foundation`,
  };
}

function buildUpdateIntakeCommand(profile) {
  if (!profile?.id) {
    return null;
  }

  const commandParts = ['node src/index.js update intake', '--person', shellQuote(profile.id)];
  const displayName = typeof profile?.profile?.displayName === 'string' && profile.profile.displayName.trim().length > 0
    ? profile.profile.displayName
    : null;
  const summary = typeof profile?.profile?.summary === 'string' && profile.profile.summary.trim().length > 0
    ? profile.profile.summary
    : null;

  if (displayName) {
    commandParts.push('--display-name', shellQuote(displayName));
  }

  if (summary) {
    commandParts.push('--summary', shellQuote(summary));
  }

  return commandParts.join(' ');
}

function buildUpdateProfileCommand(profile, options: any = {}) {
  if (!profile?.id) {
    return null;
  }

  const commandParts = ['node src/index.js update profile', '--person', shellQuote(profile.id)];
  const displayName = typeof profile?.profile?.displayName === 'string' && profile.profile.displayName.trim().length > 0
    ? profile.profile.displayName
    : null;
  const summary = typeof profile?.profile?.summary === 'string' && profile.profile.summary.trim().length > 0
    ? profile.profile.summary
    : null;

  if (displayName) {
    commandParts.push('--display-name', shellQuote(displayName));
  }

  if (summary) {
    commandParts.push('--summary', shellQuote(summary));
  }

  if (options.refreshFoundation) {
    commandParts.push('--refresh-foundation');
  }

  return commandParts.join(' ');
}

function summarizeIntakeStatus(intake) {
  if (!intake || typeof intake !== 'object') {
    return 'missing — create imports, README.md, materials.template.json, sample.txt';
  }

  if (intake.ready) {
    return 'ready';
  }

  const missingPaths = Array.isArray(intake.missingPaths)
    ? intake.missingPaths.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
  const missingLabels = missingPaths.map((value) => value.split('/').filter(Boolean).slice(-1)[0] ?? value);

  if ((intake.completion ?? 'missing') === 'partial') {
    return missingLabels.length > 0
      ? `partial — missing ${missingLabels.join(', ')}`
      : 'partial — missing intake scaffold files';
  }

  return missingLabels.length > 0
    ? `missing — create ${missingLabels.join(', ')}`
    : 'missing — create imports/, README.md, materials.template.json, sample.txt';
}

function buildProfileCommands(profile, options = {}) {
  if (!profile?.id) {
    return null;
  }

  const materialCount = profile.materialCount ?? 0;
  const imported = materialCount > 0;
  const importCommands = buildProfileImportCommands(profile.id, options);
  const runnableTextImportCommand = typeof importCommands.text === 'string' && !importCommands.text.includes('<')
    ? importCommands.text
    : null;
  const runnableMessageImportCommand = typeof importCommands.message === 'string' && !importCommands.message.includes('<')
    ? importCommands.message
    : null;
  const runnableTalkImportCommand = typeof importCommands.talk === 'string' && !importCommands.talk.includes('<')
    ? importCommands.talk
    : null;
  const runnableScreenshotImportCommand = typeof importCommands.screenshot === 'string' && !importCommands.screenshot.includes('<')
    ? importCommands.screenshot
    : null;
  const intake = profile?.intake && typeof profile.intake === 'object' ? profile.intake : null;
  const intakeManifestPath = intake?.ready && typeof intake?.starterManifestPath === 'string' && intake.starterManifestPath.trim().length > 0
    ? intake.starterManifestPath
    : null;
  const intakeImportManifestCommand = intakeManifestPath
    ? `node src/index.js import manifest --file ${shellQuote(intakeManifestPath)} --refresh-foundation`
    : null;
  const defaultImportCommand = runnableTextImportCommand
    ?? runnableScreenshotImportCommand
    ?? intakeImportManifestCommand
    ?? runnableMessageImportCommand
    ?? runnableTalkImportCommand
    ?? importCommands.message
    ?? importCommands.talk
    ?? importCommands.text;
  const updateProfileCommand = buildUpdateProfileCommand(profile);
  const updateProfileAndRefreshCommand = imported ? buildUpdateProfileCommand(profile, { refreshFoundation: true }) : null;
  const updateIntakeCommand = buildUpdateIntakeCommand(profile);
  const refreshFoundationCommand = imported ? `node src/index.js update foundation --person ${profile.id}` : null;
  const importIntakeCommand = `node src/index.js import intake --person ${shellQuote(profile.id)}`;

  return {
    personId: profile.id,
    displayName: profile.profile?.displayName ?? profile.id,
    label: buildProfileLabel(profile),
    materialCount,
    materialTypes: profile?.materialTypes && typeof profile.materialTypes === 'object' ? { ...profile.materialTypes } : {},
    latestMaterialAt: imported ? (profile.latestMaterialAt ?? null) : null,
    needsRefresh: imported ? Boolean(profile.foundationDraftStatus?.needsRefresh) : false,
    missingDrafts: imported ? [...(profile.foundationDraftStatus?.missingDrafts ?? [])].sort() : [],
    updateProfileCommand,
    updateProfileAndRefreshCommand,
    updateIntakeCommand,
    importIntakeCommand,
    intakeReady: intake?.ready ?? false,
    intakeCompletion: intake?.completion ?? 'missing',
    intakeStatusSummary: summarizeIntakeStatus(intake),
    intakePaths: intake ? [intake.importsDir, intake.intakeReadmePath, intake.starterManifestPath, intake.sampleTextPath].filter(Boolean) : [],
    intakeMissingPaths: intake ? [...(intake.missingPaths ?? [])] : [],
    importManifestCommand: imported ? null : intakeImportManifestCommand,
    refreshFoundationCommand,
    importCommands,
    helperCommands: {
      scaffold: updateIntakeCommand,
      importIntake: importIntakeCommand,
      importManifest: imported ? null : intakeImportManifestCommand,
      updateProfile: updateProfileCommand,
      updateProfileAndRefresh: updateProfileAndRefreshCommand,
      refreshFoundation: refreshFoundationCommand,
      directImports: importCommands,
    },
    importMaterialCommand: imported
      ? null
      : defaultImportCommand,
  };
}

export function buildIngestionSummary(profiles: any[] = [], options: any = {}) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const importedProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) > 0);
  const metadataOnlyProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) <= 0);
  const metadataOnlyProfileCount = metadataOnlyProfiles.length;
  const metadataOnlyProfilesWithReadyIntake = metadataOnlyProfiles.filter((profile) => profile?.intake?.ready);
  const metadataOnlyProfilesWithPartialIntake = metadataOnlyProfiles.filter((profile) => profile?.intake?.completion === 'partial');
  const metadataOnlyProfilesWithMissingIntake = metadataOnlyProfiles.filter((profile) => (profile?.intake?.completion ?? 'missing') === 'missing');
  const intakeReadyProfileCount = metadataOnlyProfilesWithReadyIntake.length;
  const intakePartialProfileCount = metadataOnlyProfilesWithPartialIntake.length;
  const intakeMissingProfileCount = metadataOnlyProfilesWithMissingIntake.length;
  const intakeScaffoldProfileCount = metadataOnlyProfileCount - intakeReadyProfileCount;
  const intakeStaleProfileCount = metadataOnlyProfilesWithPartialIntake.length + metadataOnlyProfilesWithMissingIntake.length;
  const sampleManifest = normalizeSampleManifestSummary(options?.sampleManifestPath, options?.sampleManifest);
  const sampleManifestPath = sampleManifest.path;
  const sampleManifestPresent = sampleManifest.present;
  const sampleText = normalizeSampleTextSummary(options?.sampleTextPath, sampleManifest);
  const sampleFileCommands = (sampleManifest.fileEntries ?? [])
    .map((entry) => buildSampleFileCommand(entry))
    .filter(Boolean);
  const sampleInlineCommands = (sampleManifest.inlineEntries ?? [])
    .map((entry) => buildSampleInlineCommand(entry))
    .filter(Boolean);
  const metadataProfileCommands = metadataOnlyProfiles
    .slice()
    .sort((left, right) => {
      const intakeRank = (profile) => {
        const completion = profile?.intake?.completion;
        if (completion === 'partial') {
          return 0;
        }
        if (profile?.intake?.ready) {
          return 2;
        }
        return 1;
      };

      const rankDelta = intakeRank(left) - intakeRank(right);
      if (rankDelta !== 0) {
        return rankDelta;
      }

      return buildProfileLabel(left).localeCompare(buildProfileLabel(right));
    })
    .map((profile) => buildProfileCommands(profile, {
      sampleFileCommands,
      sampleInlineCommands,
      sampleTextPath: sampleText.path,
      sampleTextPersonId: sampleText.personId,
    }))
    .filter(Boolean);
  const sortedProfiles = safeProfiles
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
    });
  const allProfileCommands = sortedProfiles
    .map((profile) => buildProfileCommands(profile, {
      sampleFileCommands,
      sampleInlineCommands,
      sampleTextPath: sampleText.path,
      sampleTextPersonId: sampleText.personId,
    }))
    .filter(Boolean);
  const orderedProfileCommands = allProfileCommands
    .filter((profile) => {
      const imported = (profile?.materialCount ?? 0) > 0;
      return !imported || profile?.needsRefresh || profile?.missingDrafts?.length > 0;
    })
    .slice(0, 2);

  const findSampleFileCommand = (type) => sampleFileCommands.find((entry) => entry?.type === type)?.command ?? null;
  const findSampleInlineCommand = (type) => sampleInlineCommands.find((entry) => entry?.type === type)?.command ?? null;
  const helperCommands = {
    bootstrap: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"',
    scaffoldAll: 'node src/index.js update intake --all',
    scaffoldStale: 'node src/index.js update intake --stale',
    importManifest: 'node src/index.js import manifest --file <manifest.json>',
    importIntakeAll: 'node src/index.js import intake --all',
    importIntakeStale: 'node src/index.js import intake --stale',
    refreshAllFoundation: 'node src/index.js update foundation --all',
    refreshStaleFoundation: 'node src/index.js update foundation --stale',
    sampleStarter: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? 'node src/index.js import sample'
      : null,
    sampleManifest: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? `node src/index.js import manifest --file ${shellQuote(sampleManifestPath)} --refresh-foundation`
      : null,
    sampleText: sampleText.command,
    sampleMessage: findSampleInlineCommand('message'),
    sampleTalk: findSampleInlineCommand('talk'),
    sampleScreenshot: findSampleFileCommand('screenshot'),
  };

  return {
    profileCount: safeProfiles.length,
    importedProfileCount: importedProfiles.length,
    metadataOnlyProfileCount,
    readyProfileCount: importedProfiles.filter((profile) => !profile.foundationDraftStatus?.needsRefresh && profile.foundationDraftStatus?.complete).length,
    refreshProfileCount: importedProfiles.filter((profile) => profile.foundationDraftStatus?.needsRefresh).length,
    incompleteProfileCount: importedProfiles.filter((profile) => !profile.foundationDraftStatus?.complete).length,
    intakeReadyProfileCount,
    intakePartialProfileCount,
    intakeMissingProfileCount,
    intakeScaffoldProfileCount,
    intakeStaleProfileCount,
    intakeImportAllCommand: 'node src/index.js import intake --all',
    intakeImportStaleCommand: 'node src/index.js import intake --stale',
    supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
    bootstrapProfileCommand: 'node src/index.js update intake --person <person-id> --display-name "<Display Name>"',
    intakeAllCommand: 'node src/index.js update intake --all',
    intakeStaleCommand: 'node src/index.js update intake --stale',
    sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
    importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
    refreshAllFoundationCommand: 'node src/index.js update foundation --all',
    sampleManifestPath,
    sampleManifestPresent,
    sampleManifestStatus: sampleManifest.status,
    sampleManifestEntryCount: sampleManifest.entryCount,
    sampleManifestProfileIds: sampleManifest.profileIds,
    sampleManifestProfileLabels: sampleManifest.profileLabels,
    sampleManifestFilePaths: sampleManifest.filePaths,
    sampleManifestMaterialTypes: sampleManifest.materialTypes,
    sampleManifestError: sampleManifest.error,
    sampleStarterCommand: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? 'node src/index.js import sample'
      : null,
    sampleStarterSource: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? 'manifest'
      : null,
    sampleStarterLabel: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? sampleManifest.starterLabel
      : null,
    sampleManifestCommand: sampleManifestPresent && sampleManifest.status === 'loaded'
      ? `node src/index.js import manifest --file ${shellQuote(sampleManifestPath)} --refresh-foundation`
      : null,
    sampleTextPath: sampleText.path,
    sampleTextPresent: sampleText.present,
    sampleTextPersonId: sampleText.personId,
    sampleTextCommand: sampleText.command,
    sampleFileCommands,
    sampleInlineCommands,
    staleRefreshCommand: 'node src/index.js update foundation --stale',
    helperCommands,
    profileCommands: orderedProfileCommands,
    allProfileCommands,
    metadataProfileCommands,
  };
}

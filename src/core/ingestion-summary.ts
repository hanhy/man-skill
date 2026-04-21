import fs from 'node:fs';
import path from 'node:path';

function stripLeadingUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function buildFallbackDisplayName(profileId) {
  if (typeof profileId !== 'string' || profileId.trim().length === 0) {
    return null;
  }

  const normalized = profileId.trim();
  const parts = normalized
    .split(/[-_\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => /^[a-z0-9]+$/i.test(part)
      ? `${part.charAt(0).toUpperCase()}${part.slice(1)}`
      : part);

  const fallbackDisplayName = parts.join(' ').trim();
  return fallbackDisplayName.length > 0 && fallbackDisplayName !== normalized
    ? fallbackDisplayName
    : null;
}

function buildProfileLabel(profile) {
  const profileId = profile?.id ?? 'unknown-profile';
  const displayName = profile?.profile?.displayName;
  const fallbackDisplayName = buildFallbackDisplayName(profileId);
  const preferredDisplayName = typeof displayName === 'string' && displayName.trim().length > 0
    ? displayName.trim()
    : fallbackDisplayName;

  return preferredDisplayName && preferredDisplayName !== profileId
    ? `${preferredDisplayName} (${profileId})`
    : (preferredDisplayName ?? profileId);
}

function normalizeRelativePath(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function shellQuoteArgument(value) {
  return /^[A-Za-z0-9._-]+$/.test(String(value)) ? String(value) : shellQuote(value);
}

function slugifyPersonId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCommandBundle(commands: Array<string | null | undefined>): string | null {
  const normalizedCommands = commands.filter((command): command is string => typeof command === 'string' && command.length > 0);
  if (normalizedCommands.length === 0) {
    return null;
  }

  if (normalizedCommands.length === 1) {
    return normalizedCommands[0];
  }

  return normalizedCommands.map((command) => `(${command})`).join(' && ');
}

const FOUNDATION_DRAFT_KEYS = ['memory', 'skills', 'soul', 'voice'];

function countGeneratedDrafts(profile) {
  return FOUNDATION_DRAFT_KEYS.filter((key) => profile?.foundationDraftSummaries?.[key]?.generated).length;
}

function compareFoundationRefreshPriority(left, right) {
  const missingDraftDifference = (right?.foundationDraftStatus?.missingDrafts?.length ?? 0) - (left?.foundationDraftStatus?.missingDrafts?.length ?? 0);
  if (missingDraftDifference !== 0) {
    return missingDraftDifference;
  }

  const generatedDraftDifference = countGeneratedDrafts(left) - countGeneratedDrafts(right);
  if (generatedDraftDifference !== 0) {
    return generatedDraftDifference;
  }

  return (right?.latestMaterialAt ?? '').localeCompare(left?.latestMaterialAt ?? '')
    || buildProfileLabel(left).localeCompare(buildProfileLabel(right));
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

function summarizeMemoryDraftGap(profile): string | null {
  const missingDrafts = Array.isArray(profile?.foundationDraftStatus?.missingDrafts)
    ? profile.foundationDraftStatus.missingDrafts
    : [];
  if (!missingDrafts.includes('memory')) {
    return null;
  }

  const candidateCount = Number(profile?.foundationReadiness?.memory?.candidateCount ?? 0);
  const summaryPreview = [
    ...(profile?.foundationDraftSummaries?.memory?.latestSummaries ?? []),
    ...(profile?.foundationReadiness?.memory?.sampleSummaries ?? []),
  ].filter((value, index, values) => typeof value === 'string' && value.trim().length > 0 && values.indexOf(value) === index);

  if (candidateCount > 0) {
    const candidateLabel = `${candidateCount} candidate${candidateCount === 1 ? '' : 's'}`;
    return summaryPreview.length > 0
      ? `memory missing, ${candidateLabel} (${summaryPreview[0]})`
      : `memory missing, ${candidateLabel}`;
  }

  return 'memory missing';
}

function summarizeProfileDraftGaps(profile): string | null {
  const gapSummaries = [
    summarizeMemoryDraftGap(profile),
    summarizeDraftGap(profile?.foundationDraftSummaries?.skills, 'skills'),
    summarizeDraftGap(profile?.foundationDraftSummaries?.soul, 'soul'),
    summarizeDraftGap(profile?.foundationDraftSummaries?.voice, 'voice'),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  return gapSummaries.length > 0 ? gapSummaries.join(' | ') : null;
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
  const quotedProfileId = shellQuoteArgument(normalizedProfileId);
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
        ? `node src/index.js import text --person ${quotedProfileId} --file ${shellQuote(runnableTextPath)} --refresh-foundation`
        : `node src/index.js import text --person ${quotedProfileId} --file <sample.txt> --refresh-foundation`),
    message: runnableSampleCommandByType.message
      ?? `node src/index.js import message --person ${quotedProfileId} --text <message> --refresh-foundation`,
    talk: runnableSampleCommandByType.talk
      ?? `node src/index.js import talk --person ${quotedProfileId} --text <snippet> --refresh-foundation`,
    screenshot: runnableSampleCommandByType.screenshot
      ?? `node src/index.js import screenshot --person ${quotedProfileId} --file <image.png> --refresh-foundation`,
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
        sourcePath: normalizedPath,
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
      .map(([path, personId]) => ({
        type: 'text',
        path,
        personId,
        sourcePath: normalizedPath,
      }));
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
      ? `node src/index.js import text --person ${shellQuoteArgument(samplePersonId)} --file ${shellQuote(selectedPath)} --refresh-foundation`
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
  const sourcePath = typeof entry.sourcePath === 'string' && entry.sourcePath.trim().length > 0 ? entry.sourcePath.trim() : null;
  if (!type || !filePath || !personId) {
    return null;
  }

  return {
    type,
    path: filePath,
    personId,
    sourcePath,
    command: `node src/index.js import ${type} --person ${shellQuoteArgument(personId)} --file ${shellQuote(filePath)} --refresh-foundation`,
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
    command: `node src/index.js import ${type} --person ${shellQuoteArgument(personId)} --text ${shellQuote(text)} --refresh-foundation`,
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

function inspectProfileIntakeManifest(rootDir: string | null, intake: any = null, expectedProfileId: string | null = null) {
  const starterManifestPath = typeof intake?.starterManifestPath === 'string' && intake.starterManifestPath.trim().length > 0
    ? intake.starterManifestPath
    : null;
  if (!rootDir || !starterManifestPath || intake?.ready !== true) {
    return {
      status: 'missing',
      path: starterManifestPath,
      error: null,
    };
  }

  const absoluteManifestPath = path.join(rootDir, starterManifestPath);
  let parsedManifest: any;
  try {
    parsedManifest = JSON.parse(stripLeadingUtf8Bom(fs.readFileSync(absoluteManifestPath, 'utf8')));
  } catch (error) {
    return {
      status: 'invalid',
      path: starterManifestPath,
      error: error instanceof Error ? error.message : 'Unable to parse intake manifest',
    };
  }

  const manifest = Array.isArray(parsedManifest)
    ? { entries: parsedManifest }
    : (parsedManifest && typeof parsedManifest === 'object' ? parsedManifest : null);
  if (!manifest) {
    return {
      status: 'invalid',
      path: starterManifestPath,
      error: 'Manifest must be an array or object',
    };
  }

  const entries = manifest.entries;
  const hasStarterTemplates = Array.isArray(entries)
    && entries.length === 0
    && manifest.entryTemplates
    && typeof manifest.entryTemplates === 'object'
    && !Array.isArray(manifest.entryTemplates)
    && Object.keys(manifest.entryTemplates).length > 0;
  if (hasStarterTemplates) {
    return {
      status: 'starter',
      path: starterManifestPath,
      error: null,
    };
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      status: 'invalid',
      path: starterManifestPath,
      error: 'Manifest must contain a non-empty entries array',
    };
  }

  const normalizedExpectedProfileId = typeof expectedProfileId === 'string' && expectedProfileId.trim().length > 0
    ? slugifyPersonId(expectedProfileId)
    : null;
  const manifestDir = path.dirname(absoluteManifestPath);
  const realRootDir = fs.realpathSync(rootDir);
  const supportedTypes = new Set(['text', 'message', 'talk', 'screenshot']);
  try {
    const manifestPersonId = typeof manifest.personId === 'string' && manifest.personId.trim().length > 0
      ? manifest.personId
      : null;
    if (normalizedExpectedProfileId && manifestPersonId && slugifyPersonId(manifestPersonId) !== normalizedExpectedProfileId) {
      throw new Error(`Profile intake manifest targets a different profile: expected ${normalizedExpectedProfileId}`);
    }

    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Manifest entry ${index} must be an object`);
      }

      const resolvedPersonId = typeof entry.personId === 'string' && entry.personId.trim().length > 0
        ? entry.personId
        : manifestPersonId;
      if (normalizedExpectedProfileId && !resolvedPersonId) {
        throw new Error(`Profile intake manifest entry ${index} is missing personId for ${normalizedExpectedProfileId}`);
      }
      if (normalizedExpectedProfileId && resolvedPersonId && slugifyPersonId(resolvedPersonId) !== normalizedExpectedProfileId) {
        throw new Error(`Profile intake manifest entry ${index} targets a different profile: expected ${normalizedExpectedProfileId}`);
      }

      const type = typeof entry.type === 'string' ? entry.type : null;
      if (!type || !supportedTypes.has(type)) {
        throw new Error(`Unsupported manifest entry type at index ${index}: ${entry.type}`);
      }

      if ((type === 'message' || type === 'talk') && (typeof entry.text !== 'string' || entry.text.trim().length === 0)) {
        throw new Error(`Manifest entry ${index} is missing text for ${type} import`);
      }

      if (type === 'text' || type === 'screenshot') {
        if (typeof entry.file !== 'string' || entry.file.trim().length === 0) {
          throw new Error(`Manifest entry ${index} is missing file for ${type} import`);
        }

        const resolvedFilePath = path.resolve(manifestDir, entry.file);
        if (!fs.existsSync(resolvedFilePath)) {
          throw new Error(`Manifest entry ${index} references a missing file: ${entry.file}`);
        }

        const realFilePath = fs.realpathSync(resolvedFilePath);
        if (!fs.statSync(realFilePath).isFile()) {
          throw new Error(`Manifest entry ${index} references a non-file path: ${entry.file}`);
        }

        const relativeFilePath = path.relative(realRootDir, realFilePath);
        if (path.isAbsolute(relativeFilePath) || relativeFilePath.startsWith('..')) {
          throw new Error(`Manifest entry ${index} references a file outside the repo: ${entry.file}`);
        }
      }
    });
  } catch (error) {
    return {
      status: 'invalid',
      path: starterManifestPath,
      error: error instanceof Error ? error.message : 'Invalid intake manifest',
    };
  }

  return {
    status: 'loaded',
    path: starterManifestPath,
    error: null,
  };
}

function summarizeIntakeStatus(intake, manifestInspection = null) {
  if (manifestInspection?.status === 'invalid') {
    return 'invalid manifest — repair materials.template.json';
  }

  if (manifestInspection?.status === 'starter') {
    return 'starter template — add entries before import';
  }

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

function buildProfileCommands(profile, options: any = {}) {
  if (!profile?.id) {
    return null;
  }

  const materialCount = profile.materialCount ?? 0;
  const imported = materialCount > 0;
  const intake = profile?.intake && typeof profile.intake === 'object' ? profile.intake : null;
  const profileSampleTextPath = intake?.ready && typeof intake?.sampleTextPath === 'string' && intake.sampleTextPath.trim().length > 0
    ? intake.sampleTextPath
    : null;
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
  const intakeManifest = inspectProfileIntakeManifest(typeof options?.rootDir === 'string' ? options.rootDir : null, intake, profile.id);
  const intakeManifestPath = intake?.ready && typeof intake?.starterManifestPath === 'string' && intake.starterManifestPath.trim().length > 0
    ? intake.starterManifestPath
    : null;
  const intakeManifestCommandAvailable = intakeManifest.status === 'loaded' || intakeManifest.status === 'starter';
  const importedIntakeCommandsAvailable = intakeManifest.status === 'loaded';
  const intakeImportManifestCommand = intakeManifestPath && intakeManifestCommandAvailable
    ? `node src/index.js import manifest --file ${shellQuote(intakeManifestPath)} --refresh-foundation`
    : null;
  const preferredIntakeManifestCommand = intakeManifest.status === 'loaded'
    ? intakeImportManifestCommand
    : null;
  const profileStarterTextImportCommand = profileSampleTextPath
    ? `node src/index.js import text --person ${shellQuoteArgument(profile.id)} --file ${shellQuote(profileSampleTextPath)} --refresh-foundation`
    : null;
  const defaultImportCommand = imported
    ? null
    : intakeManifest.status === 'invalid'
      ? null
      : (preferredIntakeManifestCommand
        ?? runnableTextImportCommand
        ?? runnableScreenshotImportCommand
        ?? runnableMessageImportCommand
        ?? runnableTalkImportCommand
        ?? profileStarterTextImportCommand
        ?? importCommands.message
        ?? importCommands.talk
        ?? importCommands.text);
  const updateProfileCommand = buildUpdateProfileCommand(profile);
  const updateProfileAndRefreshCommand = imported ? buildUpdateProfileCommand(profile, { refreshFoundation: true }) : null;
  const updateIntakeCommand = buildUpdateIntakeCommand(profile);
  const refreshFoundationCommand = imported ? `node src/index.js update foundation --person ${shellQuote(profile.id)}` : null;
  const importIntakeWithoutRefreshCommand = importedIntakeCommandsAvailable
    ? `node src/index.js import intake --person ${shellQuote(profile.id)}`
    : null;
  const importIntakeCommand = importedIntakeCommandsAvailable
    ? `node src/index.js import intake --person ${shellQuote(profile.id)} --refresh-foundation`
    : null;
  const starterTemplateFollowUpImportIntakeWithoutRefreshCommand = imported
    && intake?.ready === true
    && intakeManifest.status === 'starter'
    ? `node src/index.js import intake --person ${shellQuote(profile.id)}`
    : null;
  const starterTemplateFollowUpImportIntakeCommand = imported
    && intake?.ready === true
    && intakeManifest.status === 'starter'
    ? `node src/index.js import intake --person ${shellQuote(profile.id)} --refresh-foundation`
    : null;
  const starterImportCommand = imported
    && intake?.ready === true
    && intakeManifest.status === 'starter'
    && !importIntakeWithoutRefreshCommand
    && !importIntakeCommand
    ? (
      profileStarterTextImportCommand
      ?? runnableTextImportCommand
      ?? runnableScreenshotImportCommand
      ?? runnableMessageImportCommand
      ?? runnableTalkImportCommand
    )
    : null;

  return {
    personId: profile.id,
    displayName: profile.profile?.displayName ?? profile.id,
    label: buildProfileLabel(profile),
    materialCount,
    materialTypes: profile?.materialTypes && typeof profile.materialTypes === 'object' ? { ...profile.materialTypes } : {},
    latestMaterialAt: imported ? (profile.latestMaterialAt ?? null) : null,
    needsRefresh: imported ? Boolean(profile.foundationDraftStatus?.needsRefresh) : false,
    missingDrafts: imported ? [...(profile.foundationDraftStatus?.missingDrafts ?? [])].sort() : [],
    draftGapSummary: imported ? summarizeProfileDraftGaps(profile) : null,
    updateProfileCommand,
    updateProfileAndRefreshCommand,
    updateIntakeCommand,
    importIntakeWithoutRefreshCommand,
    importIntakeCommand,
    starterImportCommand,
    followUpImportIntakeWithoutRefreshCommand: starterTemplateFollowUpImportIntakeWithoutRefreshCommand,
    followUpImportIntakeCommand: starterTemplateFollowUpImportIntakeCommand,
    intakeReady: intake?.ready ?? false,
    intakeCompletion: intake?.completion ?? 'missing',
    intakeStatusSummary: summarizeIntakeStatus(intake, intakeManifest),
    intakeManifestStatus: intakeManifest.status,
    intakeManifestPath: intakeManifest.path,
    intakeManifestError: intakeManifest.error,
    intakePaths: intake ? [intake.importsDir, intake.intakeReadmePath, intake.starterManifestPath, intake.sampleTextPath].filter(Boolean) : [],
    intakeMissingPaths: intake ? [...(intake.missingPaths ?? [])] : [],
    importManifestCommand: intakeImportManifestCommand,
    refreshFoundationCommand,
    importCommands,
    helperCommands: {
      scaffold: updateIntakeCommand,
      importIntakeWithoutRefresh: importIntakeWithoutRefreshCommand,
      importIntake: importIntakeCommand,
      importManifest: intakeImportManifestCommand,
      starterImport: starterImportCommand,
      updateProfile: updateProfileCommand,
      updateProfileAndRefresh: updateProfileAndRefreshCommand,
      refreshFoundation: refreshFoundationCommand,
      directImports: importCommands,
    },
    importMaterialCommand: defaultImportCommand,
  };
}

function buildFoundationDraftPaths(profileId: string | null | undefined): string[] {
  if (typeof profileId !== 'string' || profileId.length === 0) {
    return [];
  }

  return [
    `profiles/${profileId}/memory/long-term/foundation.json`,
    `profiles/${profileId}/skills/README.md`,
    `profiles/${profileId}/soul/README.md`,
    `profiles/${profileId}/voice/README.md`,
  ];
}

function collectProfileIntakePaths(profile: any): string[] {
  const missingIntakePaths = Array.isArray(profile?.intakeMissingPaths)
    ? profile.intakeMissingPaths.filter((value: any): value is string => typeof value === 'string' && value.length > 0)
    : [];
  if (missingIntakePaths.length > 0) {
    return missingIntakePaths;
  }

  return Array.isArray(profile?.intakePaths)
    ? profile.intakePaths.filter((value: any): value is string => typeof value === 'string' && value.length > 0)
    : [];
}

function collectLoadedManifestFilePaths(rootDir: string, relativeManifestPath: string): string[] {
  const absoluteManifestPath = path.join(rootDir, relativeManifestPath);
  const manifestDir = path.dirname(absoluteManifestPath);
  const realRootDir = fs.realpathSync(rootDir);
  const parsedManifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
  const manifest = Array.isArray(parsedManifest)
    ? { entries: parsedManifest }
    : (parsedManifest && typeof parsedManifest === 'object' ? parsedManifest : null);
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];

  return Array.from(new Set(entries
    .filter((entry) => entry && typeof entry === 'object' && typeof entry.file === 'string' && entry.file.trim().length > 0)
    .map((entry) => {
      const resolvedFilePath = path.resolve(manifestDir, entry.file);
      const realFilePath = fs.realpathSync(resolvedFilePath);
      const relativeFilePath = path.relative(realRootDir, realFilePath);
      return path.isAbsolute(relativeFilePath) || relativeFilePath.startsWith('..')
        ? null
        : relativeFilePath.split(path.sep).join('/');
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0)));
}

function collectReadyIntakeImportPaths(profile: any, rootDir: string | null): string[] {
  const intakePaths = Array.isArray(profile?.intakePaths)
    ? profile.intakePaths.filter((value: any): value is string => typeof value === 'string' && (value.endsWith('materials.template.json') || value.endsWith('sample.txt')))
    : [];
  const starterManifestPath = intakePaths.find((value) => value.endsWith('materials.template.json')) ?? null;
  if (!rootDir || !starterManifestPath) {
    return intakePaths;
  }

  const manifestInspection = inspectProfileIntakeManifest(rootDir, {
    ready: true,
    starterManifestPath,
  }, typeof profile?.personId === 'string' ? profile.personId : null);
  if (!manifestInspection || manifestInspection.status !== 'loaded') {
    return intakePaths;
  }

  return Array.from(new Set([
    ...intakePaths,
    ...collectLoadedManifestFilePaths(rootDir, starterManifestPath),
  ]));
}

export function buildIngestionSummary(profiles: any[] = [], options: any = {}) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const importedProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) > 0);
  const metadataOnlyProfiles = safeProfiles.filter((profile) => (profile?.materialCount ?? 0) <= 0);
  const metadataOnlyProfileCount = metadataOnlyProfiles.length;
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
      rootDir: typeof options?.rootDir === 'string' ? options.rootDir : null,
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
      const leftNeedsAction = leftImported
        ? Boolean(left?.foundationDraftStatus?.needsRefresh) || !left?.foundationDraftStatus?.complete
        : true;
      const rightNeedsAction = rightImported
        ? Boolean(right?.foundationDraftStatus?.needsRefresh) || !right?.foundationDraftStatus?.complete
        : true;
      const actionDelta = Number(rightNeedsAction) - Number(leftNeedsAction);
      if (actionDelta !== 0) {
        return actionDelta;
      }

      const importDelta = rightImported - leftImported;
      if (importDelta !== 0) {
        return importDelta;
      }

      if (leftImported && rightImported && leftNeedsAction && rightNeedsAction) {
        const refreshPriorityDelta = compareFoundationRefreshPriority(left, right);
        if (refreshPriorityDelta !== 0) {
          return refreshPriorityDelta;
        }
      }

      return buildProfileLabel(left).localeCompare(buildProfileLabel(right));
    });
  const allProfileCommands = sortedProfiles
    .map((profile) => buildProfileCommands(profile, {
      rootDir: typeof options?.rootDir === 'string' ? options.rootDir : null,
      sampleFileCommands,
      sampleInlineCommands,
      sampleTextPath: sampleText.path,
      sampleTextPersonId: sampleText.personId,
    }))
    .filter(Boolean);
  const importedIntakeBackfillProfiles = allProfileCommands
    .filter((profile) => (profile?.materialCount ?? 0) > 0 && profile?.intakeReady === false && profile?.updateIntakeCommand);
  const importedInvalidIntakeManifestProfiles = allProfileCommands
    .filter((profile) => (profile?.materialCount ?? 0) > 0 && profile?.intakeReady === true && profile?.intakeManifestStatus === 'invalid');
  const importedStarterIntakeProfiles = allProfileCommands
    .filter((profile) => (profile?.materialCount ?? 0) > 0 && profile?.intakeReady === true && profile?.intakeManifestStatus === 'starter');
  const importedProfilesWithReadyIntake = allProfileCommands
    .filter((profile) => (profile?.materialCount ?? 0) > 0 && profile?.intakeReady === true && profile?.intakeManifestStatus === 'loaded');
  const metadataInvalidIntakeManifestProfiles = metadataProfileCommands
    .filter((profile) => profile?.intakeReady === true && profile?.intakeManifestStatus === 'invalid');
  const metadataStarterIntakeProfiles = metadataProfileCommands
    .filter((profile) => profile?.intakeReady === true && profile?.intakeManifestStatus === 'starter');
  const metadataOnlyProfilesWithImportReadyIntake = metadataProfileCommands
    .filter((profile) => profile?.intakeReady === true && profile?.intakeManifestStatus === 'loaded');
  const metadataOnlyProfilesWithPartialIntake = metadataProfileCommands
    .filter((profile) => profile?.intakeReady === false && profile?.intakeCompletion === 'partial');
  const metadataOnlyProfilesWithMissingIntake = metadataProfileCommands
    .filter((profile) => profile?.intakeReady === false && (profile?.intakeCompletion ?? 'missing') === 'missing');
  const intakeReadyProfileCount = metadataOnlyProfilesWithImportReadyIntake.length;
  const intakeStarterProfileCount = metadataStarterIntakeProfiles.length;
  const intakePartialProfileCount = metadataOnlyProfilesWithPartialIntake.length;
  const intakeMissingProfileCount = metadataOnlyProfilesWithMissingIntake.length;
  const intakeScaffoldProfileCount = metadataOnlyProfileCount - intakeReadyProfileCount;
  const intakeStaleProfileCount = metadataOnlyProfilesWithPartialIntake.length + metadataOnlyProfilesWithMissingIntake.length;
  const orderedProfileCommands = allProfileCommands
    .filter((profile) => {
      const imported = (profile?.materialCount ?? 0) > 0;
      return !imported
        || profile?.needsRefresh
        || profile?.missingDrafts?.length > 0
        || profile?.intakeReady === false
        || profile?.intakeManifestStatus === 'invalid';
    });

  const findSampleFileCommand = (type) => sampleFileCommands.find((entry) => entry?.type === type)?.command ?? null;
  const findSampleInlineCommand = (type) => sampleInlineCommands.find((entry) => entry?.type === type)?.command ?? null;
  const bootstrapProfileCommand = 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"';
  const importedIntakeScaffoldCommand = 'node src/index.js update intake --imported';
  const importedIntakeImportCommand = 'node src/index.js import intake --imported';
  const importedIntakeImportAndRefreshCommand = 'node src/index.js import intake --imported --refresh-foundation';
  const helperCommands = {
    bootstrap: bootstrapProfileCommand,
    scaffoldAll: 'node src/index.js update intake --all',
    scaffoldStale: 'node src/index.js update intake --stale',
    scaffoldImported: importedIntakeScaffoldCommand,
    scaffoldBundle: buildCommandBundle(
      metadataProfileCommands
        .filter((profile) => profile?.intakeReady === false)
        .map((profile) => profile?.updateIntakeCommand),
    ),
    scaffoldImportedBundle: buildCommandBundle(
      importedIntakeBackfillProfiles
        .map((profile) => profile?.updateIntakeCommand),
    ),
    repairInvalidBundle: buildCommandBundle(
      metadataInvalidIntakeManifestProfiles
        .map((profile) => profile?.updateIntakeCommand),
    ),
    repairImportedInvalidBundle: buildCommandBundle(
      importedInvalidIntakeManifestProfiles
        .map((profile) => profile?.updateIntakeCommand),
    ),
    importManifest: 'node src/index.js import manifest --file <manifest.json>',
    importManifestAndRefresh: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
    importIntakeAll: 'node src/index.js import intake --all',
    importIntakeStale: 'node src/index.js import intake --stale',
    importIntakeImported: importedIntakeImportCommand,
    importIntakeImportedAndRefresh: importedIntakeImportAndRefreshCommand,
    importIntakeBundle: buildCommandBundle(
      metadataProfileCommands
        .filter((profile) => profile?.intakeReady === true && profile?.intakeManifestStatus === 'loaded')
        .map((profile) => profile?.importIntakeCommand),
    ),
    updateProfileBundle: buildCommandBundle(
      orderedProfileCommands
        .map((profile) => profile?.updateProfileCommand),
    ),
    updateProfileAndRefreshBundle: buildCommandBundle(
      orderedProfileCommands
        .map((profile) => profile?.updateProfileAndRefreshCommand),
    ),
    refreshAllFoundation: 'node src/index.js update foundation --all',
    refreshStaleFoundation: 'node src/index.js update foundation --stale',
    refreshFoundationBundle: buildCommandBundle(
      allProfileCommands
        .filter((profile) => (profile?.materialCount ?? 0) > 0 && (profile?.needsRefresh || (profile?.missingDrafts?.length ?? 0) > 0))
        .map((profile) => profile?.refreshFoundationCommand),
    ),
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
  const rootDir = typeof options?.rootDir === 'string' ? options.rootDir : null;
  const refreshTargets = allProfileCommands.filter((profile) => (profile?.materialCount ?? 0) > 0 && (profile?.needsRefresh || (profile?.missingDrafts?.length ?? 0) > 0));
  const firstRefreshTarget = refreshTargets[0] ?? null;
  const metadataOnlyProfileNeedingScaffold = metadataProfileCommands.find((profile) => profile?.intakeReady === false && profile?.updateIntakeCommand) ?? null;
  const invalidReadyIntakeProfiles = metadataProfileCommands.filter((profile) =>
    profile?.intakeReady === true
    && profile?.intakeManifestStatus === 'invalid'
    && typeof profile?.intakeManifestPath === 'string'
    && profile.intakeManifestPath.length > 0,
  );
  const readyIntakeProfiles = metadataProfileCommands.filter((profile) =>
    profile?.intakeReady === true
    && profile?.intakeManifestStatus !== 'invalid'
    && profile?.importManifestCommand
    && profile.importManifestCommand === profile.importMaterialCommand
    && !profile.importManifestCommand.includes('<'),
  );
  const metadataOnlyProfile = metadataProfileCommands.find((profile) => profile?.importMaterialCommand) ?? metadataOnlyProfileNeedingScaffold ?? invalidReadyIntakeProfiles[0] ?? null;
  const runnableImportCommand = metadataOnlyProfile?.importMaterialCommand && !metadataOnlyProfile.importMaterialCommand.includes('<')
    ? metadataOnlyProfile.importMaterialCommand
    : null;
  const sampleManifestPaths = sampleManifestPresent && sampleManifestPath
    ? Array.from(new Set([
      sampleManifestPath,
      ...sampleManifest.filePaths,
      typeof sampleText.path === 'string' && sampleText.path.length > 0 ? sampleText.path : null,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0)))
    : [];
  const sampleTextPath = typeof sampleText.path === 'string' && sampleText.path.length > 0
    ? sampleText.path
    : null;
  const sampleTextPersonId = typeof sampleText.personId === 'string' && sampleText.personId.length > 0
    ? sampleText.personId
    : null;

  let recommendedProfileId: string | null = null;
  let recommendedLabel: string | null = null;
  let recommendedAction: string | null = null;
  let recommendedCommand: string | null = null;
  let recommendedEditPath: string | null = null;
  let recommendedFollowUpCommand: string | null = null;
  let recommendedPaths: string[] = [];

  if (safeProfiles.length === 0) {
    const sampleStarterCommand = sampleManifestPresent && sampleManifest.status === 'loaded'
      ? 'node src/index.js import sample'
      : null;
    const exactSampleManifestCommand = sampleManifestPresent && sampleManifest.status === 'loaded'
      ? `node src/index.js import manifest --file ${shellQuote(sampleManifestPath)} --refresh-foundation`
      : null;
    const sampleManifestInvalid = sampleManifest.status === 'invalid' && sampleManifestPath;

    if (sampleStarterCommand) {
      const sampleProfileCount = sampleManifest.profileIds.length;
      recommendedAction = sampleManifest.starterLabel
        ? (sampleProfileCount > 1
          ? `import the checked-in sample target profiles for ${sampleManifest.starterLabel}`
          : `import the checked-in sample target profile for ${sampleManifest.starterLabel}`)
        : 'import the checked-in sample target profile';
      recommendedCommand = exactSampleManifestCommand ?? sampleStarterCommand;
      recommendedPaths = sampleManifestPaths;
    } else if (sampleManifestInvalid) {
      recommendedAction = 'fix the checked-in sample manifest for first imports';
      recommendedCommand = null;
      recommendedPaths = [sampleManifestPath];
    } else {
      recommendedAction = 'bootstrap a target profile';
      recommendedCommand = bootstrapProfileCommand;
      recommendedPaths = sampleManifestPaths;
    }
  } else if (firstRefreshTarget) {
    recommendedProfileId = firstRefreshTarget.personId ?? null;
    recommendedLabel = firstRefreshTarget.label ?? firstRefreshTarget.personId ?? null;
    recommendedAction = 'refresh stale or incomplete target profiles';
    recommendedCommand = helperCommands.refreshFoundationBundle ?? helperCommands.refreshStaleFoundation ?? firstRefreshTarget.refreshFoundationCommand ?? null;
    recommendedPaths = Array.from(new Set(refreshTargets.flatMap((profile) => buildFoundationDraftPaths(profile.personId ?? null))));
  } else if (importedIntakeBackfillProfiles.length > 0) {
    const firstImportedBackfillProfile = importedIntakeBackfillProfiles[0] ?? null;
    recommendedProfileId = firstImportedBackfillProfile?.personId ?? null;
    recommendedLabel = firstImportedBackfillProfile?.label ?? firstImportedBackfillProfile?.personId ?? null;
    recommendedAction = recommendedLabel
      ? `backfill the intake landing zone for imported profiles — starting with ${recommendedLabel}`
      : 'backfill intake landing zones for imported profiles';
    recommendedCommand = importedIntakeBackfillProfiles.length > 1
      ? (helperCommands.scaffoldImportedBundle ?? firstImportedBackfillProfile?.updateIntakeCommand ?? helperCommands.scaffoldImported ?? null)
      : (firstImportedBackfillProfile?.updateIntakeCommand ?? helperCommands.scaffoldImportedBundle ?? helperCommands.scaffoldImported ?? null);
    recommendedPaths = importedIntakeBackfillProfiles.length > 1
      ? importedIntakeBackfillProfiles.flatMap((profile) => collectProfileIntakePaths(profile))
      : collectProfileIntakePaths(firstImportedBackfillProfile);
  } else if (importedInvalidIntakeManifestProfiles.length > 0) {
    const firstInvalidImportedIntakeProfile = importedInvalidIntakeManifestProfiles[0] ?? null;
    recommendedProfileId = firstInvalidImportedIntakeProfile?.personId ?? null;
    recommendedLabel = firstInvalidImportedIntakeProfile?.label ?? firstInvalidImportedIntakeProfile?.personId ?? null;
    recommendedAction = recommendedLabel
      ? (importedInvalidIntakeManifestProfiles.length > 1
        ? `repair invalid intake manifests for imported profiles — starting with ${recommendedLabel}`
        : `repair the invalid intake manifest for imported profile ${recommendedLabel}`)
      : 'repair invalid intake manifests for imported profiles';
    recommendedCommand = importedInvalidIntakeManifestProfiles.length > 1
      ? (helperCommands.repairImportedInvalidBundle ?? firstInvalidImportedIntakeProfile?.updateIntakeCommand ?? null)
      : (firstInvalidImportedIntakeProfile?.updateIntakeCommand ?? helperCommands.repairImportedInvalidBundle ?? null);
    recommendedPaths = importedInvalidIntakeManifestProfiles.length > 1
      ? Array.from(new Set(importedInvalidIntakeManifestProfiles.map((profile) => profile?.intakeManifestPath).filter((value): value is string => typeof value === 'string' && value.length > 0)))
      : (firstInvalidImportedIntakeProfile?.intakeManifestPath ? [firstInvalidImportedIntakeProfile.intakeManifestPath] : []);
  } else if (importedStarterIntakeProfiles.length > 0) {
    const firstImportedStarterIntakeProfile = importedStarterIntakeProfiles[0] ?? null;
    recommendedProfileId = firstImportedStarterIntakeProfile?.personId ?? null;
    recommendedLabel = firstImportedStarterIntakeProfile?.label ?? firstImportedStarterIntakeProfile?.personId ?? null;
    recommendedAction = recommendedLabel
      ? (importedStarterIntakeProfiles.length > 1
        ? `populate imported intake starter manifests — starting with ${recommendedLabel}`
        : `populate the imported intake starter manifest for ${recommendedLabel}`)
      : 'populate imported intake starter manifests';
    recommendedCommand = null;
    recommendedEditPath = firstImportedStarterIntakeProfile?.intakeManifestPath ?? null;
    recommendedFollowUpCommand = importedStarterIntakeProfiles.length > 1
      ? helperCommands.importIntakeImportedAndRefresh
      : (firstImportedStarterIntakeProfile?.personId
        ? `node src/index.js import intake --person ${shellQuote(firstImportedStarterIntakeProfile.personId)} --refresh-foundation`
        : null);
    recommendedPaths = importedStarterIntakeProfiles.length > 1
      ? Array.from(new Set(importedStarterIntakeProfiles.flatMap((profile) => collectProfileIntakePaths(profile))))
      : collectProfileIntakePaths(firstImportedStarterIntakeProfile);
  } else if (metadataOnlyProfileCount === 0 && importedProfilesWithReadyIntake.length > 0) {
    const firstImportedReadyIntakeProfile = importedProfilesWithReadyIntake[0] ?? null;
    recommendedProfileId = firstImportedReadyIntakeProfile?.personId ?? null;
    recommendedLabel = firstImportedReadyIntakeProfile?.label ?? firstImportedReadyIntakeProfile?.personId ?? null;
    recommendedAction = importedProfilesWithReadyIntake.length > 1
      ? (recommendedLabel
        ? `import source materials for imported intake replays — starting with ${recommendedLabel}`
        : 'import source materials for imported intake replays')
      : (recommendedLabel
        ? `import source materials for ${recommendedLabel}`
        : 'import source materials for imported intake replays');
    recommendedCommand = importedProfilesWithReadyIntake.length > 1
      ? (helperCommands.importIntakeImportedAndRefresh
        ?? helperCommands.importIntakeBundle
        ?? firstImportedReadyIntakeProfile?.importIntakeCommand
        ?? firstImportedReadyIntakeProfile?.importManifestCommand
        ?? null)
      : (firstImportedReadyIntakeProfile?.importIntakeCommand
        ?? firstImportedReadyIntakeProfile?.importManifestCommand
        ?? firstImportedReadyIntakeProfile?.importMaterialCommand
        ?? helperCommands.importIntakeImportedAndRefresh
        ?? null);
    recommendedPaths = importedProfilesWithReadyIntake.length > 1
      ? importedProfilesWithReadyIntake.flatMap((profile) => collectReadyIntakeImportPaths(profile, rootDir))
      : collectReadyIntakeImportPaths(firstImportedReadyIntakeProfile, rootDir);
  } else if (metadataOnlyProfileCount > 0) {
    if (metadataOnlyProfileNeedingScaffold) {
      recommendedProfileId = metadataOnlyProfileNeedingScaffold.personId ?? null;
      recommendedLabel = metadataOnlyProfileNeedingScaffold.label ?? metadataOnlyProfileNeedingScaffold.personId ?? null;
      const isPartialIntake = metadataOnlyProfileNeedingScaffold?.intakeCompletion === 'partial';
      const useBulkIntakeCommand = intakeStaleProfileCount > 1 && Boolean(helperCommands.scaffoldBundle ?? 'node src/index.js update intake --stale');
      recommendedAction = recommendedLabel
        ? (useBulkIntakeCommand
          ? `${isPartialIntake ? 'complete' : 'scaffold'} incomplete intake landing zones — starting with ${recommendedLabel}`
          : `${isPartialIntake ? 'complete' : 'scaffold'} the intake landing zone for ${recommendedLabel}`)
        : `${isPartialIntake ? 'complete' : 'scaffold'} intake landing zones for metadata-only profiles`;
      recommendedCommand = useBulkIntakeCommand
        ? (helperCommands.scaffoldBundle ?? 'node src/index.js update intake --stale')
        : (metadataOnlyProfileNeedingScaffold.updateIntakeCommand ?? helperCommands.scaffoldBundle ?? 'node src/index.js update intake --stale');
      recommendedPaths = useBulkIntakeCommand
        ? metadataProfileCommands
          .filter((profile) => profile?.intakeReady === false && profile?.updateIntakeCommand)
          .flatMap((profile) => collectProfileIntakePaths(profile))
        : collectProfileIntakePaths(metadataOnlyProfileNeedingScaffold);
    } else if (invalidReadyIntakeProfiles.length > 0) {
      const firstInvalidReadyIntakeProfile = invalidReadyIntakeProfiles[0] ?? null;
      recommendedProfileId = firstInvalidReadyIntakeProfile?.personId ?? null;
      recommendedLabel = firstInvalidReadyIntakeProfile?.label ?? firstInvalidReadyIntakeProfile?.personId ?? null;
      recommendedAction = recommendedLabel
        ? (invalidReadyIntakeProfiles.length > 1
          ? `repair invalid profile-local intake manifests — starting with ${recommendedLabel}`
          : `repair the invalid intake manifest for ${recommendedLabel}`)
        : 'repair invalid profile-local intake manifests';
      recommendedCommand = invalidReadyIntakeProfiles.length > 1
        ? (helperCommands.repairInvalidBundle ?? firstInvalidReadyIntakeProfile?.updateIntakeCommand ?? null)
        : (firstInvalidReadyIntakeProfile?.updateIntakeCommand ?? helperCommands.repairInvalidBundle ?? null);
      recommendedPaths = invalidReadyIntakeProfiles.length > 1
        ? Array.from(new Set(invalidReadyIntakeProfiles.map((profile) => profile?.intakeManifestPath).filter((value): value is string => typeof value === 'string' && value.length > 0)))
        : (firstInvalidReadyIntakeProfile?.intakeManifestPath ? [firstInvalidReadyIntakeProfile.intakeManifestPath] : []);
    } else if (readyIntakeProfiles.length > 0) {
      const firstReadyIntakeProfile = readyIntakeProfiles[0] ?? null;
      recommendedProfileId = firstReadyIntakeProfile?.personId ?? null;
      recommendedLabel = firstReadyIntakeProfile?.label ?? firstReadyIntakeProfile?.personId ?? null;
      recommendedAction = readyIntakeProfiles.length > 1
        ? (recommendedLabel
          ? `import source materials for ready intake profiles — starting with ${recommendedLabel}`
          : 'import source materials for ready intake profiles')
        : (recommendedLabel
          ? `import source materials for ${recommendedLabel}`
          : 'import source materials for ready intake profiles');
      recommendedCommand = readyIntakeProfiles.length > 1
        ? (helperCommands.importIntakeBundle ?? helperCommands.importIntakeStale ?? helperCommands.importIntakeAll ?? firstReadyIntakeProfile?.importIntakeCommand ?? firstReadyIntakeProfile?.importManifestCommand ?? null)
        : (firstReadyIntakeProfile?.importMaterialCommand ?? firstReadyIntakeProfile?.importManifestCommand ?? firstReadyIntakeProfile?.importIntakeCommand ?? helperCommands.importIntakeBundle ?? helperCommands.importIntakeStale ?? helperCommands.importIntakeAll ?? null);
      recommendedPaths = readyIntakeProfiles.length > 1
        ? readyIntakeProfiles.flatMap((profile) => collectReadyIntakeImportPaths(profile, rootDir))
        : collectReadyIntakeImportPaths(firstReadyIntakeProfile, rootDir);
    } else if (runnableImportCommand) {
      recommendedProfileId = metadataOnlyProfile?.personId ?? null;
      recommendedLabel = metadataOnlyProfile?.label ?? metadataOnlyProfile?.personId ?? null;
      recommendedAction = recommendedLabel
        ? `import source materials for ${recommendedLabel}`
        : 'import source materials for metadata-only profiles';
      recommendedCommand = runnableImportCommand;
      recommendedPaths = metadataOnlyProfile?.importManifestCommand === runnableImportCommand
        ? collectReadyIntakeImportPaths(metadataOnlyProfile, rootDir)
        : (() => {
          const matchingSampleFile = sampleFileCommands.find((entry) =>
            entry?.personId === metadataOnlyProfile?.personId
            && entry?.command === runnableImportCommand
            && typeof entry?.path === 'string'
            && entry.path.length > 0,
          );

          if (matchingSampleFile) {
            return Array.from(new Set([
              typeof matchingSampleFile.sourcePath === 'string' && matchingSampleFile.sourcePath.length > 0
                ? matchingSampleFile.sourcePath
                : null,
              matchingSampleFile.path,
            ].filter((value): value is string => typeof value === 'string' && value.length > 0)));
          }

          const matchingSampleInline = sampleInlineCommands.find((entry) =>
            entry?.personId === metadataOnlyProfile?.personId
            && entry?.command === runnableImportCommand
            && typeof entry?.sourcePath === 'string'
            && entry.sourcePath.length > 0,
          );

          if (matchingSampleInline) {
            return [matchingSampleInline.sourcePath];
          }

          if (sampleTextPath && sampleTextPersonId === metadataOnlyProfile?.personId) {
            return [sampleTextPath];
          }

          if (metadataOnlyProfile?.intakeReady === true && metadataOnlyProfile?.importCommands?.text === runnableImportCommand) {
            return collectReadyIntakeImportPaths(metadataOnlyProfile, rootDir);
          }

          return [];
        })();
    } else if (sampleManifestPresent && sampleManifest.status === 'loaded') {
      recommendedAction = 'import source materials for metadata-only profiles';
      recommendedCommand = helperCommands.sampleManifest ?? helperCommands.importManifest ?? null;
      recommendedPaths = sampleManifestPaths;
    } else {
      recommendedProfileId = metadataOnlyProfile?.personId ?? null;
      recommendedLabel = metadataOnlyProfile?.label ?? metadataOnlyProfile?.personId ?? null;
      recommendedAction = recommendedLabel
        ? `import source materials for ${recommendedLabel}`
        : 'import source materials for metadata-only profiles';
      recommendedCommand = runnableImportCommand;
      recommendedPaths = [];
    }
  }

  return {
    profileCount: safeProfiles.length,
    importedProfileCount: importedProfiles.length,
    metadataOnlyProfileCount,
    readyProfileCount: importedProfiles.filter((profile) => !profile.foundationDraftStatus?.needsRefresh && profile.foundationDraftStatus?.complete).length,
    refreshProfileCount: importedProfiles.filter((profile) => profile.foundationDraftStatus?.needsRefresh).length,
    incompleteProfileCount: importedProfiles.filter((profile) => !profile.foundationDraftStatus?.complete).length,
    importedIntakeReadyProfileCount: importedProfilesWithReadyIntake.length,
    importedStarterIntakeProfileCount: importedStarterIntakeProfiles.length,
    importedIntakeBackfillProfileCount: importedIntakeBackfillProfiles.length,
    importedInvalidIntakeManifestProfileCount: importedInvalidIntakeManifestProfiles.length,
    invalidMetadataOnlyIntakeManifestProfileCount: metadataInvalidIntakeManifestProfiles.length,
    intakeReadyProfileCount,
    intakeStarterProfileCount,
    intakePartialProfileCount,
    intakeMissingProfileCount,
    intakeScaffoldProfileCount,
    intakeStaleProfileCount,
    intakeImportAllCommand: 'node src/index.js import intake --all',
    intakeImportStaleCommand: 'node src/index.js import intake --stale',
    intakeImportImportedCommand: importedIntakeImportCommand,
    intakeImportImportedAndRefreshCommand: importedIntakeImportAndRefreshCommand,
    supportedImportTypes: ['message', 'screenshot', 'talk', 'text'],
    bootstrapProfileCommand,
    intakeAllCommand: 'node src/index.js update intake --all',
    intakeStaleCommand: 'node src/index.js update intake --stale',
    intakeImportedCommand: importedIntakeScaffoldCommand,
    sampleImportCommand: 'node src/index.js import text --person <person-id> --file <sample.txt> --refresh-foundation',
    importManifestCommand: 'node src/index.js import manifest --file <manifest.json>',
    importManifestAndRefreshCommand: 'node src/index.js import manifest --file <manifest.json> --refresh-foundation',
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
      ? sampleManifestPath
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
    refreshFoundationBundleCommand: helperCommands.refreshFoundationBundle,
    repairInvalidIntakeBundleCommand: helperCommands.repairInvalidBundle,
    repairImportedInvalidIntakeBundleCommand: helperCommands.repairImportedInvalidBundle,
    recommendedProfileId,
    recommendedLabel,
    recommendedAction,
    recommendedCommand,
    recommendedEditPath,
    recommendedFollowUpCommand,
    recommendedPaths,
    helperCommands,
    profileCommands: orderedProfileCommands,
    allProfileCommands,
    metadataProfileCommands,
  };
}

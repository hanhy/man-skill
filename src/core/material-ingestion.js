import fs from 'node:fs';
import path from 'node:path';
import {
  FileSystemLoader,
  hasFoundationDraftProfileMetadataMismatch,
  hasValidFoundationMarkdownDraft,
  parseDraftMetadata,
} from './fs-loader.js';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readJsonFileState(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      parsed: null,
      parseError: null,
    };
  }

  try {
    return {
      exists: true,
      parsed: JSON.parse(fs.readFileSync(filePath, 'utf8')),
      parseError: null,
    };
  } catch (error) {
    return {
      exists: true,
      parsed: null,
      parseError: error instanceof Error ? error.message : 'Unable to parse JSON file',
    };
  }
}

function slugifyPersonId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function listDirectoriesIfExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeText(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.replace(/\s+/g, ' ').trim();
}

function buildExcerpt(value, maxLength = 160) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function sortByNewest(records) {
  return [...records].sort(
    (left, right) =>
      (right.createdAt ?? '').localeCompare(left.createdAt ?? '') || (right.id ?? '').localeCompare(left.id ?? ''),
  );
}

function summarizeMaterialTypes(records) {
  return records.reduce((summary, record) => {
    if (!isNonEmptyString(record?.type)) {
      return summary;
    }

    summary[record.type] = (summary[record.type] ?? 0) + 1;
    return summary;
  }, {});
}

function formatMaterialTypes(materialTypes = {}) {
  const entries = Object.entries(materialTypes).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return 'none';
  }

  return entries.map(([type, count]) => `${type}:${count}`).join(', ');
}

function buildDraftHeaderLines({ title, normalizedPersonId, profileDocument, generatedAt, latestMaterialRecord, materialCount, materialTypes }) {
  return [
    `# ${title}`,
    '',
    `Profile: ${normalizedPersonId}`,
    `Display name: ${profileDocument?.displayName ?? normalizedPersonId}`,
    `Summary: ${profileDocument?.summary ?? 'Not set.'}`,
    `Generated at: ${generatedAt}`,
    `Latest material: ${latestMaterialRecord?.createdAt ?? 'Not set.'} (${latestMaterialRecord?.id ?? 'none'})`,
    `Source materials: ${materialCount} (${formatMaterialTypes(materialTypes)})`,
    '',
  ];
}

function resolveImportFile(baseDir, filePath) {
  if (!isNonEmptyString(filePath)) {
    return null;
  }

  return path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
}

function assertFileWithinRoot({ rootDir, filePath, errorLabel, originalPath = filePath }) {
  if (!isNonEmptyString(filePath) || !fs.existsSync(filePath)) {
    throw new Error(`${errorLabel} references a missing file: ${originalPath}`);
  }

  const realRootDir = fs.realpathSync(rootDir);
  const realFilePath = fs.realpathSync(filePath);
  const fileStats = fs.statSync(realFilePath);
  if (!fileStats.isFile()) {
    throw new Error(`${errorLabel} references a non-file path: ${originalPath}`);
  }

  const relativeFilePath = path.relative(realRootDir, realFilePath);
  if (path.isAbsolute(relativeFilePath) || relativeFilePath === '..' || relativeFilePath.startsWith(`..${path.sep}`)) {
    throw new Error(`${errorLabel} references a file outside the repo root: ${originalPath}`);
  }

  return realFilePath;
}

function buildProfileDocument({ existingProfile = null, normalizedId, personId, displayName, summary }) {
  const now = new Date().toISOString();
  const normalizedDisplayName = normalizeText(displayName);
  const normalizedSummary = summary === undefined ? undefined : normalizeText(summary);

  return {
    id: normalizedId,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
    displayName: normalizedDisplayName ?? existingProfile?.displayName ?? normalizeText(personId) ?? normalizedId,
    summary: normalizedSummary === undefined ? (existingProfile?.summary ?? null) : normalizedSummary,
  };
}

function buildManifestImportCommand(manifestPath) {
  return `node src/index.js import manifest --file ${shellQuote(manifestPath)}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function buildDirectImportCommands({ personId, sampleTextPath }) {
  return {
    text: `node src/index.js import text --person ${personId} --file ${shellQuote(sampleTextPath)} --refresh-foundation`,
    message: `node src/index.js import message --person ${personId} --text <message> --refresh-foundation`,
    talk: `node src/index.js import talk --person ${personId} --text <snippet> --refresh-foundation`,
    screenshot: `node src/index.js import screenshot --person ${personId} --file <image.png> --refresh-foundation`,
  };
}

function buildUpdateIntakeCommand({ personId, displayName, summary }) {
  const commandParts = ['node src/index.js update intake', '--person', shellQuote(personId)];

  if (isNonEmptyString(displayName)) {
    commandParts.push('--display-name', shellQuote(displayName));
  }

  if (isNonEmptyString(summary)) {
    commandParts.push('--summary', shellQuote(summary));
  }

  return commandParts.join(' ');
}

function buildUpdateProfileCommand({ personId, displayName, summary, refreshFoundation = false }) {
  const commandParts = ['node src/index.js update profile', '--person', shellQuote(personId)];

  if (isNonEmptyString(displayName)) {
    commandParts.push('--display-name', shellQuote(displayName));
  }

  if (isNonEmptyString(summary)) {
    commandParts.push('--summary', shellQuote(summary));
  }

  if (refreshFoundation) {
    commandParts.push('--refresh-foundation');
  }

  return commandParts.join(' ');
}

function buildImportIntakeCommand(personId) {
  return `node src/index.js import intake --person ${shellQuote(personId)} --refresh-foundation`;
}

function buildIntakePaths(personId) {
  const basePath = path.join('profiles', personId, 'imports');
  return {
    importsDir: basePath,
    intakeReadmePath: path.join(basePath, 'README.md'),
    starterManifestPath: path.join(basePath, 'materials.template.json'),
    sampleTextPath: path.join(basePath, 'sample.txt'),
  };
}

function backupInvalidJsonFile(filePath) {
  if (!isNonEmptyString(filePath) || !fs.existsSync(filePath)) {
    return null;
  }

  const backupPath = `${filePath}.invalid-${timestampId()}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function buildStarterManifestDocument({
  personId,
  displayName,
  summary,
  existingEntries = [],
  existingEntryTemplates = null,
  sampleTextPath = 'sample.txt',
}) {
  const defaultEntryTemplates = {
    text: {
      type: 'text',
      file: sampleTextPath,
      notes: 'long-form writing sample',
    },
    message: {
      type: 'message',
      text: '<paste a representative short message>',
      notes: 'chat sample',
    },
    talk: {
      type: 'talk',
      text: '<paste a transcript snippet>',
      notes: 'voice memo transcript',
    },
    screenshot: {
      type: 'screenshot',
      file: '<relative-path-to-image.png>',
      notes: 'chat screenshot',
    },
  };
  const mergedEntryTemplates = Object.fromEntries(
    Object.entries(defaultEntryTemplates).map(([templateKey, templateValue]) => {
      const existingTemplate = existingEntryTemplates?.[templateKey];
      return [
        templateKey,
        existingTemplate && typeof existingTemplate === 'object'
          ? { ...templateValue, ...existingTemplate, type: templateValue.type }
          : templateValue,
      ];
    }),
  );

  return {
    personId,
    displayName: normalizeText(displayName) ?? personId,
    summary: summary === undefined ? null : (normalizeText(summary) ?? null),
    entries: Array.isArray(existingEntries) ? existingEntries : [],
    entryTemplates: mergedEntryTemplates,
  };
}

const INTAKE_CUSTOM_NOTES_START = '<!-- man-skill:intake-custom-notes:start -->';
const INTAKE_CUSTOM_NOTES_END = '<!-- man-skill:intake-custom-notes:end -->';
const DEFAULT_INTAKE_CUSTOM_NOTES = 'Add notes about where future materials should come from.';

function extractIntakeCustomNotes(existingReadme) {
  if (typeof existingReadme !== 'string' || existingReadme.length === 0) {
    return DEFAULT_INTAKE_CUSTOM_NOTES;
  }

  const startIndex = existingReadme.indexOf(INTAKE_CUSTOM_NOTES_START);
  const endIndex = existingReadme.indexOf(INTAKE_CUSTOM_NOTES_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return DEFAULT_INTAKE_CUSTOM_NOTES;
  }

  const extracted = existingReadme
    .slice(startIndex + INTAKE_CUSTOM_NOTES_START.length, endIndex)
    .replace(/^\s+|\s+$/g, '');

  return extracted.length > 0 ? extracted : DEFAULT_INTAKE_CUSTOM_NOTES;
}

function normalizeBlockText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/^\s+|\s+$/g, '');
  return normalized.length > 0 ? normalized : null;
}

function buildIntakeReadme({
  displayName,
  personId,
  starterManifestPath,
  sampleTextPath,
  importManifestCommand,
  importCommands,
  updateIntakeCommand,
  importIntakeCommand,
  updateProfileCommand,
  updateProfileAndRefreshCommand,
  customNotes,
}) {
  const label = normalizeText(displayName) ?? personId;
  const managedCustomNotes = normalizeBlockText(customNotes) ?? DEFAULT_INTAKE_CUSTOM_NOTES;
  return [
    `# Intake scaffold for ${label}`,
    '',
    'Use this folder as the user-facing entrance for collecting target-person materials before import.',
    '',
    `- Starter manifest: ${starterManifestPath}`,
    `- Sample text placeholder: ${sampleTextPath}`,
    `- Import after editing: ${importManifestCommand}`,
    '',
    'Suggested flow:',
    '1. Replace sample.txt with a real writing sample or point the manifest at real files.',
    '2. Copy the entryTemplates from materials.template.json into entries and fill in real content.',
    '3. Run the import command above to ingest materials and refresh foundation drafts.',
    '',
    'Recommended helper commands:',
    `- refresh this intake scaffold: ${updateIntakeCommand}`,
    `- import via the profile-local intake shortcut: ${importIntakeCommand}`,
    `- edit target-profile metadata without refreshing drafts: ${updateProfileCommand}`,
    `- sync target-profile metadata and refresh drafts: ${updateProfileAndRefreshCommand}`,
    '',
    'Direct import commands:',
    `- text: ${importCommands?.text}`,
    `- message: ${importCommands?.message}`,
    `- talk: ${importCommands?.talk}`,
    `- screenshot: ${importCommands?.screenshot}`,
    '',
    'Custom notes:',
    INTAKE_CUSTOM_NOTES_START,
    managedCustomNotes,
    INTAKE_CUSTOM_NOTES_END,
    '',
  ].join('\n');
}

function buildProfileLabel({ personId, displayName }) {
  return displayName && displayName !== personId ? `${displayName} (${personId})` : (displayName ?? personId);
}

function buildProfileCommandSummaries({ manifestPath, profileSummary, materialCount, materialTypes }) {
  const personId = profileSummary?.id;
  const displayName = normalizeText(profileSummary?.profile?.displayName) ?? personId;
  const summary = profileSummary?.profile?.summary ?? null;
  const importCommand = buildManifestImportCommand(manifestPath);
  const updateProfileCommand = buildUpdateProfileCommand({ personId, displayName, summary });
  const updateProfileAndRefreshCommand = buildUpdateProfileCommand({ personId, displayName, summary, refreshFoundation: true });
  const refreshFoundationCommand = `node src/index.js update foundation --person ${personId}`;
  const scaffoldCommand = buildUpdateIntakeCommand({ personId, displayName, summary });
  const importIntakeCommand = buildImportIntakeCommand(personId);

  return {
    personId,
    displayName,
    label: buildProfileLabel({ personId, displayName }),
    summary,
    materialCount,
    materialTypes,
    needsRefresh: Boolean(profileSummary?.foundationDraftStatus?.needsRefresh),
    missingDrafts: [...(profileSummary?.foundationDraftStatus?.missingDrafts ?? [])].sort(),
    importCommand,
    updateProfileCommand,
    updateProfileAndRefreshCommand,
    refreshFoundationCommand,
    helperCommands: {
      scaffold: scaffoldCommand,
      importIntake: importIntakeCommand,
      importManifest: importCommand,
      updateProfile: updateProfileCommand,
      updateProfileAndRefresh: updateProfileAndRefreshCommand,
      refreshFoundation: refreshFoundationCommand,
    },
  };
}

export class MaterialIngestion {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  resolve(...segments) {
    return path.join(this.rootDir, ...segments);
  }

  ensureProfile(personId, profileUpdates = {}) {
    const normalizedId = slugifyPersonId(personId);
    if (!normalizedId) {
      throw new Error('personId is required');
    }

    const profileDir = this.resolve('profiles', normalizedId);
    const materialsDir = ensureDir(path.join(profileDir, 'materials'));
    ensureDir(path.join(materialsDir, 'screenshots'));
    const profilePath = path.join(profileDir, 'profile.json');

    const existingProfile = readJsonIfExists(profilePath);
    if (!existingProfile || Object.keys(profileUpdates).length > 0) {
      const profileDocument = buildProfileDocument({
        existingProfile,
        normalizedId,
        personId,
        displayName: profileUpdates.displayName,
        summary: profileUpdates.summary,
      });
      fs.writeFileSync(profilePath, JSON.stringify(profileDocument, null, 2));
    }

    return { personId: normalizedId, profileDir, materialsDir, profilePath };
  }

  updateProfile({ personId, displayName, summary }) {
    const normalized = this.ensureProfile(personId, { displayName, summary });
    return {
      personId: normalized.personId,
      profilePath: normalized.profilePath,
      profile: readJsonIfExists(normalized.profilePath),
    };
  }

  scaffoldProfileIntake({ personId, displayName, summary }) {
    const profileUpdate = this.updateProfile({ personId, displayName, summary });
    const intakePaths = buildIntakePaths(profileUpdate.personId);
    ensureDir(this.resolve(intakePaths.importsDir));
    const relativeSampleTextPath = intakePaths.sampleTextPath.split(path.sep).join('/');
    const importCommands = buildDirectImportCommands({
      personId: profileUpdate.personId,
      sampleTextPath: relativeSampleTextPath,
    });

    const starterManifestAbsolutePath = this.resolve(intakePaths.starterManifestPath);
    const existingTemplateState = readJsonFileState(starterManifestAbsolutePath);
    const existingTemplate = existingTemplateState.parsed && typeof existingTemplateState.parsed === 'object' && !Array.isArray(existingTemplateState.parsed)
      ? existingTemplateState.parsed
      : null;
    const invalidStarterManifestBackupPath = existingTemplateState.parseError
      ? backupInvalidJsonFile(starterManifestAbsolutePath)
      : null;
    const starterManifest = buildStarterManifestDocument({
      personId: profileUpdate.personId,
      displayName: profileUpdate.profile?.displayName,
      summary: profileUpdate.profile?.summary,
      existingEntries: existingTemplate?.entries,
      existingEntryTemplates: existingTemplate?.entryTemplates,
      sampleTextPath: path.basename(relativeSampleTextPath),
    });
    fs.writeFileSync(starterManifestAbsolutePath, JSON.stringify(starterManifest, null, 2));

    if (!fs.existsSync(this.resolve(intakePaths.sampleTextPath))) {
      fs.writeFileSync(
        this.resolve(intakePaths.sampleTextPath),
        `Replace this file with a real writing sample for ${profileUpdate.profile?.displayName ?? profileUpdate.personId}.\n`,
      );
    }

    const importManifestCommand = `${buildManifestImportCommand(intakePaths.starterManifestPath)} --refresh-foundation`;
    const updateProfileCommand = buildUpdateProfileCommand({
      personId: profileUpdate.personId,
      displayName: profileUpdate.profile?.displayName,
      summary: profileUpdate.profile?.summary,
    });
    const updateProfileAndRefreshCommand = buildUpdateProfileCommand({
      personId: profileUpdate.personId,
      displayName: profileUpdate.profile?.displayName,
      summary: profileUpdate.profile?.summary,
      refreshFoundation: true,
    });
    const updateIntakeCommand = buildUpdateIntakeCommand({
      personId: profileUpdate.personId,
      displayName: profileUpdate.profile?.displayName,
      summary: profileUpdate.profile?.summary,
    });
    const importIntakeCommand = buildImportIntakeCommand(profileUpdate.personId);
    const existingReadme = fs.existsSync(this.resolve(intakePaths.intakeReadmePath))
      ? fs.readFileSync(this.resolve(intakePaths.intakeReadmePath), 'utf8')
      : null;
    fs.writeFileSync(
      this.resolve(intakePaths.intakeReadmePath),
      buildIntakeReadme({
        displayName: profileUpdate.profile?.displayName,
        personId: profileUpdate.personId,
        starterManifestPath: intakePaths.starterManifestPath.split(path.sep).join('/'),
        sampleTextPath: relativeSampleTextPath,
        importManifestCommand,
        importCommands,
        updateIntakeCommand,
        importIntakeCommand,
        updateProfileCommand,
        updateProfileAndRefreshCommand,
        customNotes: extractIntakeCustomNotes(existingReadme),
      }),
    );

    return {
      ...profileUpdate,
      intakeReadmePath: intakePaths.intakeReadmePath.split(path.sep).join('/'),
      starterManifestPath: intakePaths.starterManifestPath.split(path.sep).join('/'),
      sampleTextPath: relativeSampleTextPath,
      invalidStarterManifestBackupPath: typeof invalidStarterManifestBackupPath === 'string'
        ? path.relative(this.rootDir, invalidStarterManifestBackupPath).split(path.sep).join('/')
        : null,
      importManifestCommand,
      importIntakeCommand,
      updateIntakeCommand,
      importCommands,
      refreshFoundationCommand: `node src/index.js update foundation --person ${profileUpdate.personId}`,
      updateProfileCommand,
      updateProfileAndRefreshCommand,
      helperCommands: {
        scaffold: updateIntakeCommand,
        importIntake: importIntakeCommand,
        importManifest: importManifestCommand,
        updateProfile: updateProfileCommand,
        updateProfileAndRefresh: updateProfileAndRefreshCommand,
        refreshFoundation: `node src/index.js update foundation --person ${profileUpdate.personId}`,
        directImports: importCommands,
      },
    };
  }

  listMetadataOnlyProfiles() {
    return new FileSystemLoader(this.rootDir)
      .loadProfilesIndex()
      .filter((profile) => (profile?.materialCount ?? 0) <= 0)
      .sort((left, right) => {
        const completionRank = (profile) => {
          const completion = profile?.intake?.completion;
          if (completion === 'partial') {
            return 0;
          }

          if ((completion ?? 'missing') === 'missing') {
            return 1;
          }

          return 2;
        };

        const rankDelta = completionRank(left) - completionRank(right);
        if (rankDelta !== 0) {
          return rankDelta;
        }

        return (left?.id ?? '').localeCompare(right?.id ?? '');
      });
  }

  listProfilesWithReadyIntake({ includeImported = true } = {}) {
    return new FileSystemLoader(this.rootDir)
      .loadProfilesIndex()
      .filter((profile) => {
        if (!includeImported && (profile?.materialCount ?? 0) > 0) {
          return false;
        }

        return profile?.intake?.ready && isNonEmptyString(profile?.intake?.starterManifestPath);
      })
      .sort((left, right) => (left?.id ?? '').localeCompare(right?.id ?? ''));
  }

  scaffoldAllProfileIntakes() {
    const profiles = this.listMetadataOnlyProfiles();

    return {
      profileCount: profiles.length,
      results: profiles.map((profile) => this.scaffoldProfileIntake({
        personId: profile.id,
        displayName: profile?.profile?.displayName,
        summary: profile?.profile?.summary,
      })),
    };
  }

  scaffoldStaleProfileIntakes() {
    const profiles = this.listMetadataOnlyProfiles()
      .filter((profile) => !profile?.intake?.ready);

    return {
      profileCount: profiles.length,
      results: profiles.map((profile) => this.scaffoldProfileIntake({
        personId: profile.id,
        displayName: profile?.profile?.displayName,
        summary: profile?.profile?.summary,
      })),
    };
  }

  importProfileIntakeManifest({ personId }) {
    const normalizedPersonId = slugifyPersonId(personId ?? '');
    if (!normalizedPersonId) {
      throw new Error('personId is required for intake import');
    }

    const profile = new FileSystemLoader(this.rootDir)
      .loadProfilesIndex()
      .find((entry) => entry?.id === normalizedPersonId);
    if (!profile) {
      throw new Error(`No profile found for intake import: ${personId}`);
    }

    if (!profile?.intake?.ready || !isNonEmptyString(profile?.intake?.starterManifestPath)) {
      throw new Error(`Profile intake scaffold is not ready for import: ${normalizedPersonId}`);
    }

    return this.importManifest({
      manifestFile: profile.intake.starterManifestPath,
      refreshFoundation: true,
    });
  }

  importAllProfileIntakeManifests() {
    const profiles = this.listProfilesWithReadyIntake();
    const results = profiles.map((profile) => this.importProfileIntakeManifest({ personId: profile.id }));

    return {
      profileCount: profiles.length,
      entryCount: results.reduce((total, result) => total + (result?.entryCount ?? 0), 0),
      profileIds: [...new Set(results.flatMap((result) => result?.profileIds ?? []))].sort(),
      results,
    };
  }

  importStaleProfileIntakeManifests() {
    const profiles = this.listProfilesWithReadyIntake({ includeImported: false });
    const results = profiles.map((profile) => this.importProfileIntakeManifest({ personId: profile.id }));

    return {
      profileCount: profiles.length,
      entryCount: results.reduce((total, result) => total + (result?.entryCount ?? 0), 0),
      profileIds: [...new Set(results.flatMap((result) => result?.profileIds ?? []))].sort(),
      results,
    };
  }

  writeMaterialRecord({ personId, type, content = null, notes = null, sourceFile = null, assetPath = null, assetRelativePath = null }) {
    const { materialsDir } = this.ensureProfile(personId);
    const materialId = `${timestampId()}-${type}`;
    const recordPath = path.join(materialsDir, `${materialId}.json`);

    fs.writeFileSync(
      recordPath,
      JSON.stringify(
        {
          id: materialId,
          personId,
          type,
          createdAt: new Date().toISOString(),
          notes,
          sourceFile,
          assetPath: assetRelativePath,
          content,
        },
        null,
        2,
      ),
    );

    return { materialId, recordPath, assetPath };
  }

  importTextDocument({ personId, sourceFile, notes = null }) {
    if (!sourceFile) {
      throw new Error('sourceFile is required for text import');
    }

    const normalized = this.ensureProfile(personId);
    const content = fs.readFileSync(sourceFile, 'utf8');
    const result = this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'text',
      content,
      notes,
      sourceFile: path.relative(this.rootDir, sourceFile),
    });
    this.scaffoldProfileIntake({ personId: normalized.personId });
    return result;
  }

  importMessage({ personId, text, notes = null }) {
    if (!text) {
      throw new Error('text is required for message import');
    }

    const normalized = this.ensureProfile(personId);
    const result = this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'message',
      content: text,
      notes,
    });
    this.scaffoldProfileIntake({ personId: normalized.personId });
    return result;
  }

  importTalkSnippet({ personId, text, notes = null }) {
    if (!text) {
      throw new Error('text is required for talk import');
    }

    const normalized = this.ensureProfile(personId);
    const result = this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'talk',
      content: text,
      notes,
    });
    this.scaffoldProfileIntake({ personId: normalized.personId });
    return result;
  }

  importScreenshotSource({ personId, sourceFile, notes = null }) {
    if (!sourceFile) {
      throw new Error('sourceFile is required for screenshot import');
    }

    const normalized = this.ensureProfile(personId);
    const assetFileName = `${timestampId()}-${path.basename(sourceFile)}`;
    const targetPath = path.join(normalized.materialsDir, 'screenshots', assetFileName);
    fs.copyFileSync(sourceFile, targetPath);

    const result = this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'screenshot',
      notes,
      sourceFile: path.relative(this.rootDir, sourceFile),
      assetPath: targetPath,
      assetRelativePath: path.relative(this.rootDir, targetPath),
    });
    this.scaffoldProfileIntake({ personId: normalized.personId });
    return result;
  }

  importManifest({ manifestFile, refreshFoundation = false }) {
    if (!manifestFile) {
      throw new Error('manifestFile is required for manifest import');
    }

    const resolvedManifestPath = resolveImportFile(this.rootDir, manifestFile);
    const validatedManifestPath = assertFileWithinRoot({
      rootDir: this.rootDir,
      filePath: resolvedManifestPath,
      errorLabel: 'Manifest file',
      originalPath: manifestFile,
    });
    const manifest = readJsonIfExists(validatedManifestPath);
    if (!manifest) {
      throw new Error(`Unable to read manifest JSON: ${manifestFile}`);
    }

    const shorthandProfile = !Array.isArray(manifest) && isNonEmptyString(manifest?.personId)
      ? {
          personId: manifest.personId,
          displayName: manifest.displayName,
          summary: manifest.summary,
        }
      : null;
    const manifestProfiles = [
      ...(shorthandProfile ? [shorthandProfile] : []),
      ...(Array.isArray(manifest?.profiles) ? manifest.profiles : []),
    ];
    const validatedProfiles = manifestProfiles.map((profile, index) => {
      if (!profile || typeof profile !== 'object') {
        throw new Error(`Manifest profile ${index} must be an object`);
      }

      if (!isNonEmptyString(profile.personId)) {
        throw new Error(`Manifest profile ${index} is missing personId`);
      }

      return {
        personId: profile.personId,
        displayName: profile.displayName,
        summary: profile.summary,
      };
    });

    const entries = Array.isArray(manifest) ? manifest : manifest.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Manifest must contain a non-empty entries array');
    }

    const defaultPersonId = shorthandProfile?.personId ?? null;
    const manifestDir = path.dirname(validatedManifestPath);
    const validatedEntries = entries.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Manifest entry ${index} must be an object`);
      }

      const resolvedPersonId = entry.personId ?? defaultPersonId;
      if (!isNonEmptyString(resolvedPersonId)) {
        throw new Error(`Manifest entry ${index} is missing personId`);
      }

      const normalizedPersonId = slugifyPersonId(resolvedPersonId);
      if (!normalizedPersonId) {
        throw new Error(`Manifest entry ${index} is missing personId`);
      }

      if (entry.type === 'text') {
        return {
          personId: resolvedPersonId,
          normalizedPersonId,
          type: 'text',
          sourceFile: assertFileWithinRoot({
            rootDir: this.rootDir,
            filePath: resolveImportFile(manifestDir, entry.file),
            errorLabel: `Manifest entry ${index}`,
            originalPath: entry.file,
          }),
          notes: entry.notes ?? null,
        };
      }

      if (entry.type === 'message') {
        if (!isNonEmptyString(entry.text)) {
          throw new Error(`Manifest entry ${index} is missing text for message import`);
        }

        return {
          personId: resolvedPersonId,
          normalizedPersonId,
          type: 'message',
          text: entry.text,
          notes: entry.notes ?? null,
        };
      }

      if (entry.type === 'talk') {
        if (!isNonEmptyString(entry.text)) {
          throw new Error(`Manifest entry ${index} is missing text for talk import`);
        }

        return {
          personId: resolvedPersonId,
          normalizedPersonId,
          type: 'talk',
          text: entry.text,
          notes: entry.notes ?? null,
        };
      }

      if (entry.type === 'screenshot') {
        return {
          personId: resolvedPersonId,
          normalizedPersonId,
          type: 'screenshot',
          sourceFile: assertFileWithinRoot({
            rootDir: this.rootDir,
            filePath: resolveImportFile(manifestDir, entry.file),
            errorLabel: `Manifest entry ${index}`,
            originalPath: entry.file,
          }),
          notes: entry.notes ?? null,
        };
      }

      throw new Error(`Unsupported manifest entry type at index ${index}: ${entry.type}`);
    });

    validatedProfiles.forEach((profile) => {
      this.updateProfile(profile);
    });

    const results = validatedEntries.map((entry) => {
      if (entry.type === 'text') {
        return {
          personId: entry.normalizedPersonId,
          type: 'text',
          ...this.importTextDocument({
            personId: entry.personId,
            sourceFile: entry.sourceFile,
            notes: entry.notes,
          }),
        };
      }

      if (entry.type === 'message') {
        return {
          personId: entry.normalizedPersonId,
          type: 'message',
          ...this.importMessage({
            personId: entry.personId,
            text: entry.text,
            notes: entry.notes,
          }),
        };
      }

      if (entry.type === 'talk') {
        return {
          personId: entry.normalizedPersonId,
          type: 'talk',
          ...this.importTalkSnippet({
            personId: entry.personId,
            text: entry.text,
            notes: entry.notes,
          }),
        };
      }

      return {
        personId: entry.normalizedPersonId,
        type: 'screenshot',
        ...this.importScreenshotSource({
          personId: entry.personId,
          sourceFile: entry.sourceFile,
          notes: entry.notes,
        }),
      };
    });

    const relativeManifestPath = path.relative(this.rootDir, resolvedManifestPath);
    const profileIds = [...new Set(results.map((entry) => entry.personId))].sort();
    const foundationRefresh = refreshFoundation
      ? {
          profileCount: profileIds.length,
          results: profileIds.map((personId) => this.refreshFoundationDrafts({ personId })),
        }
      : null;
    const profileIndex = new FileSystemLoader(this.rootDir).loadProfilesIndex();
    const profileSummaries = profileIds.map((personId) => {
      const profileResults = results.filter((entry) => entry.personId === personId);
      const profileSummary = profileIndex.find((profile) => profile.id === personId) ?? {
        id: personId,
        profile: readJsonIfExists(this.resolve('profiles', personId, 'profile.json')),
        foundationDraftStatus: {
          needsRefresh: true,
          missingDrafts: ['memory', 'skills', 'soul', 'voice'],
        },
      };

      return buildProfileCommandSummaries({
        manifestPath: relativeManifestPath,
        profileSummary,
        materialCount: profileResults.length,
        materialTypes: summarizeMaterialTypes(profileResults),
      });
    });

    return {
      manifestFile: relativeManifestPath,
      entryCount: results.length,
      profileIds,
      profileSummaries,
      ...(foundationRefresh ? { foundationRefresh } : {}),
      results,
    };
  }

  loadMaterialRecords(personId) {
    const normalized = this.ensureProfile(personId);
    return fs
      .readdirSync(normalized.materialsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => readJsonIfExists(path.join(normalized.materialsDir, entry.name)))
      .filter(Boolean);
  }

  refreshFoundationDrafts({ personId }) {
    const normalized = this.ensureProfile(personId);
    const profileDocument = readJsonIfExists(normalized.profilePath);
    const materialRecords = sortByNewest(this.loadMaterialRecords(normalized.personId));

    if (materialRecords.length === 0) {
      throw new Error(`No imported materials found for profile ${normalized.personId}`);
    }

    const memoryDir = ensureDir(path.join(normalized.profileDir, 'memory', 'long-term'));
    const voiceDir = ensureDir(path.join(normalized.profileDir, 'voice'));
    const soulDir = ensureDir(path.join(normalized.profileDir, 'soul'));
    const skillsDir = ensureDir(path.join(normalized.profileDir, 'skills'));

    const memoryDraftPath = path.join(memoryDir, 'foundation.json');
    const voiceDraftPath = path.join(voiceDir, 'README.md');
    const soulDraftPath = path.join(soulDir, 'README.md');
    const skillsDraftPath = path.join(skillsDir, 'README.md');
    const generatedAt = new Date().toISOString();

    const memoryEntries = materialRecords.map((record) => ({
      type: record.type,
      createdAt: record.createdAt,
      summary: buildExcerpt(record.content ?? record.notes ?? record.sourceFile),
      sourceFile: record.sourceFile ?? null,
    }));
    const latestMaterialRecord = materialRecords[0] ?? null;
    const materialTypes = summarizeMaterialTypes(materialRecords);

    const voiceSamples = materialRecords
      .filter((record) => ['text', 'message', 'talk'].includes(record.type))
      .map((record) => ({
        type: record.type,
        excerpt: buildExcerpt(record.content),
      }))
      .filter((record) => record.excerpt)
      .slice(0, 5);

    const soulSignals = materialRecords
      .filter((record) => ['text', 'talk'].includes(record.type))
      .map((record) => ({
        type: record.type,
        excerpt: buildExcerpt(record.content),
      }))
      .filter((record) => record.excerpt)
      .slice(0, 5);

    const skillSignals = materialRecords
      .filter((record) => record.type === 'talk' && isNonEmptyString(record.notes))
      .map((record) => ({
        note: buildExcerpt(record.notes),
        excerpt: buildExcerpt(record.content),
      }))
      .slice(0, 5);

    fs.writeFileSync(
      memoryDraftPath,
      JSON.stringify(
        {
          personId: normalized.personId,
          displayName: profileDocument?.displayName ?? normalized.personId,
          summary: profileDocument?.summary ?? null,
          generatedAt,
          latestMaterialAt: latestMaterialRecord?.createdAt ?? null,
          latestMaterialId: latestMaterialRecord?.id ?? null,
          materialTypes,
          entryCount: memoryEntries.length,
          entries: memoryEntries,
        },
        null,
        2,
      ),
    );

    fs.writeFileSync(
      voiceDraftPath,
      [
        ...buildDraftHeaderLines({
          title: 'Voice draft',
          normalizedPersonId: normalized.personId,
          profileDocument,
          generatedAt,
          latestMaterialRecord,
          materialCount: materialRecords.length,
          materialTypes,
        }),
        'Representative voice excerpts:',
        ...voiceSamples.map((sample) => `- [${sample.type}] ${sample.excerpt}`),
      ].join('\n'),
    );

    fs.writeFileSync(
      soulDraftPath,
      [
        ...buildDraftHeaderLines({
          title: 'Soul draft',
          normalizedPersonId: normalized.personId,
          profileDocument,
          generatedAt,
          latestMaterialRecord,
          materialCount: materialRecords.length,
          materialTypes,
        }),
        'Candidate soul signals:',
        ...soulSignals.map((signal) => `- [${signal.type}] ${signal.excerpt}`),
      ].join('\n'),
    );

    fs.writeFileSync(
      skillsDraftPath,
      [
        ...buildDraftHeaderLines({
          title: 'Skills draft',
          normalizedPersonId: normalized.personId,
          profileDocument,
          generatedAt,
          latestMaterialRecord,
          materialCount: materialRecords.length,
          materialTypes,
        }),
        'Candidate procedural skills:',
        ...skillSignals.flatMap((signal) => {
          const lines = [];
          if (signal.note) {
            lines.push(`- ${signal.note}`);
          }
          if (signal.excerpt) {
            lines.push(`  - sample: ${signal.excerpt}`);
          }
          return lines;
        }),
      ].join('\n'),
    );

    const updateProfileCommand = buildUpdateProfileCommand({
      personId: normalized.personId,
      displayName: profileDocument?.displayName,
      summary: profileDocument?.summary,
    });
    const updateProfileAndRefreshCommand = buildUpdateProfileCommand({
      personId: normalized.personId,
      displayName: profileDocument?.displayName,
      summary: profileDocument?.summary,
      refreshFoundation: true,
    });
    const refreshFoundationCommand = `node src/index.js update foundation --person ${normalized.personId}`;
    const updateIntakeCommand = buildUpdateIntakeCommand({
      personId: normalized.personId,
      displayName: profileDocument?.displayName,
      summary: profileDocument?.summary,
    });
    const importIntakeCommand = buildImportIntakeCommand(normalized.personId);
    const helperCommands = {
      refreshFoundation: refreshFoundationCommand,
      updateProfile: updateProfileCommand,
      updateProfileAndRefresh: updateProfileAndRefreshCommand,
      updateIntake: updateIntakeCommand,
      importIntake: importIntakeCommand,
    };

    return {
      personId: normalized.personId,
      memoryDraftPath,
      voiceDraftPath,
      soulDraftPath,
      skillsDraftPath,
      generatedAt,
      refreshFoundationCommand,
      updateProfileCommand,
      updateProfileAndRefreshCommand,
      updateIntakeCommand,
      importIntakeCommand,
      helperCommands,
    };
  }

  refreshAllFoundationDrafts() {
    const profilesDir = this.resolve('profiles');
    const profileIds = listDirectoriesIfExists(profilesDir)
      .filter((profileId) => this.loadMaterialRecords(profileId).length > 0);

    return {
      profileCount: profileIds.length,
      results: profileIds.map((personId) => this.refreshFoundationDrafts({ personId })),
    };
  }

  refreshStaleFoundationDrafts() {
    const profilesDir = this.resolve('profiles');
    const profileIds = listDirectoriesIfExists(profilesDir)
      .filter((profileId) => {
        const materialRecords = this.loadMaterialRecords(profileId);
        if (materialRecords.length === 0) {
          return false;
        }

        const latestMaterialRecord = sortByNewest(materialRecords)[0] ?? null;
        const latestMaterialAt = latestMaterialRecord?.createdAt ?? null;
        const profileDocument = readJsonIfExists(this.resolve('profiles', profileId, 'profile.json'));

        const memoryDraftPath = this.resolve('profiles', profileId, 'memory', 'long-term', 'foundation.json');
        const voiceDraftPath = this.resolve('profiles', profileId, 'voice', 'README.md');
        const soulDraftPath = this.resolve('profiles', profileId, 'soul', 'README.md');
        const skillsDraftPath = this.resolve('profiles', profileId, 'skills', 'README.md');

        if (!fs.existsSync(memoryDraftPath) || !fs.existsSync(voiceDraftPath) || !fs.existsSync(soulDraftPath) || !fs.existsSync(skillsDraftPath)) {
          return true;
        }

        if (!hasValidFoundationMarkdownDraft(voiceDraftPath) || !hasValidFoundationMarkdownDraft(soulDraftPath) || !hasValidFoundationMarkdownDraft(skillsDraftPath)) {
          return true;
        }

        const voiceMetadata = parseDraftMetadata(voiceDraftPath);
        const soulMetadata = parseDraftMetadata(soulDraftPath);
        const skillsMetadata = parseDraftMetadata(skillsDraftPath);
        if ([voiceMetadata, soulMetadata, skillsMetadata].some((draftMetadata) => hasFoundationDraftProfileMetadataMismatch(draftMetadata, profileId, profileDocument))) {
          return true;
        }

        const memoryDraft = readJsonIfExists(memoryDraftPath);
        if (!memoryDraft?.generatedAt) {
          return true;
        }

        if ((memoryDraft.displayName ?? profileId) !== (profileDocument?.displayName ?? profileId)) {
          return true;
        }

        if ((memoryDraft.summary ?? null) !== (profileDocument?.summary ?? null)) {
          return true;
        }

        if (memoryDraft.latestMaterialId && latestMaterialRecord?.id) {
          return memoryDraft.latestMaterialId !== latestMaterialRecord.id;
        }

        return Boolean(latestMaterialAt) && latestMaterialAt > memoryDraft.generatedAt;
      });

    return {
      profileCount: profileIds.length,
      results: profileIds.map((personId) => this.refreshFoundationDrafts({ personId })),
    };
  }
}

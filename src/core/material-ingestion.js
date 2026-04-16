import fs from 'node:fs';
import path from 'node:path';
import { FileSystemLoader, hasValidFoundationMarkdownDraft } from './fs-loader.js';

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
  return `node src/index.js import manifest --file ${manifestPath}`;
}

function buildProfileLabel({ personId, displayName }) {
  return displayName && displayName !== personId ? `${displayName} (${personId})` : (displayName ?? personId);
}

function buildProfileCommandSummaries({ manifestPath, profileSummary, materialCount, materialTypes }) {
  const personId = profileSummary?.id;
  const displayName = normalizeText(profileSummary?.profile?.displayName) ?? personId;

  return {
    personId,
    displayName,
    label: buildProfileLabel({ personId, displayName }),
    summary: profileSummary?.profile?.summary ?? null,
    materialCount,
    materialTypes,
    needsRefresh: Boolean(profileSummary?.foundationDraftStatus?.needsRefresh),
    missingDrafts: [...(profileSummary?.foundationDraftStatus?.missingDrafts ?? [])].sort(),
    importCommand: buildManifestImportCommand(manifestPath),
    updateProfileCommand: `node src/index.js update profile --person ${personId}`,
    refreshFoundationCommand: `node src/index.js update foundation --person ${personId}`,
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
    return this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'text',
      content,
      notes,
      sourceFile: path.relative(this.rootDir, sourceFile),
    });
  }

  importMessage({ personId, text, notes = null }) {
    if (!text) {
      throw new Error('text is required for message import');
    }

    const normalized = this.ensureProfile(personId);
    return this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'message',
      content: text,
      notes,
    });
  }

  importTalkSnippet({ personId, text, notes = null }) {
    if (!text) {
      throw new Error('text is required for talk import');
    }

    const normalized = this.ensureProfile(personId);
    return this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'talk',
      content: text,
      notes,
    });
  }

  importScreenshotSource({ personId, sourceFile, notes = null }) {
    if (!sourceFile) {
      throw new Error('sourceFile is required for screenshot import');
    }

    const normalized = this.ensureProfile(personId);
    const assetFileName = `${timestampId()}-${path.basename(sourceFile)}`;
    const targetPath = path.join(normalized.materialsDir, 'screenshots', assetFileName);
    fs.copyFileSync(sourceFile, targetPath);

    return this.writeMaterialRecord({
      personId: normalized.personId,
      type: 'screenshot',
      notes,
      sourceFile: path.relative(this.rootDir, sourceFile),
      assetPath: targetPath,
      assetRelativePath: path.relative(this.rootDir, targetPath),
    });
  }

  importManifest({ manifestFile, refreshFoundation = false }) {
    if (!manifestFile) {
      throw new Error('manifestFile is required for manifest import');
    }

    const resolvedManifestPath = resolveImportFile(this.rootDir, manifestFile);
    const manifest = readJsonIfExists(resolvedManifestPath);
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
    for (const [index, profile] of manifestProfiles.entries()) {
      if (!profile || typeof profile !== 'object') {
        throw new Error(`Manifest profile ${index} must be an object`);
      }

      if (!isNonEmptyString(profile.personId)) {
        throw new Error(`Manifest profile ${index} is missing personId`);
      }

      this.updateProfile({
        personId: profile.personId,
        displayName: profile.displayName,
        summary: profile.summary,
      });
    }

    const entries = Array.isArray(manifest) ? manifest : manifest.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Manifest must contain a non-empty entries array');
    }

    const defaultPersonId = shorthandProfile?.personId ?? null;
    const manifestDir = path.dirname(resolvedManifestPath);
    const results = entries.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Manifest entry ${index} must be an object`);
      }

      const resolvedPersonId = entry.personId ?? defaultPersonId;
      if (!isNonEmptyString(resolvedPersonId)) {
        throw new Error(`Manifest entry ${index} is missing personId`);
      }

      const normalizedPersonId = slugifyPersonId(resolvedPersonId);

      if (entry.type === 'text') {
        return {
          personId: normalizedPersonId,
          type: 'text',
          ...this.importTextDocument({
            personId: resolvedPersonId,
            sourceFile: resolveImportFile(manifestDir, entry.file),
            notes: entry.notes ?? null,
          }),
        };
      }

      if (entry.type === 'message') {
        return {
          personId: normalizedPersonId,
          type: 'message',
          ...this.importMessage({
            personId: resolvedPersonId,
            text: entry.text,
            notes: entry.notes ?? null,
          }),
        };
      }

      if (entry.type === 'talk') {
        return {
          personId: normalizedPersonId,
          type: 'talk',
          ...this.importTalkSnippet({
            personId: resolvedPersonId,
            text: entry.text,
            notes: entry.notes ?? null,
          }),
        };
      }

      if (entry.type === 'screenshot') {
        return {
          personId: normalizedPersonId,
          type: 'screenshot',
          ...this.importScreenshotSource({
            personId: resolvedPersonId,
            sourceFile: resolveImportFile(manifestDir, entry.file),
            notes: entry.notes ?? null,
          }),
        };
      }

      throw new Error(`Unsupported manifest entry type at index ${index}: ${entry.type}`);
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

    return {
      personId: normalized.personId,
      memoryDraftPath,
      voiceDraftPath,
      soulDraftPath,
      skillsDraftPath,
      generatedAt,
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

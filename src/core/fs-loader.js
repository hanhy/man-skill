import fs from 'node:fs';
import path from 'node:path';

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
}

function listFilesIfExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
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

function loadSkillInventory(rootDir) {
  const skillNames = listDirectoriesIfExists(path.join(rootDir, 'skills'));
  const documented = skillNames.filter((skillName) => fs.existsSync(path.join(rootDir, 'skills', skillName, 'SKILL.md')));
  const undocumented = skillNames.filter((skillName) => !documented.includes(skillName));

  return {
    names: skillNames,
    documented,
    undocumented,
  };
}

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

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildExcerpt(value, maxLength = 160) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
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

function summarizeFoundationReadiness(materialRecords) {
  const memoryRecords = sortByNewest(materialRecords);
  const voiceRecords = sortByNewest(materialRecords.filter((record) => ['text', 'message', 'talk'].includes(record.type)));
  const soulRecords = sortByNewest(materialRecords.filter((record) => ['text', 'talk'].includes(record.type)));
  const skillRecords = sortByNewest(
    materialRecords.filter((record) => record.type === 'talk' && isNonEmptyString(record.notes)),
  );

  return {
    memory: {
      candidateCount: memoryRecords.length,
      latestTypes: memoryRecords.slice(0, 3).map((record) => record.type),
      sampleSummaries: memoryRecords
        .filter((record) => record.type !== 'screenshot')
        .map((record) => buildExcerpt(record.content ?? record.notes ?? record.sourceFile))
        .filter(Boolean)
        .slice(0, 3),
    },
    voice: {
      candidateCount: voiceRecords.length,
      sampleTypes: voiceRecords.slice(0, 3).map((record) => record.type),
      sampleExcerpts: voiceRecords
        .map((record) => buildExcerpt(record.content))
        .filter(Boolean)
        .slice(0, 3),
    },
    soul: {
      candidateCount: soulRecords.length,
      sampleTypes: soulRecords.slice(0, 3).map((record) => record.type),
      sampleExcerpts: soulRecords
        .map((record) => buildExcerpt(record.content))
        .filter(Boolean)
        .slice(0, 3),
    },
    skills: {
      candidateCount: skillRecords.length,
      sampleTypes: skillRecords.slice(0, 3).map((record) => record.type),
      sampleExcerpts: skillRecords
        .map((record) => buildExcerpt(record.notes))
        .filter(Boolean)
        .slice(0, 3),
    },
  };
}

function loadMaterialSummaries(materialsDir) {
  const materialFiles = listFilesIfExists(materialsDir)
    .filter((name) => name.endsWith('.json'));
  const materialRecords = materialFiles
    .map((name) => readJsonIfExists(path.join(materialsDir, name)))
    .filter(Boolean);
  const newestRecords = sortByNewest(materialRecords);

  const materialTypes = {};
  for (const record of materialRecords) {
    materialTypes[record.type] = (materialTypes[record.type] ?? 0) + 1;
  }

  return {
    materialTypes,
    latestMaterialAt: newestRecords[0]?.createdAt ?? null,
    latestMaterialId: newestRecords[0]?.id ?? null,
    foundationReadiness: summarizeFoundationReadiness(materialRecords),
  };
}

function loadProfileDocument(rootDir, profileId) {
  return readJsonIfExists(path.join(rootDir, 'profiles', profileId, 'profile.json'));
}

function loadFoundationDrafts(rootDir, profileId) {
  const candidates = {
    memory: path.join(rootDir, 'profiles', profileId, 'memory', 'long-term', 'foundation.json'),
    voice: path.join(rootDir, 'profiles', profileId, 'voice', 'README.md'),
    soul: path.join(rootDir, 'profiles', profileId, 'soul', 'README.md'),
    skills: path.join(rootDir, 'profiles', profileId, 'skills', 'README.md'),
  };

  return Object.fromEntries(
    Object.entries(candidates)
      .filter(([, candidatePath]) => fs.existsSync(candidatePath))
      .map(([key, candidatePath]) => [key, path.relative(rootDir, candidatePath)]),
  );
}

function readMarkdownHighlights(filePath, limit = 3) {
  const content = readTextIfExists(filePath);
  if (!content) {
    return [];
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .slice(0, limit);
}

function parseMaterialTypes(value) {
  if (!isNonEmptyString(value) || value === 'none') {
    return {};
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((summary, entry) => {
      const [type, count] = entry.split(':');
      if (!isNonEmptyString(type) || !isNonEmptyString(count)) {
        return summary;
      }

      const parsedCount = Number.parseInt(count, 10);
      if (!Number.isFinite(parsedCount)) {
        return summary;
      }

      summary[type] = parsedCount;
      return summary;
    }, {});
}

export function parseDraftMetadata(filePath) {
  const content = readTextIfExists(filePath);
  if (!content) {
    return null;
  }

  const profileMatch = content.match(/^Profile:\s+(.+)$/m);
  const displayNameMatch = content.match(/^Display name:\s+(.+)$/m);
  const summaryMatch = content.match(/^Summary:\s+(.+)$/m);
  const generatedAtMatch = content.match(/^Generated at:\s+(.+)$/m);
  const latestMaterialMatch = content.match(/^Latest material:\s+(.+) \((.+)\)$/m);
  const sourceMaterialsMatch = content.match(/^Source materials:\s+(\d+)\s+\((.*)\)$/m);
  const profileId = profileMatch?.[1] ?? null;
  const displayName = displayNameMatch?.[1] ?? null;
  const summary = summaryMatch?.[1] ?? null;
  const generatedAt = generatedAtMatch?.[1] ?? null;
  const latestMaterialAt = latestMaterialMatch?.[1] ?? null;
  const latestMaterialId = latestMaterialMatch?.[2] ?? null;
  const sourceCount = sourceMaterialsMatch ? Number.parseInt(sourceMaterialsMatch[1], 10) : 0;
  const materialTypes = parseMaterialTypes(sourceMaterialsMatch?.[2] ?? null);

  return {
    profileId,
    displayName,
    summary,
    generatedAt,
    latestMaterialAt,
    latestMaterialId,
    sourceCount,
    materialTypes,
    valid: Boolean(
      profileMatch
      && displayNameMatch
      && summaryMatch
      && generatedAtMatch
      && latestMaterialMatch
      && sourceMaterialsMatch
      && isNonEmptyString(profileId)
      && isNonEmptyString(displayName)
      && isNonEmptyString(summary)
      && isNonEmptyString(generatedAt)
      && isNonEmptyString(latestMaterialAt)
      && isNonEmptyString(latestMaterialId)
    ),
  };
}

export function hasValidFoundationMarkdownDraft(filePath) {
  return Boolean(parseDraftMetadata(filePath)?.valid);
}

export function hasFoundationDraftProfileMetadataMismatch(draftMetadata = null, profileId, profileDocument = null) {
  if (!draftMetadata?.valid) {
    return false;
  }

  const expectedProfileId = profileId;
  const expectedDisplayName = profileDocument?.displayName ?? profileId;
  const expectedSummary = profileDocument?.summary ?? null;

  return (draftMetadata.profileId ?? profileId) !== expectedProfileId
    || (draftMetadata.displayName ?? profileId) !== expectedDisplayName
    || (draftMetadata.summary === 'Not set.' ? null : (draftMetadata.summary ?? null)) !== expectedSummary;
}

function loadFoundationDraftStatus(rootDir, profileId, latestMaterialAt = null, latestMaterialId = null, profileDocument = null) {
  const candidates = {
    memory: path.join(rootDir, 'profiles', profileId, 'memory', 'long-term', 'foundation.json'),
    voice: path.join(rootDir, 'profiles', profileId, 'voice', 'README.md'),
    soul: path.join(rootDir, 'profiles', profileId, 'soul', 'README.md'),
    skills: path.join(rootDir, 'profiles', profileId, 'skills', 'README.md'),
  };
  const missingDrafts = new Set(
    Object.entries(candidates)
      .filter(([, candidatePath]) => !fs.existsSync(candidatePath))
      .map(([key]) => key),
  );
  const memoryDraft = readJsonIfExists(candidates.memory);
  if (fs.existsSync(candidates.memory) && !memoryDraft) {
    missingDrafts.add('memory');
  }

  const voiceMetadata = parseDraftMetadata(candidates.voice);
  const soulMetadata = parseDraftMetadata(candidates.soul);
  const skillsMetadata = parseDraftMetadata(candidates.skills);

  for (const [draftName, draftMetadata] of [
    ['voice', voiceMetadata],
    ['soul', soulMetadata],
    ['skills', skillsMetadata],
  ]) {
    if (fs.existsSync(candidates[draftName]) && !draftMetadata?.valid) {
      missingDrafts.add(draftName);
    }
  }

  const generatedAt = memoryDraft?.generatedAt ?? null;
  const expectedDisplayName = profileDocument?.displayName ?? profileId;
  const expectedSummary = profileDocument?.summary ?? null;
  const hasProfileMetadataMismatch = Boolean(memoryDraft)
    && (
      (memoryDraft.displayName ?? profileId) !== expectedDisplayName
      || (memoryDraft.summary ?? null) !== expectedSummary
    );
  const hasMarkdownMetadataMismatch = [voiceMetadata, soulMetadata, skillsMetadata]
    .some((draftMetadata) => hasFoundationDraftProfileMetadataMismatch(draftMetadata, profileId, profileDocument));
  const hasNewerMaterial = latestMaterialId && memoryDraft?.latestMaterialId
    ? memoryDraft.latestMaterialId !== latestMaterialId
    : Boolean(latestMaterialAt) && (!generatedAt || latestMaterialAt > generatedAt);
  const needsRefresh = missingDrafts.size > 0 || hasNewerMaterial || hasProfileMetadataMismatch || hasMarkdownMetadataMismatch;

  return {
    generatedAt,
    complete: missingDrafts.size === 0,
    missingDrafts: [...missingDrafts].sort(),
    needsRefresh,
  };
}

function summarizeLegacyMemoryDraft(memoryDraft) {
  const entries = Array.isArray(memoryDraft?.entries) ? memoryDraft.entries : [];
  const materialTypes = memoryDraft?.materialTypes && Object.keys(memoryDraft.materialTypes).length > 0
    ? memoryDraft.materialTypes
    : entries.reduce((summary, entry) => {
        if (!isNonEmptyString(entry?.type)) {
          return summary;
        }

        summary[entry.type] = (summary[entry.type] ?? 0) + 1;
        return summary;
      }, {});
  const sourceCount = Object.keys(materialTypes).length > 0
    ? Object.values(materialTypes).reduce((total, count) => total + count, 0)
    : (memoryDraft?.entryCount ?? entries.length ?? 0);

  return {
    generatedAt: memoryDraft?.generatedAt ?? null,
    latestMaterialAt: memoryDraft?.latestMaterialAt ?? null,
    latestMaterialId: memoryDraft?.latestMaterialId ?? null,
    sourceCount,
    materialTypes,
  };
}

function loadFoundationDraftSummaries(rootDir, profileId) {
  const memoryDraftPath = path.join(rootDir, 'profiles', profileId, 'memory', 'long-term', 'foundation.json');
  const voiceDraftPath = path.join(rootDir, 'profiles', profileId, 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', profileId, 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', profileId, 'skills', 'README.md');

  const memoryDraft = readJsonIfExists(memoryDraftPath);
  const memoryMetadata = summarizeLegacyMemoryDraft(memoryDraft);
  const voiceMetadata = parseDraftMetadata(voiceDraftPath);
  const soulMetadata = parseDraftMetadata(soulDraftPath);
  const skillsMetadata = parseDraftMetadata(skillsDraftPath);

  return {
    memory: memoryDraft
      ? {
          generated: true,
          generatedAt: memoryMetadata.generatedAt,
          latestMaterialAt: memoryMetadata.latestMaterialAt,
          latestMaterialId: memoryMetadata.latestMaterialId,
          sourceCount: memoryMetadata.sourceCount,
          materialTypes: memoryMetadata.materialTypes,
          entryCount: memoryDraft.entryCount ?? 0,
          latestSummaries: (memoryDraft.entries ?? [])
            .filter((entry) => entry.type !== 'screenshot')
            .map((entry) => entry.summary)
            .filter(Boolean)
            .slice(0, 3),
        }
      : {
          generated: false,
          generatedAt: null,
          latestMaterialAt: null,
          latestMaterialId: null,
          sourceCount: 0,
          materialTypes: {},
          entryCount: 0,
          latestSummaries: [],
        },
    voice: voiceMetadata?.valid
      ? {
          generated: true,
          generatedAt: voiceMetadata.generatedAt,
          latestMaterialAt: voiceMetadata.latestMaterialAt,
          latestMaterialId: voiceMetadata.latestMaterialId,
          sourceCount: voiceMetadata.sourceCount,
          materialTypes: voiceMetadata.materialTypes,
          highlights: readMarkdownHighlights(voiceDraftPath),
        }
      : { generated: false, generatedAt: null, latestMaterialAt: null, latestMaterialId: null, sourceCount: 0, materialTypes: {}, highlights: [] },
    soul: soulMetadata?.valid
      ? {
          generated: true,
          generatedAt: soulMetadata.generatedAt,
          latestMaterialAt: soulMetadata.latestMaterialAt,
          latestMaterialId: soulMetadata.latestMaterialId,
          sourceCount: soulMetadata.sourceCount,
          materialTypes: soulMetadata.materialTypes,
          highlights: readMarkdownHighlights(soulDraftPath),
        }
      : { generated: false, generatedAt: null, latestMaterialAt: null, latestMaterialId: null, sourceCount: 0, materialTypes: {}, highlights: [] },
    skills: skillsMetadata?.valid
      ? {
          generated: true,
          generatedAt: skillsMetadata.generatedAt,
          latestMaterialAt: skillsMetadata.latestMaterialAt,
          latestMaterialId: skillsMetadata.latestMaterialId,
          sourceCount: skillsMetadata.sourceCount,
          materialTypes: skillsMetadata.materialTypes,
          highlights: readMarkdownHighlights(skillsDraftPath),
        }
      : { generated: false, generatedAt: null, latestMaterialAt: null, latestMaterialId: null, sourceCount: 0, materialTypes: {}, highlights: [] },
  };
}

export class FileSystemLoader {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  resolve(...segments) {
    return path.join(this.rootDir, ...segments);
  }

  loadSoul() {
    return readTextIfExists(this.resolve('SOUL.md'));
  }

  loadVoice() {
    return readTextIfExists(this.resolve('voice', 'README.md'));
  }

  loadSkills() {
    return loadSkillInventory(this.rootDir).names;
  }

  loadSkillInventory() {
    return loadSkillInventory(this.rootDir);
  }

  loadMemoryIndex() {
    return {
      root: readTextIfExists(this.resolve('memory', 'README.md')),
      daily: listFilesIfExists(this.resolve('memory', 'daily')),
      longTerm: listFilesIfExists(this.resolve('memory', 'long-term')),
      scratch: listFilesIfExists(this.resolve('memory', 'scratch')),
    };
  }

  loadProfilesIndex() {
    const profilesDir = this.resolve('profiles');
    const profileIds = listDirectoriesIfExists(profilesDir);

    return profileIds.map((profileId) => {
      const materialsDir = path.join(profilesDir, profileId, 'materials');
      const profileSummary = loadMaterialSummaries(materialsDir);
      const profileDocument = loadProfileDocument(this.rootDir, profileId);

      return {
        id: profileId,
        profile: profileDocument,
        hasProfile: Boolean(profileDocument),
        materialCount: listFilesIfExists(materialsDir).filter((name) => name.endsWith('.json')).length,
        screenshotCount: listFilesIfExists(path.join(materialsDir, 'screenshots')).length,
        materialTypes: profileSummary.materialTypes,
        latestMaterialAt: profileSummary.latestMaterialAt,
        latestMaterialId: profileSummary.latestMaterialId,
        foundationDrafts: loadFoundationDrafts(this.rootDir, profileId),
        foundationDraftStatus: loadFoundationDraftStatus(
          this.rootDir,
          profileId,
          profileSummary.latestMaterialAt,
          profileSummary.latestMaterialId,
          profileDocument,
        ),
        foundationDraftSummaries: loadFoundationDraftSummaries(this.rootDir, profileId),
        foundationReadiness: profileSummary.foundationReadiness,
      };
    });
  }
}

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

  const materialTypes = {};
  for (const record of materialRecords) {
    materialTypes[record.type] = (materialTypes[record.type] ?? 0) + 1;
  }

  const latestMaterialAt = materialRecords
    .map((record) => record.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    materialTypes,
    latestMaterialAt,
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

function loadFoundationDraftStatus(rootDir, profileId, latestMaterialAt = null) {
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
  const generatedAt = memoryDraft?.generatedAt ?? null;
  const needsRefresh = missingDrafts.size > 0 || (Boolean(latestMaterialAt) && (!generatedAt || latestMaterialAt > generatedAt));

  return {
    generatedAt,
    complete: missingDrafts.size === 0,
    missingDrafts: [...missingDrafts].sort(),
    needsRefresh,
  };
}

function loadFoundationDraftSummaries(rootDir, profileId) {
  const memoryDraftPath = path.join(rootDir, 'profiles', profileId, 'memory', 'long-term', 'foundation.json');
  const voiceDraftPath = path.join(rootDir, 'profiles', profileId, 'voice', 'README.md');
  const soulDraftPath = path.join(rootDir, 'profiles', profileId, 'soul', 'README.md');
  const skillsDraftPath = path.join(rootDir, 'profiles', profileId, 'skills', 'README.md');

  const memoryDraft = readJsonIfExists(memoryDraftPath);

  return {
    memory: memoryDraft
      ? {
          generated: true,
          entryCount: memoryDraft.entryCount ?? 0,
          latestSummaries: (memoryDraft.entries ?? [])
            .filter((entry) => entry.type !== 'screenshot')
            .map((entry) => entry.summary)
            .filter(Boolean)
            .slice(0, 3),
        }
      : { generated: false, entryCount: 0, latestSummaries: [] },
    voice: fs.existsSync(voiceDraftPath)
      ? {
          generated: true,
          highlights: readMarkdownHighlights(voiceDraftPath),
        }
      : { generated: false, highlights: [] },
    soul: fs.existsSync(soulDraftPath)
      ? {
          generated: true,
          highlights: readMarkdownHighlights(soulDraftPath),
        }
      : { generated: false, highlights: [] },
    skills: fs.existsSync(skillsDraftPath)
      ? {
          generated: true,
          highlights: readMarkdownHighlights(skillsDraftPath),
        }
      : { generated: false, highlights: [] },
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
    return listDirectoriesIfExists(this.resolve('skills'));
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
        foundationDrafts: loadFoundationDrafts(this.rootDir, profileId),
        foundationDraftStatus: loadFoundationDraftStatus(this.rootDir, profileId, profileSummary.latestMaterialAt),
        foundationDraftSummaries: loadFoundationDraftSummaries(this.rootDir, profileId),
        foundationReadiness: profileSummary.foundationReadiness,
      };
    });
  }
}

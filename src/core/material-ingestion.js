import fs from 'node:fs';
import path from 'node:path';

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

export class MaterialIngestion {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  resolve(...segments) {
    return path.join(this.rootDir, ...segments);
  }

  ensureProfile(personId) {
    const normalizedId = slugifyPersonId(personId);
    if (!normalizedId) {
      throw new Error('personId is required');
    }

    const profileDir = this.resolve('profiles', normalizedId);
    const materialsDir = ensureDir(path.join(profileDir, 'materials'));
    ensureDir(path.join(materialsDir, 'screenshots'));
    const profilePath = path.join(profileDir, 'profile.json');

    if (!fs.existsSync(profilePath)) {
      fs.writeFileSync(
        profilePath,
        JSON.stringify(
          {
            id: normalizedId,
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    }

    return { personId: normalizedId, profileDir, materialsDir, profilePath };
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

    const memoryEntries = materialRecords.map((record) => ({
      type: record.type,
      createdAt: record.createdAt,
      summary: buildExcerpt(record.content ?? record.notes ?? record.sourceFile),
      sourceFile: record.sourceFile ?? null,
    }));

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
          generatedAt: new Date().toISOString(),
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
        '# Voice draft',
        '',
        `Profile: ${normalized.personId}`,
        '',
        'Representative voice excerpts:',
        ...voiceSamples.map((sample) => `- [${sample.type}] ${sample.excerpt}`),
      ].join('\n'),
    );

    fs.writeFileSync(
      soulDraftPath,
      [
        '# Soul draft',
        '',
        `Profile: ${normalized.personId}`,
        '',
        'Candidate soul signals:',
        ...soulSignals.map((signal) => `- [${signal.type}] ${signal.excerpt}`),
      ].join('\n'),
    );

    fs.writeFileSync(
      skillsDraftPath,
      [
        '# Skills draft',
        '',
        `Profile: ${normalized.personId}`,
        '',
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
      generatedAt: new Date().toISOString(),
    };
  }
}

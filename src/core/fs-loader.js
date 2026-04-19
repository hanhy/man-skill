import fs from 'node:fs';
import path from 'node:path';

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
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

function stripWrappingQuotes(value) {
  if (!isNonEmptyString(value)) {
    return value;
  }

  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function extractFrontmatterDescription(document) {
  if (!isNonEmptyString(document) || !document.startsWith('---')) {
    return null;
  }

  const lines = document.split(/\r?\n/);
  const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (closingIndex < 0) {
    return null;
  }

  const frontmatterLines = lines.slice(1, closingIndex + 1);
  for (let index = 0; index < frontmatterLines.length; index += 1) {
    const line = frontmatterLines[index];
    const match = line.match(/^description\s*:\s*(.*)$/i);
    if (!match) {
      continue;
    }

    const rawValue = match[1].trim();
    if (/^[>|][0-9+-]*$/.test(rawValue)) {
      const blockLines = [];
      for (let nestedIndex = index + 1; nestedIndex < frontmatterLines.length; nestedIndex += 1) {
        const nestedLine = frontmatterLines[nestedIndex];
        if (nestedLine.trim().length > 0 && !/^\s/.test(nestedLine)) {
          break;
        }

        blockLines.push(nestedLine.trim());
      }

      const description = blockLines.join('\n').trim();
      if (isNonEmptyString(description)) {
        return description;
      }

      continue;
    }

    const description = stripWrappingQuotes(rawValue);
    if (isNonEmptyString(description)) {
      return description;
    }
  }

  return null;
}

function isMarkdownFenceDelimiter(line) {
  return /^(```+|~~~+)/.test(line.trim());
}

function parseMarkdownHeading(line) {
  if (!isNonEmptyString(line)) {
    return null;
  }

  const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    text: match[2].trim().toLowerCase(),
  };
}

function filterOutsideMarkdownFences(lines) {
  const visibleLines = [];
  let insideFence = false;
  let insideHtmlComment = false;

  for (const rawLine of lines) {
    if (isMarkdownFenceDelimiter(rawLine)) {
      insideFence = !insideFence;
      continue;
    }

    if (insideFence) {
      continue;
    }

    let visibleLine = rawLine;

    if (insideHtmlComment) {
      const commentEnd = visibleLine.indexOf('-->');
      if (commentEnd < 0) {
        continue;
      }

      visibleLine = visibleLine.slice(commentEnd + 3);
      insideHtmlComment = false;
    }

    while (true) {
      const commentStart = visibleLine.indexOf('<!--');
      if (commentStart < 0) {
        break;
      }

      const commentEnd = visibleLine.indexOf('-->', commentStart + 4);
      if (commentEnd >= 0) {
        visibleLine = `${visibleLine.slice(0, commentStart)}${visibleLine.slice(commentEnd + 3)}`;
        continue;
      }

      visibleLine = visibleLine.slice(0, commentStart);
      insideHtmlComment = true;
      break;
    }

    visibleLines.push(visibleLine);
  }

  return visibleLines;
}

function extractDocumentBodyLines(document) {
  if (!isNonEmptyString(document)) {
    return [];
  }

  const lines = document.split(/\r?\n/);
  if (!document.startsWith('---')) {
    return lines;
  }

  const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
  return closingIndex >= 0 ? lines.slice(closingIndex + 2) : lines;
}

function extractDocumentExcerpt(document, maxLength = 160) {
  if (!isNonEmptyString(document)) {
    return null;
  }

  const frontmatterDescription = extractFrontmatterDescription(document);
  if (isNonEmptyString(frontmatterDescription)) {
    return buildExcerpt(frontmatterDescription, maxLength);
  }

  const candidate = filterOutsideMarkdownFences(extractDocumentBodyLines(document))
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#') && line !== '---');

  return buildExcerpt(candidate, maxLength);
}

function hasMeaningfulDocumentBody(document) {
  return filterOutsideMarkdownFences(extractDocumentBodyLines(document))
    .map((line) => line.trim())
    .some((line) => line.length > 0 && !line.startsWith('#') && line !== '---');
}

const SKILL_SECTION_DEFINITIONS = [
  { key: 'what-this-skill-is-for', headings: ['what this skill is for'] },
  { key: 'suggested-workflow', headings: ['suggested workflow'] },
];

const FOUNDATION_DRAFT_SECTION_DEFINITIONS = {
  voice: [
    { key: 'tone', headings: ['tone'] },
    { key: 'signature-moves', headings: ['signature moves', 'voice should capture'] },
    { key: 'avoid', headings: ['avoid', 'voice should not capture'] },
    { key: 'language-hints', headings: ['language hints', 'current default for manskill'] },
  ],
  soul: [
    { key: 'core-values', headings: ['core values', 'core truths'] },
    { key: 'boundaries', headings: ['boundaries'] },
    { key: 'decision-rules', headings: ['decision rules', 'continuity'] },
  ],
  skills: [
    { key: 'candidate-skills', headings: ['candidate skills'] },
    { key: 'evidence', headings: ['evidence'] },
    { key: 'gaps-to-validate', headings: ['gaps to validate'] },
  ],
};


function collectSkillSectionState(document) {
  if (!isNonEmptyString(document)) {
    return {
      ready: [],
      missing: SKILL_SECTION_DEFINITIONS.map((section) => section.key),
    };
  }

  const lines = filterOutsideMarkdownFences(document.split(/\r?\n/));
  const ready = [];
  const missing = [];

  for (const section of SKILL_SECTION_DEFINITIONS) {
    let inSection = false;
    let hasContent = false;
    let sectionHeadingLevel = null;
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      const heading = parseMarkdownHeading(trimmed);
      if (heading) {
        if (heading.level >= 2 && section.headings.includes(heading.text)) {
          inSection = true;
          hasContent = false;
          sectionHeadingLevel = heading.level;
          continue;
        }

        if (inSection && sectionHeadingLevel !== null && heading.level <= sectionHeadingLevel) {
          break;
        }
      }

      if (!inSection || trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }

      hasContent = true;
    }

    if (hasContent) {
      ready.push(section.key);
    } else {
      missing.push(section.key);
    }
  }

  return { ready, missing };
}

function collectMissingSkillSections(document) {
  return collectSkillSectionState(document).missing;
}

function hasStructuredSkillHeading(document) {
  if (!isNonEmptyString(document)) {
    return false;
  }

  return filterOutsideMarkdownFences(document.split(/\r?\n/))
    .map((line) => parseMarkdownHeading(line))
    .some((heading) => heading && heading.level >= 2 && SKILL_SECTION_DEFINITIONS.some((section) => section.headings.includes(heading.text)));
}

function loadSkillInventory(rootDir) {
  const skillNames = listDirectoriesIfExists(path.join(rootDir, 'skills'));
  const root = readTextIfExists(path.join(rootDir, 'skills', 'README.md'));
  const documented = [];
  const undocumented = [];
  const thin = [];
  /** @type {Record<string, string>} */
  const documentedExcerpts = {};
  /** @type {Record<string, string[]>} */
  const thinMissingSections = {};
  /** @type {Record<string, string[]>} */
  const thinReadySections = {};

  for (const skillName of skillNames) {
    const skillPath = path.join(rootDir, 'skills', skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      undocumented.push(skillName);
      continue;
    }

    const document = readTextIfExists(skillPath);
    const excerpt = extractDocumentExcerpt(document);
    const hasMeaningfulBody = hasMeaningfulDocumentBody(document);
    const sectionState = collectSkillSectionState(document);
    const structured = hasStructuredSkillHeading(document);
    if (isNonEmptyString(excerpt) && hasMeaningfulBody && (!structured || sectionState.missing.length === 0)) {
      documented.push(skillName);
      documentedExcerpts[skillName] = excerpt;
      continue;
    }

    thin.push(skillName);
    thinMissingSections[skillName] = sectionState.missing;
    thinReadySections[skillName] = sectionState.ready;
  }

  return {
    root,
    names: skillNames,
    hasRootDocument: isNonEmptyString(root),
    rootPath: 'skills/README.md',
    documented,
    undocumented,
    thin,
    documentedExcerpts,
    thinMissingSections,
    thinReadySections,
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

function buildIntakePaths(rootDir, profileId) {
  const importsDir = path.join(rootDir, 'profiles', profileId, 'imports');
  return {
    importsDir,
    intakeReadmePath: path.join(importsDir, 'README.md'),
    starterManifestPath: path.join(importsDir, 'materials.template.json'),
    sampleTextPath: path.join(importsDir, 'sample.txt'),
  };
}

function loadProfileIntake(rootDir, profileId) {
  const paths = buildIntakePaths(rootDir, profileId);
  const importsDirPresent = fs.existsSync(paths.importsDir);
  const intakeReadmePresent = fs.existsSync(paths.intakeReadmePath);
  const starterManifestPresent = fs.existsSync(paths.starterManifestPath);
  const sampleTextPresent = fs.existsSync(paths.sampleTextPath);
  const relativePaths = {
    importsDir: path.relative(rootDir, paths.importsDir),
    intakeReadmePath: path.relative(rootDir, paths.intakeReadmePath),
    starterManifestPath: path.relative(rootDir, paths.starterManifestPath),
    sampleTextPath: path.relative(rootDir, paths.sampleTextPath),
  };
  const ready = importsDirPresent && intakeReadmePresent && starterManifestPresent && sampleTextPresent;
  const completion = ready
    ? 'ready'
    : (importsDirPresent || intakeReadmePresent || starterManifestPresent || sampleTextPresent ? 'partial' : 'missing');
  const missingPaths = [
    importsDirPresent ? null : relativePaths.importsDir,
    intakeReadmePresent ? null : relativePaths.intakeReadmePath,
    starterManifestPresent ? null : relativePaths.starterManifestPath,
    sampleTextPresent ? null : relativePaths.sampleTextPath,
  ].filter(Boolean);

  return {
    ready,
    completion,
    importsDirPresent,
    intakeReadmePresent,
    starterManifestPresent,
    sampleTextPresent,
    missingPaths,
    ...relativePaths,
  };
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

function detectFoundationDraftKind(filePath) {
  const normalizedPath = filePath.split(path.sep).join('/');
  if (normalizedPath.endsWith('/voice/README.md')) {
    return 'voice';
  }
  if (normalizedPath.endsWith('/soul/README.md')) {
    return 'soul';
  }
  if (normalizedPath.endsWith('/skills/README.md')) {
    return 'skills';
  }

  return null;
}

function summarizeFoundationDraftSections(filePath, content = null) {
  const draftKind = detectFoundationDraftKind(filePath);
  const sectionDefinitions = draftKind ? (FOUNDATION_DRAFT_SECTION_DEFINITIONS[draftKind] ?? []) : [];
  if (sectionDefinitions.length === 0) {
    return null;
  }

  const resolvedContent = typeof content === 'string' ? content : readTextIfExists(filePath);
  if (!isNonEmptyString(resolvedContent)) {
    return null;
  }

  const lines = filterOutsideMarkdownFences(resolvedContent.split(/\r?\n/));
  const readySections = [];
  const missingSections = [];

  for (const section of sectionDefinitions) {
    let inSection = false;
    let hasContent = false;
    let sectionHeadingLevel = null;
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      const heading = parseMarkdownHeading(trimmed);
      if (heading) {
        if (heading.level >= 2 && section.headings.includes(heading.text)) {
          inSection = true;
          hasContent = false;
          sectionHeadingLevel = heading.level;
          continue;
        }

        if (inSection && sectionHeadingLevel !== null && heading.level <= sectionHeadingLevel) {
          break;
        }
      }

      if (!inSection || trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }

      hasContent = true;
    }

    if (hasContent) {
      readySections.push(section.key);
    } else {
      missingSections.push(section.key);
    }
  }

  return {
    readySectionCount: readySections.length,
    totalSectionCount: sectionDefinitions.length,
    readySections,
    missingSections,
  };
}

function hasRequiredFoundationDraftSections(filePath, content) {
  const sectionSummary = summarizeFoundationDraftSections(filePath, content);
  return (sectionSummary?.missingSections?.length ?? 0) === 0;
}

export function hasValidFoundationMarkdownDraft(filePath) {
  const content = readTextIfExists(filePath);
  if (!content) {
    return false;
  }

  const metadata = parseDraftMetadata(filePath);
  if (!metadata?.valid) {
    return false;
  }

  return hasRequiredFoundationDraftSections(filePath, content);
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
    if (fs.existsSync(candidates[draftName]) && (!draftMetadata?.valid || !hasValidFoundationMarkdownDraft(candidates[draftName]))) {
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
  const refreshReasons = [
    missingDrafts.size > 0 ? 'missing drafts' : null,
    hasNewerMaterial ? 'new materials' : null,
    hasProfileMetadataMismatch ? 'profile metadata drift' : null,
    hasMarkdownMetadataMismatch ? 'draft metadata drift' : null,
  ].filter(Boolean);
  const needsRefresh = missingDrafts.size > 0 || hasNewerMaterial || hasProfileMetadataMismatch || hasMarkdownMetadataMismatch;

  return {
    generatedAt,
    complete: missingDrafts.size === 0,
    missingDrafts: [...missingDrafts].sort(),
    refreshReasons,
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
  const voiceSectionSummary = summarizeFoundationDraftSections(voiceDraftPath);
  const soulSectionSummary = summarizeFoundationDraftSections(soulDraftPath);
  const skillsSectionSummary = summarizeFoundationDraftSections(skillsDraftPath);

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
    voice: voiceMetadata?.valid && hasValidFoundationMarkdownDraft(voiceDraftPath)
      ? {
          generated: true,
          generatedAt: voiceMetadata.generatedAt,
          latestMaterialAt: voiceMetadata.latestMaterialAt,
          latestMaterialId: voiceMetadata.latestMaterialId,
          sourceCount: voiceMetadata.sourceCount,
          materialTypes: voiceMetadata.materialTypes,
          highlights: readMarkdownHighlights(voiceDraftPath),
        }
      : {
          generated: false,
          generatedAt: null,
          latestMaterialAt: null,
          latestMaterialId: null,
          sourceCount: 0,
          materialTypes: {},
          highlights: [],
          ...(voiceSectionSummary && voiceSectionSummary.missingSections.length > 0 ? voiceSectionSummary : {}),
        },
    soul: soulMetadata?.valid && hasValidFoundationMarkdownDraft(soulDraftPath)
      ? {
          generated: true,
          generatedAt: soulMetadata.generatedAt,
          latestMaterialAt: soulMetadata.latestMaterialAt,
          latestMaterialId: soulMetadata.latestMaterialId,
          sourceCount: soulMetadata.sourceCount,
          materialTypes: soulMetadata.materialTypes,
          highlights: readMarkdownHighlights(soulDraftPath),
        }
      : {
          generated: false,
          generatedAt: null,
          latestMaterialAt: null,
          latestMaterialId: null,
          sourceCount: 0,
          materialTypes: {},
          highlights: [],
          ...(soulSectionSummary && soulSectionSummary.missingSections.length > 0 ? soulSectionSummary : {}),
        },
    skills: skillsMetadata?.valid && hasValidFoundationMarkdownDraft(skillsDraftPath)
      ? {
          generated: true,
          generatedAt: skillsMetadata.generatedAt,
          latestMaterialAt: skillsMetadata.latestMaterialAt,
          latestMaterialId: skillsMetadata.latestMaterialId,
          sourceCount: skillsMetadata.sourceCount,
          materialTypes: skillsMetadata.materialTypes,
          highlights: readMarkdownHighlights(skillsDraftPath),
        }
      : {
          generated: false,
          generatedAt: null,
          latestMaterialAt: null,
          latestMaterialId: null,
          sourceCount: 0,
          materialTypes: {},
          highlights: [],
          ...(skillsSectionSummary && skillsSectionSummary.missingSections.length > 0 ? skillsSectionSummary : {}),
        },
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
        intake: loadProfileIntake(this.rootDir, profileId),
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

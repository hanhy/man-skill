import fs from 'node:fs';
import path from 'node:path';

function stripLeadingUtf8Bom(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeRelativeRepoPath(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\.(?=\/)/, '')
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .join('/');
}

function slugifyPersonId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeEntryTemplateTypes(entryTemplates) {
  if (!entryTemplates || typeof entryTemplates !== 'object' || Array.isArray(entryTemplates)) {
    return [];
  }

  const supportedTypes = new Set(['message', 'screenshot', 'talk', 'text']);
  return Array.from(new Set(Object.entries(entryTemplates)
    .filter(([key, value]) => supportedTypes.has(key) && value && typeof value === 'object' && !Array.isArray(value))
    .map(([key]) => key)))
    .sort((left, right) => left.localeCompare(right));
}

function truncateTemplatePreview(value, maxLength = 80) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`;
}

function normalizeEntryTemplateDetails(entryTemplates) {
  const entryTemplateTypes = normalizeEntryTemplateTypes(entryTemplates);
  return entryTemplateTypes.map((type) => {
    const template = entryTemplates?.[type];
    const filePath = isNonEmptyString(template?.file) ? template.file.trim() : null;
    const textPreview = truncateTemplatePreview(template?.text);

    const normalizedFilePath = normalizeRelativeRepoPath(filePath);

    return {
      type,
      source: normalizedFilePath ? 'file' : 'text',
      path: normalizedFilePath,
      preview: normalizedFilePath ? null : textPreview,
    };
  });
}

function buildStarterTemplateEntries(manifest, entryTemplateTypes) {
  return entryTemplateTypes.map((type) => {
    const template = manifest?.entryTemplates?.[type] ?? {};
    return {
      type,
      ...(normalizeRelativeRepoPath(template?.file) ? { file: normalizeRelativeRepoPath(template.file) } : {}),
      ...(isNonEmptyString(template?.text) ? { text: template.text.trim() } : {}),
      ...(isNonEmptyString(template?.personId) ? { personId: template.personId.trim() } : {}),
    };
  });
}

function resolveImportFile(baseDir, filePath) {
  if (!isNonEmptyString(filePath)) {
    return null;
  }

  const trimmedFilePath = filePath.trim();
  if (path.isAbsolute(trimmedFilePath)) {
    return trimmedFilePath;
  }

  const normalizedRelativePath = normalizeRelativeRepoPath(trimmedFilePath);
  return normalizedRelativePath ? path.resolve(baseDir, normalizedRelativePath) : null;
}

function toRepoRelativePath(realRootDir, absolutePath) {
  if (!isNonEmptyString(realRootDir) || !isNonEmptyString(absolutePath)) {
    return null;
  }

  const relativePath = path.relative(realRootDir, absolutePath);
  if (path.isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)) {
    return null;
  }

  return relativePath.split(path.sep).join('/');
}

function attachRepairPaths(error, repairPaths = []) {
  if (!(error instanceof Error)) {
    return error;
  }

  const normalizedRepairPaths = Array.from(new Set(repairPaths.filter((value) => isNonEmptyString(value)).map((value) => value.trim())));
  if (normalizedRepairPaths.length > 0) {
    Object.assign(error, { repairPaths: normalizedRepairPaths });
  }

  return error;
}

function extractRepairPaths(error) {
  return Array.isArray(error?.repairPaths)
    ? Array.from(new Set(error.repairPaths.filter((value) => isNonEmptyString(value)).map((value) => value.trim())))
    : [];
}

function normalizeManifest(parsedManifest) {
  if (!parsedManifest || typeof parsedManifest !== 'object') {
    return null;
  }

  if (Array.isArray(parsedManifest)) {
    return {
      entries: parsedManifest,
      entryTemplates: null,
    };
  }

  return parsedManifest;
}

function validateProfileLocalManifestOwnership(manifest, expectedPersonId) {
  if (!isNonEmptyString(expectedPersonId)) {
    return;
  }

  const normalizedExpectedPersonId = slugifyPersonId(expectedPersonId);
  if (!normalizedExpectedPersonId) {
    return;
  }

  const manifestPersonId = isNonEmptyString(manifest?.personId) ? manifest.personId : null;
  if (manifestPersonId && slugifyPersonId(manifestPersonId) !== normalizedExpectedPersonId) {
    throw new Error(`Profile intake manifest targets a different profile: expected ${normalizedExpectedPersonId}`);
  }

  const profiles = Array.isArray(manifest?.profiles) ? manifest.profiles : [];
  profiles.forEach((profile, index) => {
    if (!profile || typeof profile !== 'object') {
      throw new Error(`Manifest profile ${index} must be an object`);
    }

    if (!isNonEmptyString(profile.personId)) {
      throw new Error(`Profile intake manifest profile ${index} is missing personId for ${normalizedExpectedPersonId}`);
    }

    if (slugifyPersonId(profile.personId) !== normalizedExpectedPersonId) {
      throw new Error(`Profile intake manifest profile ${index} targets a different profile: expected ${normalizedExpectedPersonId}`);
    }
  });

  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Manifest entry ${index} must be an object`);
    }

    const resolvedPersonId = isNonEmptyString(entry.personId) ? entry.personId : manifestPersonId;
    if (!isNonEmptyString(resolvedPersonId)) {
      throw new Error(`Profile intake manifest entry ${index} is missing personId for ${normalizedExpectedPersonId}`);
    }

    if (slugifyPersonId(resolvedPersonId) !== normalizedExpectedPersonId) {
      throw new Error(`Profile intake manifest entry ${index} targets a different profile: expected ${normalizedExpectedPersonId}`);
    }
  });
}

function validateProfileLocalManifestEntries({ rootDir, starterManifestPath, manifest, entries, expectedPersonId = null }) {
  const absoluteManifestPath = path.join(rootDir, starterManifestPath);
  const manifestDir = path.dirname(absoluteManifestPath);
  const realManifestDir = fs.realpathSync(manifestDir);
  const realRootDir = fs.realpathSync(rootDir);
  const supportedTypes = new Set(['text', 'message', 'talk', 'screenshot']);
  const manifestPersonId = isNonEmptyString(manifest?.personId) ? manifest.personId : null;
  const normalizedManifestPersonId = manifestPersonId ? slugifyPersonId(manifestPersonId) : null;
  const normalizedExpectedPersonId = isNonEmptyString(expectedPersonId) ? slugifyPersonId(expectedPersonId) : null;
  const expectedOwnerPersonId = normalizedManifestPersonId || normalizedExpectedPersonId;

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Manifest entry ${index} must be an object`);
    }

    const type = typeof entry.type === 'string' ? entry.type : null;
    if (!type || !supportedTypes.has(type)) {
      throw new Error(`Unsupported manifest entry type at index ${index}: ${entry.type}`);
    }

    const resolvedPersonId = isNonEmptyString(entry.personId) ? entry.personId : manifestPersonId;
    if (expectedOwnerPersonId && resolvedPersonId && slugifyPersonId(resolvedPersonId) !== expectedOwnerPersonId) {
      throw new Error(`Profile intake manifest entry ${index} targets a different profile: expected ${expectedOwnerPersonId}`);
    }

    if ((type === 'message' || type === 'talk') && !isNonEmptyString(entry.text)) {
      throw new Error(`Manifest entry ${index} is missing text for ${type} import`);
    }

    if (type === 'text' || type === 'screenshot') {
      if (!isNonEmptyString(entry.file)) {
        throw new Error(`Manifest entry ${index} is missing file for ${type} import`);
      }

      const displayEntryFile = normalizeRelativeRepoPath(entry.file) ?? entry.file.trim();
      const resolvedFilePath = resolveImportFile(realManifestDir, entry.file);
      if (!resolvedFilePath) {
        throw new Error(`Manifest entry ${index} is missing file for ${type} import`);
      }

      const relativeResolvedFilePath = toRepoRelativePath(realRootDir, resolvedFilePath);
      if (!fs.existsSync(resolvedFilePath)) {
        throw attachRepairPaths(
          new Error(`Manifest entry ${index} references a missing file: ${displayEntryFile}`),
          relativeResolvedFilePath ? [relativeResolvedFilePath] : [],
        );
      }

      const realFilePath = fs.realpathSync(resolvedFilePath);
      if (!fs.statSync(realFilePath).isFile()) {
        throw attachRepairPaths(
          new Error(`Manifest entry ${index} references a non-file path: ${displayEntryFile}`),
          relativeResolvedFilePath ? [relativeResolvedFilePath] : [],
        );
      }

      const relativeFilePath = toRepoRelativePath(realRootDir, realFilePath);
      if (!relativeFilePath) {
        throw new Error(`Manifest entry ${index} references a file outside the repo: ${displayEntryFile}`);
      }

      const relativeImportsPath = path.relative(realManifestDir, realFilePath);
      if (path.isAbsolute(relativeImportsPath) || relativeImportsPath === '..' || relativeImportsPath.startsWith(`..${path.sep}`)) {
        throw attachRepairPaths(
          new Error(`Manifest entry ${index} references a file outside the profile imports directory: ${displayEntryFile}`),
          [starterManifestPath],
        );
      }
    }
  });
}

/**
 * @param {{ rootDir?: string | null, starterManifestPath?: string | null, expectedPersonId?: string | null }} [options]
 */
export function inspectProfileIntakeManifest(options: { rootDir?: string | null; starterManifestPath?: string | null; expectedPersonId?: string | null } = {}) {
  const { rootDir, starterManifestPath, expectedPersonId = null } = options;
  const manifestPath = normalizeRelativeRepoPath(starterManifestPath);
  const emptyEntryTemplateDetails = [];
  const emptyRepairPaths = [];
  if (!isNonEmptyString(rootDir) || !manifestPath) {
    return {
      status: 'missing',
      path: manifestPath,
      error: null,
      repairPaths: emptyRepairPaths,
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  const absoluteManifestPath = path.join(rootDir, manifestPath);
  if (!fs.existsSync(absoluteManifestPath)) {
    return {
      status: 'missing',
      path: manifestPath,
      error: 'Starter intake manifest is missing',
      repairPaths: emptyRepairPaths,
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  let parsedManifest;
  try {
    parsedManifest = JSON.parse(stripLeadingUtf8Bom(fs.readFileSync(absoluteManifestPath, 'utf8')));
  } catch (error) {
    return {
      status: 'invalid',
      path: manifestPath,
      error: error instanceof Error ? error.message : 'Unable to parse intake manifest',
      repairPaths: emptyRepairPaths,
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  const manifest = normalizeManifest(parsedManifest);
  if (!manifest) {
    return {
      status: 'invalid',
      path: manifestPath,
      error: 'Manifest must be an array or object',
      repairPaths: emptyRepairPaths,
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  const entries = manifest.entries;
  const entryTemplateTypes = normalizeEntryTemplateTypes(manifest.entryTemplates);
  const entryTemplateDetails = normalizeEntryTemplateDetails(manifest.entryTemplates);
  const entryTemplateCount = entryTemplateTypes.length;
  const hasStarterTemplates = Array.isArray(entries)
    && entries.length === 0
    && manifest.entryTemplates
    && typeof manifest.entryTemplates === 'object'
    && !Array.isArray(manifest.entryTemplates)
    && entryTemplateTypes.length > 0;

  if (!Array.isArray(entries) && !hasStarterTemplates) {
    return {
      status: 'invalid',
      path: manifestPath,
      error: 'Manifest must contain a non-empty entries array',
      repairPaths: emptyRepairPaths,
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  try {
    validateProfileLocalManifestOwnership(manifest, expectedPersonId);
    if (Array.isArray(entries) && entries.length > 0) {
      validateProfileLocalManifestEntries({
        rootDir,
        starterManifestPath: manifestPath,
        manifest,
        entries,
        expectedPersonId,
      });
    }
    if (hasStarterTemplates) {
      validateProfileLocalManifestEntries({
        rootDir,
        starterManifestPath: manifestPath,
        manifest,
        entries: buildStarterTemplateEntries(manifest, entryTemplateTypes),
        expectedPersonId,
      });
    }
  } catch (error) {
    return {
      status: 'invalid',
      path: manifestPath,
      error: error instanceof Error ? error.message : 'Invalid intake manifest',
      repairPaths: extractRepairPaths(error),
      entryTemplateTypes,
      entryTemplateCount,
      entryTemplateDetails,
    };
  }

  if (hasStarterTemplates) {
    const entryTemplateDetails = normalizeEntryTemplateDetails(manifest.entryTemplates);
    return {
      status: 'starter',
      path: manifestPath,
      error: null,
      repairPaths: emptyRepairPaths,
      entryTemplateTypes,
      entryTemplateCount: entryTemplateTypes.length,
      entryTemplateDetails,
    };
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      status: 'invalid',
      path: manifestPath,
      error: 'Manifest must contain a non-empty entries array',
      repairPaths: emptyRepairPaths,
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  return {
    status: 'loaded',
    path: manifestPath,
    error: null,
    repairPaths: emptyRepairPaths,
    entryTemplateTypes: [],
    entryTemplateCount: 0,
    entryTemplateDetails: emptyEntryTemplateDetails,
  };
}
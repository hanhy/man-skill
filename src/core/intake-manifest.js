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

    return {
      type,
      source: filePath ? 'file' : 'text',
      path: filePath,
      preview: filePath ? null : textPreview,
    };
  });
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

function validateProfileLocalManifestEntries({ rootDir, starterManifestPath, manifest, entries }) {
  const absoluteManifestPath = path.join(rootDir, starterManifestPath);
  const manifestDir = path.dirname(absoluteManifestPath);
  const realRootDir = fs.realpathSync(rootDir);
  const supportedTypes = new Set(['text', 'message', 'talk', 'screenshot']);
  const manifestPersonId = isNonEmptyString(manifest?.personId) ? manifest.personId : null;

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Manifest entry ${index} must be an object`);
    }

    const type = typeof entry.type === 'string' ? entry.type : null;
    if (!type || !supportedTypes.has(type)) {
      throw new Error(`Unsupported manifest entry type at index ${index}: ${entry.type}`);
    }

    const resolvedPersonId = isNonEmptyString(entry.personId) ? entry.personId : manifestPersonId;
    if (manifestPersonId && resolvedPersonId && slugifyPersonId(resolvedPersonId) !== slugifyPersonId(manifestPersonId)) {
      throw new Error(`Profile intake manifest entry ${index} targets a different profile: expected ${slugifyPersonId(manifestPersonId)}`);
    }

    if ((type === 'message' || type === 'talk') && !isNonEmptyString(entry.text)) {
      throw new Error(`Manifest entry ${index} is missing text for ${type} import`);
    }

    if (type === 'text' || type === 'screenshot') {
      if (!isNonEmptyString(entry.file)) {
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
      if (path.isAbsolute(relativeFilePath) || relativeFilePath === '..' || relativeFilePath.startsWith(`..${path.sep}`)) {
        throw new Error(`Manifest entry ${index} references a file outside the repo: ${entry.file}`);
      }
    }
  });
}

/**
 * @param {{ rootDir?: string | null, starterManifestPath?: string | null, expectedPersonId?: string | null }} [options]
 */
export function inspectProfileIntakeManifest({ rootDir, starterManifestPath, expectedPersonId = null } = {}) {
  const manifestPath = isNonEmptyString(starterManifestPath) ? starterManifestPath : null;
  const emptyEntryTemplateDetails = [];
  if (!isNonEmptyString(rootDir) || !manifestPath) {
    return {
      status: 'missing',
      path: manifestPath,
      error: null,
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
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  const entries = manifest.entries;
  const entryTemplateTypes = normalizeEntryTemplateTypes(manifest.entryTemplates);
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
      });
    }
  } catch (error) {
    return {
      status: 'invalid',
      path: manifestPath,
      error: error instanceof Error ? error.message : 'Invalid intake manifest',
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  if (hasStarterTemplates) {
    const entryTemplateDetails = normalizeEntryTemplateDetails(manifest.entryTemplates);
    return {
      status: 'starter',
      path: manifestPath,
      error: null,
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
      entryTemplateTypes: [],
      entryTemplateCount: 0,
      entryTemplateDetails: emptyEntryTemplateDetails,
    };
  }

  return {
    status: 'loaded',
    path: manifestPath,
    error: null,
    entryTemplateTypes: [],
    entryTemplateCount: 0,
    entryTemplateDetails: emptyEntryTemplateDetails,
  };
}

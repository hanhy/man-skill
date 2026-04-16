import fs from 'node:fs';
import path from 'node:path';

function loadManifestFile(rootDir, fileName) {
  const absolutePath = path.join(rootDir, 'manifests', fileName);
  const relativePath = `manifests/${fileName}`;

  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      status: 'missing',
      entryCount: 0,
      error: null,
      records: [],
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    if (!Array.isArray(parsed)) {
      return {
        path: relativePath,
        status: 'invalid',
        entryCount: 0,
        error: 'Manifest must contain a top-level array.',
        records: [],
      };
    }

    return {
      path: relativePath,
      status: 'loaded',
      entryCount: parsed.length,
      error: null,
      records: parsed,
    };
  } catch (error) {
    return {
      path: relativePath,
      status: 'invalid',
      entryCount: 0,
      error: error instanceof Error ? error.message : 'Failed to parse manifest JSON.',
      records: [],
    };
  }
}

export class ManifestLoader {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  resolve(...segments) {
    return path.join(this.rootDir, ...segments);
  }

  loadChannelManifestSummary() {
    return loadManifestFile(this.rootDir, 'channels.json');
  }

  loadProviderManifestSummary() {
    return loadManifestFile(this.rootDir, 'providers.json');
  }

  loadChannelManifest() {
    return this.loadChannelManifestSummary().records;
  }

  loadProviderManifest() {
    return this.loadProviderManifestSummary().records;
  }
}

import fs from 'node:fs';
import path from 'node:path';

function stripLeadingUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

export interface ManifestSummary<T = Record<string, unknown>> {
  path: string;
  status: 'loaded' | 'missing' | 'invalid';
  entryCount: number;
  error: string | null;
  records: T[];
}

function loadManifestFile<T = Record<string, unknown>>(rootDir: string, fileName: string): ManifestSummary<T> {
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
    const parsed: unknown = JSON.parse(stripLeadingUtf8Bom(fs.readFileSync(absolutePath, 'utf8')));
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
      records: parsed as T[],
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
  readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  resolve(...segments: string[]) {
    return path.join(this.rootDir, ...segments);
  }

  loadChannelManifestSummary<T = Record<string, unknown>>() {
    return loadManifestFile<T>(this.rootDir, 'channels.json');
  }

  loadProviderManifestSummary<T = Record<string, unknown>>() {
    return loadManifestFile<T>(this.rootDir, 'providers.json');
  }

  loadChannelManifest<T = Record<string, unknown>>() {
    return this.loadChannelManifestSummary<T>().records;
  }

  loadProviderManifest<T = Record<string, unknown>>() {
    return this.loadProviderManifestSummary<T>().records;
  }
}

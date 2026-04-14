import fs from 'node:fs';
import path from 'node:path';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export class ManifestLoader {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  resolve(...segments) {
    return path.join(this.rootDir, ...segments);
  }

  loadChannelManifest() {
    return readJsonIfExists(this.resolve('manifests', 'channels.json'));
  }

  loadProviderManifest() {
    return readJsonIfExists(this.resolve('manifests', 'providers.json'));
  }
}

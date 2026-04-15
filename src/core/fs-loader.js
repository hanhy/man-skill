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

    return profileIds.map((profileId) => ({
      id: profileId,
      hasProfile: fs.existsSync(path.join(profilesDir, profileId, 'profile.json')),
      materialCount: listFilesIfExists(path.join(profilesDir, profileId, 'materials')).length,
      screenshotCount: listFilesIfExists(path.join(profilesDir, profileId, 'materials', 'screenshots')).length,
    }));
  }
}

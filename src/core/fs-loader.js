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
    const skillsDir = this.resolve('skills');

    if (!fs.existsSync(skillsDir)) {
      return [];
    }

    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  loadMemoryIndex() {
    return {
      root: readTextIfExists(this.resolve('memory', 'README.md')),
      daily: listFilesIfExists(this.resolve('memory', 'daily')),
      longTerm: listFilesIfExists(this.resolve('memory', 'long-term')),
      scratch: listFilesIfExists(this.resolve('memory', 'scratch')),
    };
  }
}

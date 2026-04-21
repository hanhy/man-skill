#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function isWritableDirectory(candidate) {
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return false;
  }

  try {
    fs.mkdirSync(candidate, { recursive: true });
    fs.accessSync(candidate, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveSafeTmpDir() {
  const envCandidate = typeof process.env.TMPDIR === 'string' ? process.env.TMPDIR.trim() : '';
  if (isWritableDirectory(envCandidate)) {
    return envCandidate;
  }

  const repoLocalTmpDir = path.join(process.cwd(), '.tmp');
  if (isWritableDirectory(repoLocalTmpDir)) {
    return repoLocalTmpDir;
  }

  const osTmpDir = os.tmpdir();
  if (isWritableDirectory(osTmpDir)) {
    return osTmpDir;
  }

  throw new Error('Unable to resolve a writable temp directory for this command.');
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('Usage: node scripts/run-with-safe-tmp.mjs <command> [...args]');
  process.exit(1);
}

const safeTmpDir = resolveSafeTmpDir();
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    TMPDIR: safeTmpDir,
    TMP: safeTmpDir,
    TEMP: safeTmpDir,
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);

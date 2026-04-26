#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function normalizeTestArgs(args) {
  const separatorIndex = args.indexOf('--');
  const runnerArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
  const passthroughArgs = separatorIndex === -1 ? [] : args.slice(separatorIndex);

  return runnerArgs.filter((arg) => arg !== '--runInBand').concat(passthroughArgs);
}

const normalizedArgs = normalizeTestArgs(process.argv.slice(2));
const result = spawnSync('node', ['--import', 'tsx', '--test', ...normalizedArgs], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

process.exit(result.status ?? 1);

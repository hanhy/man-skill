import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemLoader } from '../src/core/fs-loader.js';
import { MaterialIngestion } from '../src/core/material-ingestion.js';
import { PromptAssembler } from '../src/core/prompt-assembler.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-profile-summary-'));
}

test('loadProfilesIndex summarizes material types and latest material timestamp per profile', () => {
  const rootDir = makeTempRepo();
  const ingestion = new MaterialIngestion(rootDir);
  const loader = new FileSystemLoader(rootDir);

  const sourceTextPath = path.join(rootDir, 'sample.txt');
  fs.writeFileSync(sourceTextPath, 'Direct writing sample.');

  const screenshotPath = path.join(rootDir, 'chat.png');
  fs.writeFileSync(screenshotPath, 'fake image bytes');

  ingestion.importTextDocument({ personId: 'Harry Han', sourceFile: sourceTextPath });
  ingestion.importMessage({ personId: 'Harry Han', text: 'Ship the first slice.' });
  ingestion.importScreenshotSource({ personId: 'Harry Han', sourceFile: screenshotPath });

  const [profile] = loader.loadProfilesIndex();

  assert.equal(profile.id, 'harry-han');
  assert.equal(profile.materialCount, 3);
  assert.equal(profile.screenshotCount, 1);
  assert.deepEqual(profile.materialTypes, {
    message: 1,
    screenshot: 1,
    text: 1,
  });
  assert.match(profile.latestMaterialAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('PromptAssembler includes profile material summaries when provided', () => {
  const prompt = new PromptAssembler({
    profile: { name: 'ManSkill', soul: 'persona core', identity: {} },
    voice: { style: 'direct' },
    memory: { shortTermEntries: 0, longTermEntries: 0 },
    skills: [],
    channels: [],
    models: [],
    profiles: [
      {
        id: 'harry-han',
        materialCount: 3,
        materialTypes: { text: 1, message: 1, screenshot: 1 },
        latestMaterialAt: '2026-04-16T15:00:00.000Z',
      },
    ],
  }).buildSystemPrompt();

  assert.match(prompt, /Profiles:/);
  assert.match(prompt, /harry-han/);
  assert.match(prompt, /"screenshot": 1/);
});

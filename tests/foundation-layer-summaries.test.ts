import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { AgentProfile } from '../src/core/agent-profile.ts';
import { MemoryStore } from '../src/core/memory-store.ts';
import { SkillRegistry } from '../src/core/skill-registry.ts';
import { SoulProfile } from '../src/core/soul-profile.ts';
import { VoiceProfile } from '../src/core/voice-profile.ts';
import { buildSummary } from '../src/index.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-foundation-layer-'));
}

function seedMinimalRepo(rootDir: string) {
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable memory organized by horizon.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\nStay direct.\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n- Close with a concrete next step.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\nServe faithfully.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');
}

test('foundation layer primitives expose readiness-oriented summary metadata', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\nLead with fidelity.\n\n## Core truths\n\nKeep the system inspectable.\nPrefer small verified slices.\n\n## Boundaries\n\n- Do not bluff certainty.\n- Do not hide provenance.\n\n## Vibe\n\nGrounded and direct.\n\n## Continuity\n\nCarry durable lessons forward.\n`);
  const voice = new VoiceProfile({
    tone: 'human',
    style: 'precise',
    constraints: ['stay grounded', 'avoid drift'],
    signatures: ['short updates'],
    languageHints: ['keep bilingual habits'],
  });
  const profile = new AgentProfile({
    name: 'ManSkill',
    soul: 'Faithful and practical.',
    identity: { role: 'agent', architecture: 'memory + skills + soul + voice' },
    goals: ['imitate faithfully', 'ship verified slices'],
    voice: voice.summary(),
  });
  const memory = new MemoryStore({
    shortTerm: [{ id: 'daily-1' }],
    longTerm: [{ id: 'long-1' }, { id: 'long-2' }],
  });
  const skills = new SkillRegistry([
    'delivery',
    { id: 'foundation', name: 'Foundation', description: 'core foundations', status: 'custom' },
  ]);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Lead with fidelity.',
    coreTruths: ['Keep the system inspectable.', 'Prefer small verified slices.'],
    boundaries: ['Do not bluff certainty.', 'Do not hide provenance.'],
    vibe: ['Grounded and direct.'],
    continuity: ['Carry durable lessons forward.'],
    coreTruthCount: 2,
    boundaryCount: 2,
    vibeLineCount: 1,
    continuityCount: 1,
    sectionCount: 4,
    hasGuidance: true,
  });

  assert.deepEqual(memory.summary(), {
    shortTermEntries: 1,
    longTermEntries: 2,
    totalEntries: 3,
    shortTermPresent: true,
    longTermPresent: true,
  });

  assert.deepEqual(skills.summary(), {
    skillCount: 2,
    discoveredCount: 1,
    customCount: 1,
    statusCounts: {
      custom: 1,
      discovered: 1,
    },
    skills: [
      {
        id: 'delivery',
        name: 'delivery',
        description: null,
        status: 'discovered',
      },
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'core foundations',
        status: 'custom',
      },
    ],
  });

  assert.deepEqual(voice.summary(), {
    tone: 'human',
    style: 'precise',
    constraints: ['stay grounded', 'avoid drift'],
    signatures: ['short updates'],
    languageHints: ['keep bilingual habits'],
    constraintCount: 2,
    signatureCount: 1,
    languageHintCount: 1,
    hasGuidance: true,
  });

  assert.deepEqual(profile.summary(), {
    name: 'ManSkill',
    soul: 'Faithful and practical.',
    identity: { role: 'agent', architecture: 'memory + skills + soul + voice' },
    identityKeys: ['architecture', 'role'],
    goals: ['imitate faithfully', 'ship verified slices'],
    goalCount: 2,
    hasSoul: true,
    hasVoice: true,
    foundationLayers: ['memory', 'skills', 'soul', 'voice'],
    voice: voice.summary(),
  });
});

test('voice profile parses tone, signature moves, avoid, and language hints from voice docs', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nStay direct.\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n- Close with a concrete next step.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'Warm and grounded.',
    style: 'documented',
    constraints: ['Never pad the answer.'],
    signatures: ['Use crisp examples.', 'Close with a concrete next step.'],
    languageHints: ['Preserve bilingual phrasing when the source material switches languages.'],
    constraintCount: 1,
    signatureCount: 2,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('voice profile falls back to voice capture/default sections when explicit signature and avoid headings are missing', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nVoice files define how the agent sounds once the deeper identity is already set.\n\n## Voice should capture\n- sentence length preferences\n- directness vs softness\n\n## Voice should not capture\n- temporary tasks\n- private user facts that belong in memory\n\n## Current default for ManSkill\n- concise by default\n- willing to preserve bilingual or mixed-language habits\n\nAs the project matures, this directory can hold:\n- a main voice profile\n- example writing samples\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'Voice files define how the agent sounds once the deeper identity is already set.',
    style: 'documented',
    constraints: ['temporary tasks', 'private user facts that belong in memory'],
    signatures: ['sentence length preferences', 'directness vs softness', 'concise by default'],
    languageHints: ['willing to preserve bilingual or mixed-language habits'],
    constraintCount: 2,
    signatureCount: 3,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('voice profile accepts prose lines inside signature, avoid, and language hint sections', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nStay direct.\n\n## Tone\nWarm and grounded.\n\n## Signature moves\nUse crisp examples without bullets.\n\n## Avoid\nNever pad the answer.\n\n## Language hints\nPreserve bilingual phrasing when the source material switches languages.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'Warm and grounded.',
    style: 'documented',
    constraints: ['Never pad the answer.'],
    signatures: ['Use crisp examples without bullets.'],
    languageHints: ['Preserve bilingual phrasing when the source material switches languages.'],
    constraintCount: 1,
    signatureCount: 1,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('soul profile falls back to foundation starter headings when core truths and continuity headings are missing', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\nSoul docs define the durable operating posture.\n\n## Core values\n- Stay faithful to the source material.\n- Prefer verified slices over ambitious rewrites.\n\n## Boundaries\n- Do not bluff certainty.\n\n## Decision rules\n- Choose the smallest next step that preserves trust.\n- Keep durable lessons visible for later runs.\n`);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Soul docs define the durable operating posture.',
    coreTruths: ['Stay faithful to the source material.', 'Prefer verified slices over ambitious rewrites.'],
    boundaries: ['Do not bluff certainty.'],
    vibe: [],
    continuity: ['Choose the smallest next step that preserves trust.', 'Keep durable lessons visible for later runs.'],
    coreTruthCount: 2,
    boundaryCount: 1,
    vibeLineCount: 0,
    continuityCount: 2,
    sectionCount: 3,
    hasGuidance: true,
  });
});

test('buildSummary carries the richer foundation layer summaries at top level', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.memory, {
    shortTermEntries: 1,
    longTermEntries: 1,
    totalEntries: 2,
    shortTermPresent: true,
    longTermPresent: true,
  });

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    rootPath: 'memory/README.md',
    rootExcerpt: 'Keep durable memory organized by horizon.',
    dailyCount: 1,
    longTermCount: 1,
    scratchCount: 0,
    totalEntries: 2,
    readyBucketCount: 2,
    totalBucketCount: 3,
    populatedBuckets: ['daily', 'long-term'],
    emptyBuckets: ['scratch'],
    sampleEntries: ['daily/today.md', 'long-term/stable.md'],
  });

  assert.deepEqual(summary.soul, {
    excerpt: 'Serve faithfully.',
    coreTruths: [],
    boundaries: [],
    vibe: [],
    continuity: [],
    coreTruthCount: 0,
    boundaryCount: 0,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 0,
    hasGuidance: true,
  });

  assert.deepEqual(summary.voice, {
    tone: 'Warm and grounded.',
    style: 'documented',
    constraints: ['Never pad the answer.'],
    signatures: ['Use crisp examples.', 'Close with a concrete next step.'],
    languageHints: ['Preserve bilingual phrasing when the source material switches languages.'],
    constraintCount: 1,
    signatureCount: 2,
    languageHintCount: 1,
    hasGuidance: true,
  });

  assert.equal(summary.profile.goalCount, 2);
  assert.deepEqual(summary.profile.identityKeys, ['architecture', 'role']);
  assert.equal(summary.profile.hasSoul, true);
  assert.equal(summary.profile.hasVoice, true);
  assert.deepEqual(summary.profile.foundationLayers, ['memory', 'skills', 'soul', 'voice']);

  assert.equal(summary.skills.skillCount, 1);
  assert.equal(summary.skills.discoveredCount, 1);
  assert.equal(summary.skills.customCount, 0);
  assert.deepEqual(summary.skills.statusCounts, { discovered: 1 });
  assert.match(summary.promptPreview, /coverage: 2\/4 ready; thin memory, skills/);
});

test('buildSummary foundation core marks partially structured soul and voice docs as thin with missing sections', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable memory organized by horizon.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nHow to deliver verified slices.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.soul.missingSections, ['boundaries', 'continuity']);
  assert.equal(summary.foundation.core.soul.readySectionCount, 1);
  assert.equal(summary.foundation.core.voice.readySectionCount, 1);
  assert.equal(summary.foundation.core.voice.totalSectionCount, 4);
  assert.deepEqual(summary.foundation.core.voice.missingSections, ['signature-moves', 'avoid', 'language-hints']);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 2);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['soul', 'voice']);
  assert.deepEqual(summary.foundation.core.overview.recommendedActions, [
    'add missing sections to SOUL.md: boundaries, continuity',
    'add missing sections to voice/README.md: signature-moves, avoid, language-hints',
  ]);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /SOUL\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /## Boundaries/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /## Decision rules/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /voice\/README\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Signature moves/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Avoid/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Language hints/);
});

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
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\nStay direct.\n');
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
    tone: 'human',
    style: 'person-specific',
    constraints: ['stay faithful to learned voice'],
    signatures: ['consistent persona', 'compact but vivid phrasing'],
    languageHints: ['preserve bilingual or multilingual behavior when present'],
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
});

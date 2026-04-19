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
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
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

test('voice profile ignores untouched starter-template guidance bullets', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\n## Tone\n- Describe the target cadence, directness, and emotional texture here.\n\n## Signature moves\n- Capture recurring phrasing, structure, or rhetorical habits here.\n\n## Avoid\n- List wording, hedges, or habits that break the voice.\n\n## Language hints\n- Note bilingual, dialect, or code-switching habits worth preserving.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'clear',
    style: 'adaptive',
    constraints: [],
    signatures: [],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 0,
    languageHintCount: 0,
    hasGuidance: false,
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

test('voice profile strips numbered list markers inside structured sections', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nStay direct.\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n1. Use crisp examples.\n2. Close with a concrete next step.\n\n## Avoid\n1. Never pad the answer.\n\n## Language hints\n1. Preserve bilingual phrasing when the source material switches languages.\n`);

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

test('voice profile parses setext headings inside structured sections', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nTone\n----\nWarm and grounded.\n\nSignature moves\n---------------\n- Use crisp examples.\n- Close with a concrete next step.\n\nAvoid\n-----\n- Never pad the answer.\n\nLanguage hints\n--------------\n- Preserve bilingual phrasing when the source material switches languages.\n`);

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

test('voice profile uses frontmatter description as the default tone instead of YAML metadata lines', () => {
  const voice = VoiceProfile.fromDocument(`---
name: ManSkill voice
summary: ignored field
Description: Preserve terse bilingual delivery.
---

# Voice

## Current default for ManSkill
- concise by default
- preserve 中文 and English switching when the source does
`);

  assert.deepEqual(voice.summary(), {
    tone: 'Preserve terse bilingual delivery.',
    style: 'documented',
    constraints: [],
    signatures: ['concise by default'],
    languageHints: ['preserve 中文 and English switching when the source does'],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('voice profile treats a documented tone-only excerpt as real guidance', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nclear\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'clear',
    style: 'documented',
    constraints: [],
    signatures: [],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 0,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('voice profile marks structured tone-only docs as guided even without other sections', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\n## Tone\nWarm and grounded.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'Warm and grounded.',
    style: 'documented',
    constraints: [],
    signatures: [],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 0,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('voice profile ignores fenced code blocks when finding the default tone', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '```tsx',
    "const tone = 'placeholder';",
    '```',
    '',
    'Stay direct after the example.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Stay direct after the example.',
    style: 'documented',
    constraints: [],
    signatures: ['Use crisp examples.'],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('voice profile ignores html comments when finding the default tone', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '<!-- hidden guidance should not become the tone -->',
    '',
    'Stay direct after the comment.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Stay direct after the comment.',
    style: 'documented',
    constraints: [],
    signatures: ['Use crisp examples.'],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('voice profile ignores multiline html comments when parsing structured sections', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '<!--',
    '## Tone',
    'Muted placeholder.',
    '## Signature moves',
    '- Hidden placeholder should not count.',
    '## Avoid',
    '- Hidden placeholder should not count.',
    '## Language hints',
    '- Hidden placeholder should not count.',
    '-->',
    '',
    'Stay direct after the hidden scaffold.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Stay direct after the hidden scaffold.',
    style: 'documented',
    constraints: [],
    signatures: ['Use crisp examples.'],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('voice profile keeps mismatched fence markers inside the fenced block when finding the default tone', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '```tsx',
    '~~~',
    'const tone = `still code`;',
    '```',
    '',
    'Use the first prose line after the real closing fence.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Use the first prose line after the real closing fence.',
    style: 'documented',
    constraints: [],
    signatures: ['Use crisp examples.'],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('voice profile keeps same-marker fence-like code lines inside the fenced block when finding the default tone', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '```md',
    '```tsx',
    'const tone = "still code";',
    '```',
    '',
    'Use the prose line after the real closing fence.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Use the prose line after the real closing fence.',
    style: 'documented',
    constraints: [],
    signatures: ['Use crisp examples.'],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 0,
    hasGuidance: true,
  });
});

test('soul profile ignores fenced code blocks when finding the default excerpt', () => {
  const soul = SoulProfile.fromDocument([
    '# Soul',
    '',
    '```md',
    'placeholder excerpt',
    '```',
    '',
    'Durable posture after the example.',
    '',
    '## Core truths',
    '- Stay faithful to the source material.',
    '',
  ].join('\n'));

  assert.deepEqual(soul.summary(), {
    excerpt: 'Durable posture after the example.',
    coreTruths: ['Stay faithful to the source material.'],
    boundaries: [],
    vibe: [],
    continuity: [],
    coreTruthCount: 1,
    boundaryCount: 0,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 1,
    hasGuidance: true,
  });
});

test('soul profile ignores html comments when finding the default excerpt', () => {
  const soul = SoulProfile.fromDocument([
    '# Soul',
    '',
    '<!-- hidden posture should not become the excerpt -->',
    '',
    'Durable posture after the comment.',
    '',
    '## Core truths',
    '- Stay faithful to the source material.',
    '',
  ].join('\n'));

  assert.deepEqual(soul.summary(), {
    excerpt: 'Durable posture after the comment.',
    coreTruths: ['Stay faithful to the source material.'],
    boundaries: [],
    vibe: [],
    continuity: [],
    coreTruthCount: 1,
    boundaryCount: 0,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 1,
    hasGuidance: true,
  });
});

test('soul profile ignores multiline html comments when parsing structured sections', () => {
  const soul = SoulProfile.fromDocument([
    '# Soul',
    '',
    '<!--',
    '## Core truths',
    '- Hidden placeholder should not count.',
    '## Boundaries',
    '- Hidden placeholder should not count.',
    '## Continuity',
    '- Hidden placeholder should not count.',
    '-->',
    '',
    'Durable posture after the hidden scaffold.',
    '',
    '## Core truths',
    '- Stay faithful to the source material.',
    '',
  ].join('\n'));

  assert.deepEqual(soul.summary(), {
    excerpt: 'Durable posture after the hidden scaffold.',
    coreTruths: ['Stay faithful to the source material.'],
    boundaries: [],
    vibe: [],
    continuity: [],
    coreTruthCount: 1,
    boundaryCount: 0,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 1,
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

test('soul profile uses frontmatter description as the excerpt instead of YAML metadata lines', () => {
  const soul = SoulProfile.fromDocument(`---
name: ManSkill soul
Description: Keep the operating posture grounded.
---

# Soul

## Core values
- Stay faithful to the source material.

## Boundaries
- Do not bluff certainty.
`);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Keep the operating posture grounded.',
    coreTruths: ['Stay faithful to the source material.'],
    boundaries: ['Do not bluff certainty.'],
    vibe: [],
    continuity: [],
    coreTruthCount: 1,
    boundaryCount: 1,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 2,
    hasGuidance: true,
  });
});

test('soul profile strips numbered list markers inside structured sections', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\nDurable posture.\n\n## Core truths\n1. Stay faithful to the source material.\n2. Prefer verified slices over big rewrites.\n\n## Boundaries\n1. Do not bluff certainty.\n\n## Vibe\n1. Grounded and direct.\n\n## Continuity\n1. Carry durable lessons forward.\n`);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Durable posture.',
    coreTruths: ['Stay faithful to the source material.', 'Prefer verified slices over big rewrites.'],
    boundaries: ['Do not bluff certainty.'],
    vibe: ['Grounded and direct.'],
    continuity: ['Carry durable lessons forward.'],
    coreTruthCount: 2,
    boundaryCount: 1,
    vibeLineCount: 1,
    continuityCount: 1,
    sectionCount: 4,
    hasGuidance: true,
  });
});

test('soul profile parses setext headings inside structured sections', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\nDurable posture.\n\nCore truths\n-----------\n- Stay faithful to the source material.\n- Prefer verified slices over big rewrites.\n\nBoundaries\n----------\n- Do not bluff certainty.\n\nVibe\n-----\n- Grounded and direct.\n\nContinuity\n----------\n- Carry durable lessons forward.\n`);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Durable posture.',
    coreTruths: ['Stay faithful to the source material.', 'Prefer verified slices over big rewrites.'],
    boundaries: ['Do not bluff certainty.'],
    vibe: ['Grounded and direct.'],
    continuity: ['Carry durable lessons forward.'],
    coreTruthCount: 2,
    boundaryCount: 1,
    vibeLineCount: 1,
    continuityCount: 1,
    sectionCount: 4,
    hasGuidance: true,
  });
});

test('soul profile ignores untouched starter-template guidance bullets', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\n## Core truths\n- Describe the durable values and goals that should survive across tasks.\n\n## Boundaries\n- Capture what the agent should protect or refuse to compromise.\n\n## Continuity\n- Note the principles to use when tradeoffs appear.\n`);

  assert.deepEqual(soul.summary(), {
    excerpt: null,
    coreTruths: [],
    boundaries: [],
    vibe: [],
    continuity: [],
    coreTruthCount: 0,
    boundaryCount: 0,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 0,
    hasGuidance: false,
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
    rootExcerpt: 'Durable repo knowledge and operator context.',
    rootMissingSections: [],
    rootReadySections: ['what-belongs-here', 'buckets'],
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
  assert.equal(summary.foundation.core.skills.hasRootDocument, false);
  assert.equal(summary.foundation.core.skills.rootPath, 'skills/README.md');
  assert.equal(summary.foundation.core.skills.rootExcerpt, null);
  assert.match(summary.promptPreview, /Soul profile:\n- excerpt: Serve faithfully\.\n- core truths: 0\n- boundaries: 0\n- vibe: 0\n- continuity: 0/);
  assert.match(summary.promptPreview, /Voice profile:\n- tone: Warm and grounded\.\n- style: documented\n- constraints: 1 \(Never pad the answer\.\)\n- signatures: 2 \(Use crisp examples\.; Close with a concrete next step\.\)\n- language hints: 1 \(Preserve bilingual phrasing when the source material switches languages\.\)/);
  assert.match(summary.promptPreview, /Memory store:\n- short-term: 1\n- long-term: 1\n- total: 2\n- coverage: short-term yes, long-term yes/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- top skills: delivery \[discovered\]/);
  assert.doesNotMatch(summary.promptPreview, /"constraints": \[/);
  assert.match(summary.promptPreview, /coverage: 2\/4 ready; thin memory, skills/);
  assert.match(summary.promptPreview, /- memory: README yes, daily 1, long-term 1, scratch 0; buckets 2\/3 ready \(daily, long-term\), missing scratch; samples: daily\/today\.md, long-term\/stable\.md; root: Durable repo knowledge and operator context\.; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
});

test('buildSummary skill preview shows descriptions and summarizes hidden skills compactly', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'intake'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'foundation'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'providers'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '---\ndescription: Deliver verified slices.\n---\n\n## What this skill is for\n- Deliver verified slices.\n\n## Suggested workflow\n- Run the smallest validating loop first.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'foundation', 'SKILL.md'), '---\ndescription: Keep the OpenClaw-style foundation aligned.\n---\n\n## What this skill is for\n- Keep the OpenClaw-style foundation aligned.\n\n## Suggested workflow\n- Refresh the smallest actionable summary surface first.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'intake', 'SKILL.md'), '---\ndescription: Refresh target-person intake summaries.\n---\n\n## What this skill is for\n- Refresh target-person intake summaries.\n\n## Suggested workflow\n- Keep helper commands aligned with prompt previews.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'providers', 'SKILL.md'), '---\ndescription: Wire model providers into runtime-ready manifests.\n---\n\n## What this skill is for\n- Wire model providers into runtime-ready manifests.\n\n## Suggested workflow\n- Verify provider helpers after each runtime change.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.skills.skillCount, 4);
  assert.match(
    summary.promptPreview,
    /Skill registry:\n- total: 4\n- discovered: 4\n- custom: 0\n- top skills: delivery \[discovered\]: Deliver verified slices\.; foundation \[discovered\]: Keep the OpenClaw-style foundation aligned\.; intake \[discovered\]: Refresh target-person intake summaries\.; \+1 more/,
  );
});

test('buildSummary skill preview prefers described skills before placeholders', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'foundation'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '---\ndescription: Deliver verified slices.\n---\n\n## What this skill is for\n- Deliver verified slices.\n\n## Suggested workflow\n- Run the smallest validating loop first.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'foundation', 'SKILL.md'), '---\ndescription: Keep the OpenClaw-style foundation aligned.\n---\n\n## What this skill is for\n- Keep the OpenClaw-style foundation aligned.\n\n## Suggested workflow\n- Refresh the smallest actionable summary surface first.\n');

  const summary = buildSummary(rootDir);

  assert.match(
    summary.promptPreview,
    /Skill registry:\n- total: 3\n- discovered: 3\n- custom: 0\n- top skills: delivery \[discovered\]: Deliver verified slices\.; foundation \[discovered\]: Keep the OpenClaw-style foundation aligned\.; alpha \[discovered\]/,
  );
});

test('buildSummary skill preview truncates long skill descriptions to keep the block compact', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '---\ndescription: This skill walks through a deliberately overlong operator-facing description that should be truncated before it overwhelms the compact skill registry preview block in the prompt output.\n---\n\n## What this skill is for\n- Deliver verified slices.\n\n## Suggested workflow\n- Run the smallest validating loop first.\n');

  const summary = buildSummary(rootDir);

  assert.match(summary.promptPreview, /- top skills: delivery \[discovered\]: This skill walks through a deliberately overlong operator-facing description that should be tru…/);
  assert.doesNotMatch(summary.promptPreview, /overwhelms the compact skill registry preview block in the prompt output/);
});

test('buildSummary marks memory as thin when memory README lacks structured sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable memory organized by horizon.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.md'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\n## What this skill is for\n- Use scheduled follow-ups carefully.\n\n## Suggested workflow\n- Add the exact recurring command.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory.rootReadySections, []);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['memory']);
  assert.equal(summary.foundation.core.maintenance.recommendedArea, 'memory');
  assert.equal(summary.foundation.core.maintenance.recommendedAction, 'add missing sections to memory/README.md: what-belongs-here, buckets');
  assert.deepEqual(summary.foundation.core.maintenance.recommendedPaths, ['memory/README.md']);
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'memory',
      status: 'thin',
      summary: 'README yes, daily 1, long-term 1, scratch 1, root 0/2 sections ready, missing what-belongs-here, buckets',
      action: 'add missing sections to memory/README.md: what-belongs-here, buckets',
      paths: ['memory/README.md'],
      thinPaths: ['memory/README.md'],
      command: summary.foundation.core.maintenance.helperCommands.memory,
    },
  ]);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin memory/);
  assert.match(summary.promptPreview, /memory \[thin\]: add missing sections to memory\/README\.md: what-belongs-here, buckets @ memory\/README\.md/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; buckets 3\/3 ready \(daily, long-term, scratch\); samples: daily\/today\.md, long-term\/stable\.md, scratch\/draft\.md; root: Keep durable memory organized by horizon\.; root sections 0\/2 ready, missing what-belongs-here, buckets/);
});

test('buildSummary foundation core marks partially structured soul and voice docs as thin with missing sections', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\nShared repo skill guidance.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\nHow to deliver verified slices.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.soul.rootPath, 'SOUL.md');
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Stay faithful.');
  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths']);
  assert.deepEqual(summary.foundation.core.soul.missingSections, ['boundaries', 'continuity']);
  assert.equal(summary.foundation.core.soul.readySectionCount, 1);
  assert.equal(summary.foundation.core.voice.rootPath, 'voice/README.md');
  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Warm and grounded.');
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone']);
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
  assert.doesNotMatch(summary.foundation.core.maintenance.helperCommands.soul ?? '', /if grep -Eq/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /node --input-type=module -e/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /## Continuity/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /decision rules/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /voice\/README\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Signature moves/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Avoid/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Language hints/);
  assert.match(summary.promptPreview, /- soul: present, 1 lines, Stay faithful\. @ SOUL\.md, sections 1\/3 ready \(core-truths\), missing boundaries, continuity/);
  assert.match(summary.promptPreview, /- voice: present, 1 lines, Warm and grounded\. @ voice\/README\.md, sections 1\/4 ready \(tone\), missing signature-moves, avoid, language-hints/);
});

test('buildSummary ignores multiline html comments when deciding whether soul and voice docs are structured', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Deliver verified slices.\n\n## Suggested workflow\n- Run the smallest validating loop first.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n<!--\n## Core truths\n- Hidden placeholder should not count.\n## Boundaries\n- Hidden placeholder should not count.\n## Continuity\n- Hidden placeholder should not count.\n-->\n\nStay faithful after the hidden scaffold.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n<!--\n## Tone\nMuted placeholder.\n## Signature moves\n- Hidden placeholder should not count.\n## Avoid\n- Hidden placeholder should not count.\n## Language hints\n- Hidden placeholder should not count.\n-->\n\nStay direct after the hidden scaffold.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.soul.structured, false);
  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'continuity']);
  assert.deepEqual(summary.foundation.core.soul.missingSections, []);
  assert.equal(summary.foundation.core.soul.readySectionCount, 3);
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Stay faithful after the hidden scaffold.');
  assert.equal(summary.foundation.core.voice.structured, false);
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Stay direct after the hidden scaffold.');
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, []);
  assert.deepEqual(summary.foundation.core.overview.missingAreas, []);
  assert.match(summary.promptPreview, /- soul: present, 1 lines, Stay faithful after the hidden scaffold\. @ SOUL\.md, sections 3\/3 ready \(core-truths, boundaries, continuity\)/);
  assert.match(summary.promptPreview, /- voice: present, 1 lines, Stay direct after the hidden scaffold\. @ voice\/README\.md, sections 4\/4 ready \(tone, signature-moves, avoid, language-hints\)/);
});

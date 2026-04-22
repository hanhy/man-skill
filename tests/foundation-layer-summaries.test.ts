import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { AgentProfile } from '../src/core/agent-profile.ts';
import { MemoryStore } from '../src/core/memory-store.ts';
import { SkillRegistry } from '../src/core/skill-registry.ts';
import { SoulProfile } from '../src/core/soul-profile.ts';
import { VoiceProfile } from '../src/core/voice-profile.ts';
import { buildCoreFoundationSummary, summarizeRootSectionSummary } from '../src/core/foundation-core.ts';
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

test('summarizeRootSectionSummary preserves count-only root progress without section names', () => {
  assert.equal(
    summarizeRootSectionSummary(undefined, ['layout'], 1, 2),
    ', root 1/2 sections ready, missing layout',
  );
  assert.equal(
    summarizeRootSectionSummary(['what-belongs-here'], undefined, 1, 2),
    ', root 1/2 sections ready (what-belongs-here)',
  );
  assert.equal(summarizeRootSectionSummary(undefined, undefined, 0, 0), '');
});

test('foundation layer primitives normalize legacy short-term provenance consistently', () => {
  const legacyShortTerm = [
    ' memory\\short-term\\today.md ',
    './memory/short-term/today.md',
    'memory//short-term//older.md',
    'memory/short-term/older.md',
    '',
    null,
  ];
  const memory = new MemoryStore({ legacyShortTerm: legacyShortTerm as unknown as string[] });
  const foundation = buildCoreFoundationSummary({
    memoryIndex: {
      root: '# Memory\n\n## What belongs here\n- Durable repo knowledge.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts\n- scratch/: working drafts\n',
      daily: ['today.md'],
      legacyShortTerm: legacyShortTerm as unknown as string[],
      longTerm: ['stable.md'],
      scratch: ['ideas.md'],
    },
  });

  assert.deepEqual(memory.legacyShortTermSources, [
    'memory/short-term/today.md',
    'memory/short-term/older.md',
  ]);
  assert.deepEqual(foundation.memory.legacyShortTermSources, [
    'memory/short-term/today.md',
    'memory/short-term/older.md',
  ]);
  assert.equal(foundation.memory.legacyShortTermSourceCount, 2);
  assert.deepEqual(foundation.memory.legacyShortTermSampleSources, [
    'memory/short-term/today.md',
    'memory/short-term/older.md',
  ]);
});

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
    daily: [{ id: 'daily-1' }],
    longTerm: [{ id: 'long-1' }, { id: 'long-2' }],
    scratch: [{ id: 'scratch-1' }],
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
    dailyEntries: 1,
    longTermEntries: 2,
    scratchEntries: 1,
    totalEntries: 4,
    dailyPresent: true,
    longTermPresent: true,
    scratchPresent: true,
    shortTermEntries: 1,
    shortTermPresent: true,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
    readyBucketCount: 3,
    totalBucketCount: 3,
    populatedBuckets: ['daily', 'long-term', 'scratch'],
    emptyBuckets: [],
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

test('soul and voice parsers accept plus bullets and checklist markers inside structured sections', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\nStay faithful.\n\n## Core truths\n+ [ ] Keep the system inspectable.\n+ Prefer narrow, verified diffs.\n\n## Boundaries\n+ [x] Do not bluff certainty.\n\n## Vibe\n+ Grounded and direct.\n\n## Continuity\n+ Carry durable lessons forward.\n`);
  const voice = VoiceProfile.fromDocument(`# Voice\n\n## Tone\n+ [ ] Crisp and grounded.\n\n## Signature moves\n+ [ ] Use concrete examples.\n+ Close with the next step.\n\n## Avoid\n+ [x] Padding the answer.\n\n## Language hints\n+ Preserve bilingual phrasing when the source switches languages.\n`);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Stay faithful.',
    coreTruths: ['Keep the system inspectable.', 'Prefer narrow, verified diffs.'],
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

  assert.deepEqual(voice.summary(), {
    tone: 'Crisp and grounded.',
    style: 'documented',
    constraints: ['Padding the answer.'],
    signatures: ['Use concrete examples.', 'Close with the next step.'],
    languageHints: ['Preserve bilingual phrasing when the source switches languages.'],
    constraintCount: 1,
    signatureCount: 2,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('memory store prefers daily over legacy shortTerm input and ignores non-array buckets', () => {
  const memory = new MemoryStore({
    daily: [{ id: 'daily-1' }],
    shortTerm: [{ id: 'legacy-short-term' }],
    longTerm: { bad: true } as unknown as unknown[],
    scratch: 'not-an-array' as unknown as unknown[],
  });

  assert.deepEqual(memory.summary(), {
    dailyEntries: 1,
    longTermEntries: 0,
    scratchEntries: 0,
    totalEntries: 1,
    dailyPresent: true,
    longTermPresent: false,
    scratchPresent: false,
    shortTermEntries: 1,
    shortTermPresent: true,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
    readyBucketCount: 1,
    totalBucketCount: 3,
    populatedBuckets: ['daily'],
    emptyBuckets: ['long-term', 'scratch'],
  });
});

test('memory summaries trim and dedupe legacy short-term provenance before exposing it', () => {
  const memory = new MemoryStore({
    daily: [{ id: 'daily-1' }],
    legacyShortTerm: [
      ' memory/short-term/legacy.md ',
      'memory/short-term/legacy.md',
      'memory/short-term/older.md',
      '',
      '   ',
    ],
  });

  assert.deepEqual(memory.summary(), {
    dailyEntries: 1,
    longTermEntries: 0,
    scratchEntries: 0,
    totalEntries: 1,
    dailyPresent: true,
    longTermPresent: false,
    scratchPresent: false,
    shortTermEntries: 1,
    shortTermPresent: true,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 2,
    legacyShortTermSources: ['memory/short-term/legacy.md', 'memory/short-term/older.md'],
    legacyShortTermSampleSources: ['memory/short-term/legacy.md', 'memory/short-term/older.md'],
    legacyShortTermSourceOverflowCount: 0,
    readyBucketCount: 1,
    totalBucketCount: 3,
    populatedBuckets: ['daily'],
    emptyBuckets: ['long-term', 'scratch'],
  });

  const foundation = buildCoreFoundationSummary({
    memoryIndex: {
      root: '# Memory\n\n## What belongs here\n- Durable notes.\n\n## Buckets\n- daily/: short-term notes\n- long-term/: stable facts\n- scratch/: drafts\n',
      daily: ['today.md'],
      legacyShortTerm: [
        ' memory/short-term/legacy.md ',
        'memory/short-term/legacy.md',
        'memory/short-term/older.md',
        '',
        '   ',
      ],
      longTerm: ['stable.md'],
      scratch: ['draft.md'],
    },
    skillNames: ['delivery'],
  });

  assert.equal(foundation.memory.legacyShortTermSourceCount, 2);
  assert.deepEqual(foundation.memory.legacyShortTermSources, ['memory/short-term/legacy.md', 'memory/short-term/older.md']);
  assert.deepEqual(foundation.memory.legacyShortTermSampleSources, ['memory/short-term/legacy.md', 'memory/short-term/older.md']);
  assert.equal(foundation.memory.legacyShortTermSourceOverflowCount, 0);
});

test('memory store keeps shortTerm as a writable alias of daily', () => {
  const memory = new MemoryStore({
    daily: [{ id: 'daily-1' }],
  });
  const replacementDaily = [{ id: 'daily-2' }];

  memory.shortTerm = replacementDaily;
  memory.addShortTerm({ id: 'daily-3' });

  assert.equal(memory.shortTerm, memory.daily);
  assert.deepEqual(memory.daily, [{ id: 'daily-2' }, { id: 'daily-3' }]);
  assert.deepEqual(memory.summary(), {
    dailyEntries: 2,
    longTermEntries: 0,
    scratchEntries: 0,
    totalEntries: 2,
    dailyPresent: true,
    longTermPresent: false,
    scratchPresent: false,
    shortTermEntries: 2,
    shortTermPresent: true,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
    readyBucketCount: 1,
    totalBucketCount: 3,
    populatedBuckets: ['daily'],
    emptyBuckets: ['long-term', 'scratch'],
  });
});

test('memory store keeps daily and shortTerm in sync when daily is reassigned after construction', () => {
  const memory = new MemoryStore({
    shortTerm: [{ id: 'legacy-short-term' }],
  });
  const replacementDaily = [{ id: 'daily-1' }];

  memory.daily = replacementDaily;
  memory.addDaily({ id: 'daily-2' });

  assert.equal(memory.shortTerm, memory.daily);
  assert.deepEqual(memory.shortTerm, [{ id: 'daily-1' }, { id: 'daily-2' }]);
  assert.deepEqual(memory.summary(), {
    dailyEntries: 2,
    longTermEntries: 0,
    scratchEntries: 0,
    totalEntries: 2,
    dailyPresent: true,
    longTermPresent: false,
    scratchPresent: false,
    shortTermEntries: 2,
    shortTermPresent: true,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
    readyBucketCount: 1,
    totalBucketCount: 3,
    populatedBuckets: ['daily'],
    emptyBuckets: ['long-term', 'scratch'],
  });
});

test('memory summaries treat legacy short-term files as canonical daily entries', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'short-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', 'legacy.md'), 'legacy note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.md'), 'draft');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core truths\n- Build a faithful operator core.\n\n## Boundaries\n- Do not bluff certainty.\n\n## Vibe\n- Grounded and direct.\n\n## Continuity\n- Preserve clear priorities.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Keep delivery loops aligned.\n\n## Suggested workflow\n- Run the queue in priority order.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.memory.dailyEntries, 1);
  assert.equal(summary.memory.shortTermEntries, 1);
  assert.equal(summary.memory.legacyShortTermSourceCount, 1);
  assert.deepEqual(summary.memory.legacyShortTermSources, ['memory/short-term/legacy.md']);
  assert.deepEqual(summary.memory.legacyShortTermSampleSources, ['memory/short-term/legacy.md']);
  assert.equal(summary.memory.legacyShortTermSourceOverflowCount, 0);
  assert.equal(summary.foundation.core.memory.dailyCount, 1);
  assert.equal(summary.foundation.core.memory.legacyShortTermSourceCount, 1);
  assert.deepEqual(summary.foundation.core.memory.legacyShortTermSources, ['memory/short-term/legacy.md']);
  assert.deepEqual(summary.foundation.core.memory.legacyShortTermSampleSources, ['memory/short-term/legacy.md']);
  assert.equal(summary.foundation.core.memory.legacyShortTermSourceOverflowCount, 0);
  assert.deepEqual(summary.foundation.core.memory.sampleEntries, ['daily/legacy.md', 'long-term/stable.md', 'scratch/draft.md']);
  assert.match(summary.promptPreview, /Memory store:\n- daily: 1\n- long-term: 1\n- scratch: 1\n- total: 3\n- buckets: 3\/3 ready \(daily, long-term, scratch\)\n- aliases: daily canonical via shortTermEntries, shortTermPresent; legacy short-term sources memory\/short-term\/legacy\.md/);
});

test('memory alias summary keeps long legacy short-term backlogs compact in prompt preview', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'short-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-01.md'), 'legacy note 1');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-02.md'), 'legacy note 2');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-03.md'), 'legacy note 3');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-04.md'), 'legacy note 4');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core truths\n- Build a faithful operator core.\n\n## Boundaries\n- Do not bluff certainty.\n\n## Vibe\n- Grounded and direct.\n\n## Continuity\n- Preserve clear priorities.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Keep delivery loops aligned.\n\n## Suggested workflow\n- Run the queue in priority order.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.memory.legacyShortTermSourceCount, 4);
  assert.deepEqual(summary.memory.legacyShortTermSampleSources, [
    'memory/short-term/2026-04-01.md',
    'memory/short-term/2026-04-02.md',
    'memory/short-term/2026-04-03.md',
  ]);
  assert.equal(summary.memory.legacyShortTermSourceOverflowCount, 1);
  assert.deepEqual(summary.foundation.core.memory.legacyShortTermSampleSources, [
    'memory/short-term/2026-04-01.md',
    'memory/short-term/2026-04-02.md',
    'memory/short-term/2026-04-03.md',
  ]);
  assert.equal(summary.foundation.core.memory.legacyShortTermSourceOverflowCount, 1);
  assert.match(
    summary.promptPreview,
    /- aliases: daily canonical via shortTermEntries, shortTermPresent; legacy short-term sources memory\/short-term\/2026-04-01\.md, memory\/short-term\/2026-04-02\.md, memory\/short-term\/2026-04-03\.md, \+1 more/,
  );
  assert.doesNotMatch(summary.promptPreview, /memory\/short-term\/2026-04-04\.md/);
});

test('canonical daily counts keep same-basename legacy short-term files instead of deduping them away', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'short-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'canonical daily note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', 'today.md'), 'legacy daily note with the same basename');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.md'), 'idea');
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core truths\n- Build a faithful operator core.\n\n## Boundaries\n- Do not bluff certainty.\n\n## Vibe\n- Grounded and direct.\n\n## Continuity\n- Preserve clear priorities.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Keep delivery loops aligned.\n\n## Suggested workflow\n- Run the queue in priority order.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.memory.dailyEntries, 2);
  assert.equal(summary.memory.shortTermEntries, 2);
  assert.equal(summary.foundation.core.memory.dailyCount, 2);
  assert.equal(summary.foundation.core.memory.totalEntries, 4);
  assert.equal(summary.memory.legacyShortTermSourceCount, 1);
  assert.deepEqual(summary.memory.legacyShortTermSources, ['memory/short-term/today.md']);
  assert.deepEqual(summary.memory.legacyShortTermSampleSources, ['memory/short-term/today.md']);
  assert.equal(summary.memory.legacyShortTermSourceOverflowCount, 0);
  assert.match(summary.promptPreview, /Memory store:\n- daily: 2\n- long-term: 1\n- scratch: 1\n- total: 4/);
  assert.match(summary.promptPreview, /legacy short-term sources memory\/short-term\/today\.md/);
});

test('memory store raw JS entrypoint stays aligned with the TypeScript summary contract', () => {
  const scriptPath = path.join(makeTempRepo(), 'memory-store-check.mjs');
  fs.writeFileSync(
    scriptPath,
    `import { MemoryStore } from ${JSON.stringify(path.resolve(process.cwd(), 'src/core/memory-store.js'))};
const memory = new MemoryStore({ daily: [{ id: 'daily-1' }] });
console.log(JSON.stringify(memory.summary()));
`,
  );

  const rawSummary = JSON.parse(execFileSync('node', [scriptPath], { encoding: 'utf8' }));

  assert.deepEqual(rawSummary, new MemoryStore({ daily: [{ id: 'daily-1' }] }).summary());
});

test('soul profile raw JS entrypoint stays aligned for blockquoted structured docs', () => {
  const document = [
    '# Soul',
    '',
    '> Stay faithful.',
    '',
    '> ## Core truths',
    '> - Keep the system inspectable.',
    '',
    '> ## Boundaries',
    '> - Do not bluff certainty.',
    '',
  ].join('\n');
  const scriptPath = path.join(makeTempRepo(), 'soul-profile-check.mjs');
  fs.writeFileSync(
    scriptPath,
    `import { SoulProfile } from ${JSON.stringify(path.resolve(process.cwd(), 'src/core/soul-profile.js'))};
const soul = SoulProfile.fromDocument(${JSON.stringify(document)});
console.log(JSON.stringify(soul.summary()));
`,
  );

  const rawSummary = JSON.parse(execFileSync('node', [scriptPath], { encoding: 'utf8' }));

  assert.deepEqual(rawSummary, SoulProfile.fromDocument(document).summary());
});

test('voice profile raw JS entrypoint stays aligned for blockquoted legacy structured docs', () => {
  const document = [
    '# Voice',
    '',
    '> Stay direct.',
    '',
    '> ## Tone',
    '> Warm and grounded.',
    '',
    '> Voice should capture',
    '> --------------------',
    '> - Use crisp examples.',
    '',
    '> ## Voice should not capture ##',
    '> - Never pad the answer.',
    '',
    '> ## Current default for Harry Han',
    '> - Preserve English and 中文 phrasing from the source.',
    '> - Lead with the operating takeaway.',
    '',
  ].join('\n');
  const scriptPath = path.join(makeTempRepo(), 'voice-profile-check.mjs');
  fs.writeFileSync(
    scriptPath,
    `import { VoiceProfile } from ${JSON.stringify(path.resolve(process.cwd(), 'src/core/voice-profile.js'))};
const voice = VoiceProfile.fromDocument(${JSON.stringify(document)});
console.log(JSON.stringify(voice.summary()));
`,
  );

  const rawSummary = JSON.parse(execFileSync('node', [scriptPath], { encoding: 'utf8' }));

  assert.deepEqual(rawSummary, VoiceProfile.fromDocument(document).summary());
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

test('voice profile preserves multiline tone paragraphs and indented list continuations inside structured sections', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\n## Tone\nWarm and grounded,\nwith enough urgency to keep momentum.\n\n## Signature moves\n- Use crisp examples that land quickly\n  and end with the next concrete step.\n\n## Avoid\n- Padding the answer\n  with empty throat-clearing.\n\n## Language hints\n- Preserve bilingual phrasing\n  when the source switches languages.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'Warm and grounded, with enough urgency to keep momentum.',
    style: 'documented',
    constraints: ['Padding the answer with empty throat-clearing.'],
    signatures: ['Use crisp examples that land quickly and end with the next concrete step.'],
    languageHints: ['Preserve bilingual phrasing when the source switches languages.'],
    constraintCount: 1,
    signatureCount: 1,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('voice profile keeps current-default continuation lines attached to the bullet they extend', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nStay direct and grounded.\n\n## Current default for ManSkill\n- Keep the answer concise\n  when translating Spanish snippets, preserve the source phrasing.\n- Preserve bilingual phrasing\n  even when the continuation line omits explicit language keywords.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'Stay direct and grounded.',
    style: 'documented',
    constraints: [],
    signatures: [],
    languageHints: [
      'Keep the answer concise when translating Spanish snippets, preserve the source phrasing.',
      'Preserve bilingual phrasing even when the continuation line omits explicit language keywords.',
    ],
    constraintCount: 0,
    signatureCount: 0,
    languageHintCount: 2,
    hasGuidance: true,
  });
});

test('voice profile does not promote current-default language-hint continuations into tone guidance', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\n## Current default for ManSkill\n- Keep the answer concise\n  when translating Spanish snippets, preserve the source phrasing.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'clear',
    style: 'adaptive',
    constraints: [],
    signatures: [],
    languageHints: ['Keep the answer concise when translating Spanish snippets, preserve the source phrasing.'],
    constraintCount: 0,
    signatureCount: 0,
    languageHintCount: 1,
    hasGuidance: true,
  });
});

test('voice profile does not promote current-default signature continuations into truncated tone guidance', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\n## Current default for ManSkill\n- Keep the answer concise\n  and close with the next concrete step.\n`);

  assert.deepEqual(voice.summary(), {
    tone: 'clear',
    style: 'adaptive',
    constraints: [],
    signatures: ['Keep the answer concise and close with the next concrete step.'],
    languageHints: [],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 0,
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

test('voice profile treats target-specific current default headings as legacy language hint aliases too', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\nVoice files define how the agent sounds once the deeper identity is already set.\n\n## Voice should capture\n- sentence length preferences\n- directness vs softness\n\n## Voice should not capture\n- temporary tasks\n- private user facts that belong in memory\n\n## Current default for Harry Han\n- concise by default\n- willing to preserve bilingual or mixed-language habits\n`);

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

test('voice profile treats named-language code-switching guidance in current-default sections as language hints', () => {
  const voiceDocument = `# Voice\n\n## Current default for ManSkill\n- Keep the answer concise.\n- Preserve Spanish and Arabic code-switching from the source.\n`;
  const voice = VoiceProfile.fromDocument(voiceDocument);
  const coreFoundation = buildCoreFoundationSummary({ voiceDocument });

  assert.deepEqual(voice.summary(), {
    tone: 'Keep the answer concise.',
    style: 'documented',
    constraints: [],
    signatures: ['Keep the answer concise.'],
    languageHints: ['Preserve Spanish and Arabic code-switching from the source.'],
    constraintCount: 0,
    signatureCount: 1,
    languageHintCount: 1,
    hasGuidance: true,
  });
  assert.deepEqual(coreFoundation.voice.readySections, ['tone', 'signature-moves', 'language-hints']);
  assert.deepEqual(coreFoundation.voice.missingSections, ['avoid']);
  assert.deepEqual(coreFoundation.voice.headingAliases, ['current-default->language-hints']);
});

test('voice profile keeps language-hint-only current-default sections from counting as tone guidance', () => {
  const voiceDocument = `# Voice\n\n## Current default for ManSkill\n- Preserve Spanish and Arabic code-switching from the source.\n`;
  const voice = VoiceProfile.fromDocument(voiceDocument);
  const coreFoundation = buildCoreFoundationSummary({ voiceDocument });

  assert.deepEqual(voice.summary(), {
    tone: 'clear',
    style: 'adaptive',
    constraints: [],
    signatures: [],
    languageHints: ['Preserve Spanish and Arabic code-switching from the source.'],
    constraintCount: 0,
    signatureCount: 0,
    languageHintCount: 1,
    hasGuidance: true,
  });
  assert.deepEqual(coreFoundation.voice.readySections, ['language-hints']);
  assert.deepEqual(coreFoundation.voice.missingSections, ['tone', 'signature-moves', 'avoid']);
  assert.deepEqual(coreFoundation.voice.headingAliases, ['current-default->language-hints']);
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
  const voice = VoiceProfile.fromDocument(`# Voice\n\nStay direct.\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n1. Use crisp examples.\n2) Close with a concrete next step.\n\n## Avoid\n1) Never pad the answer.\n\n## Language hints\n1) Preserve bilingual phrasing when the source material switches languages.\n`);

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

test('voice profile parses blockquoted structured sections without leaking quote markers into the tone', () => {
  const voice = VoiceProfile.fromDocument(`# Voice\n\n> ## Tone\n> Warm and grounded.\n>\n> ## Signature moves\n> - Use crisp examples.\n> - Close with a concrete next step.\n>\n> ## Avoid\n> - Never pad the answer.\n>\n> ## Language hints\n> - Preserve bilingual phrasing when the source material switches languages.\n`);

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

test('voice profile raw JS entrypoint stays aligned for frontmatter description and target-specific current-default aliases', () => {
  const document = `---
name: Harry Han voice
summary: ignored field
Description: Preserve terse bilingual delivery.
---

# Voice

## Current default for Harry Han
- concise by default
- preserve 中文 and English switching when the source does
`;
  const scriptPath = path.join(makeTempRepo(), 'voice-profile-frontmatter-check.mjs');
  fs.writeFileSync(
    scriptPath,
    `import { VoiceProfile } from ${JSON.stringify(path.resolve(process.cwd(), 'src/core/voice-profile.js'))};
const voice = VoiceProfile.fromDocument(${JSON.stringify(document)});
console.log(JSON.stringify(voice.summary()));
`,
  );

  const rawSummary = JSON.parse(execFileSync('node', [scriptPath], { encoding: 'utf8' }));

  assert.deepEqual(rawSummary, VoiceProfile.fromDocument(document).summary());
  assert.deepEqual(rawSummary, {
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

test('voice profile ignores admonition labels when finding the default tone', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '> [!NOTE]',
    '> Warm and grounded.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Warm and grounded.',
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

test('voice profile strips admonition labels inside structured sections', () => {
  const voice = VoiceProfile.fromDocument([
    '# Voice',
    '',
    '## Tone',
    '[!NOTE] Warm and grounded.',
    '',
    '## Signature moves',
    '- [!TIP] Use crisp examples.',
    '',
    '## Avoid',
    '- [!WARNING] Never pad the answer.',
    '',
    '## Language hints',
    '- [!IMPORTANT] Preserve bilingual phrasing when the source material switches languages.',
    '',
  ].join('\n'));

  assert.deepEqual(voice.summary(), {
    tone: 'Warm and grounded.',
    style: 'documented',
    constraints: ['Never pad the answer.'],
    signatures: ['Use crisp examples.'],
    languageHints: ['Preserve bilingual phrasing when the source material switches languages.'],
    constraintCount: 1,
    signatureCount: 1,
    languageHintCount: 1,
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

test('soul profile ignores admonition labels when finding the default excerpt', () => {
  const soul = SoulProfile.fromDocument([
    '# Soul',
    '',
    '> [!TIP]',
    '> Stay faithful to the source material.',
    '',
    '## Boundaries',
    '- Do not bluff certainty.',
    '',
  ].join('\n'));

  assert.deepEqual(soul.summary(), {
    excerpt: 'Stay faithful to the source material.',
    coreTruths: [],
    boundaries: ['Do not bluff certainty.'],
    vibe: [],
    continuity: [],
    coreTruthCount: 0,
    boundaryCount: 1,
    vibeLineCount: 0,
    continuityCount: 0,
    sectionCount: 1,
    hasGuidance: true,
  });
});

test('soul profile strips admonition labels inside structured sections', () => {
  const soul = SoulProfile.fromDocument([
    '# Soul',
    '',
    '## Core truths',
    '- [!NOTE] Stay faithful to the source material.',
    '',
    '## Boundaries',
    '- [!WARNING] Do not bluff certainty.',
    '',
    '## Vibe',
    '- [!TIP] Grounded and direct.',
    '',
    '## Continuity',
    '- [!IMPORTANT] Carry durable lessons forward.',
    '',
  ].join('\n'));

  assert.deepEqual(soul.summary(), {
    excerpt: 'Stay faithful to the source material.',
    coreTruths: ['Stay faithful to the source material.'],
    boundaries: ['Do not bluff certainty.'],
    vibe: ['Grounded and direct.'],
    continuity: ['Carry durable lessons forward.'],
    coreTruthCount: 1,
    boundaryCount: 1,
    vibeLineCount: 1,
    continuityCount: 1,
    sectionCount: 4,
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
  const soul = SoulProfile.fromDocument(`# Soul\n\nDurable posture.\n\n## Core truths\n1. Stay faithful to the source material.\n2) Prefer verified slices over big rewrites.\n\n## Boundaries\n1) Do not bluff certainty.\n\n## Vibe\n1) Grounded and direct.\n\n## Continuity\n1) Carry durable lessons forward.\n`);

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

test('soul profile parses blockquoted structured sections without leaking quote markers into the excerpt', () => {
  const soul = SoulProfile.fromDocument(`# Soul\n\n> ## Core truths\n> Stay faithful to the source material.\n> Prefer verified slices over big rewrites.\n>\n> ## Boundaries\n> - Do not bluff certainty.\n>\n> ## Vibe\n> - Grounded and direct.\n>\n> ## Continuity\n> - Carry durable lessons forward.\n`);

  assert.deepEqual(soul.summary(), {
    excerpt: 'Stay faithful to the source material.',
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

test('buildSummary treats blockquoted soul and voice docs as structured foundation guidance', () => {
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
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n> ## Core truths\n> Stay faithful.\n>\n> ## Boundaries\n> - Do not bluff certainty.\n>\n> ## Vibe\n> - Grounded and direct.\n>\n> ## Continuity\n> - Carry durable lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n> ## Tone\n> Warm and grounded.\n>\n> ## Signature moves\n> - Use crisp examples.\n>\n> ## Avoid\n> - Never pad the answer.\n>\n> ## Language hints\n> - Preserve bilingual phrasing when the source material switches languages.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.soul.structured, true);
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Stay faithful.');
  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.equal(summary.foundation.core.soul.readySectionCount, 4);
  assert.equal(summary.foundation.core.voice.structured, true);
  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Warm and grounded.');
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.match(summary.promptPreview, /- ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /- soul: present, 4 lines, Stay faithful\./);
  assert.doesNotMatch(summary.promptPreview, /- voice: present, 4 lines, Warm and grounded\./);
  assert.doesNotMatch(summary.promptPreview, />\s*## Tone/);
  assert.doesNotMatch(summary.promptPreview, />\s*## Core truths/);
});

test('buildSummary carries compact legacy short-term provenance into ready core foundation details', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'short-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'delivery'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n- legacy memory/short-term/ files are folded into daily/ during repo loading for compatibility with older repos\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-01.md'), 'legacy note one');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-02.md'), 'legacy note two');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-03.md'), 'legacy note three');
  fs.writeFileSync(path.join(rootDir, 'memory', 'short-term', '2026-04-04.md'), 'legacy note four');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n\n## What this skill is for\n- Deliver verified slices.\n\n## Suggested workflow\n- Run the smallest validating loop first.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff certainty.\n\n## Vibe\n- Grounded and direct.\n\n## Continuity\n- Carry durable lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\n- Warm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.memory.legacyShortTermSourceCount, 4);
  assert.deepEqual(summary.foundation.core.memory.legacyShortTermSampleSources, [
    'memory/short-term/2026-04-01.md',
    'memory/short-term/2026-04-02.md',
    'memory/short-term/2026-04-03.md',
  ]);
  assert.equal(summary.foundation.core.memory.legacyShortTermSourceOverflowCount, 1);
  assert.match(
    summary.promptPreview,
    /- ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent; legacy short-term sources memory\/short-term\/2026-04-01\.md, memory\/short-term\/2026-04-02\.md, memory\/short-term\/2026-04-03\.md, \+1 more, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(delivery\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/,
  );
  assert.doesNotMatch(summary.promptPreview, /memory\/short-term\/2026-04-04\.md/);
});

test('buildSummary carries the richer foundation layer summaries at top level', () => {
  const rootDir = makeTempRepo();
  seedMinimalRepo(rootDir);

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.memory, {
    dailyEntries: 1,
    longTermEntries: 1,
    scratchEntries: 0,
    totalEntries: 2,
    dailyPresent: true,
    longTermPresent: true,
    scratchPresent: false,
    shortTermEntries: 1,
    shortTermPresent: true,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
    readyBucketCount: 2,
    totalBucketCount: 3,
    populatedBuckets: ['daily', 'long-term'],
    emptyBuckets: ['scratch'],
  });

  assert.deepEqual(summary.foundation.core.memory, {
    hasRootDocument: true,
    rootPath: 'memory/README.md',
    rootExcerpt: 'Durable repo knowledge and operator context.',
    rootMissingSections: [],
    rootReadySections: ['what-belongs-here', 'buckets'],
    rootReadySectionCount: 2,
    rootTotalSectionCount: 2,
    canonicalShortTermBucket: 'daily',
    legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    legacyShortTermSourceCount: 0,
    legacyShortTermSources: [],
    legacyShortTermSampleSources: [],
    legacyShortTermSourceOverflowCount: 0,
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
  assert.equal(summary.foundation.core.skills.rootReadySectionCount, undefined);
  assert.equal(summary.foundation.core.skills.rootTotalSectionCount, undefined);
  assert.match(summary.promptPreview, /Soul profile:\n- excerpt: Serve faithfully\.\n- core truths: 0\n- boundaries: 0\n- vibe: 0\n- continuity: 0/);
  assert.match(summary.promptPreview, /Voice profile:\n- tone: Warm and grounded\.\n- style: documented\n- constraints: 1 \(Never pad the answer\.\)\n- signatures: 2 \(Use crisp examples\.; Close with a concrete next step\.\)\n- language hints: 1 \(Preserve bilingual phrasing when the source material switches languages\.\)/);
  assert.match(summary.promptPreview, /Memory store:\n- daily: 1\n- long-term: 1\n- scratch: 0\n- total: 2\n- buckets: 2\/3 ready \(daily, long-term\), missing scratch\n- aliases: daily canonical via shortTermEntries, shortTermPresent/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 1\n- discovered: 1\n- custom: 0\n- top skills: delivery \[discovered, thin\]/);
  assert.doesNotMatch(summary.promptPreview, /"constraints": \[/);
  assert.match(summary.promptPreview, /coverage: 1\/4 ready; thin memory, skills, soul/);
  assert.match(summary.promptPreview, /- memory: README yes, daily 1, long-term 1, scratch 0; buckets 2\/3 ready \(daily, long-term\), missing scratch; aliases daily canonical via shortTermEntries, shortTermPresent; samples: daily\/today\.md, long-term\/stable\.md; root: Durable repo knowledge and operator context\. @ memory\/README\.md; root sections 2\/2 ready \(what-belongs-here, buckets\)/);
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
    /Skill registry:\n- total: 4\n- discovered: 4\n- custom: 0\n- root: Shared repo skill guidance\. @ skills\/README\.md\n- root sections: 2\/2 ready \(what-lives-here, layout\)\n- top skills: delivery \[discovered\]: Deliver verified slices\.; foundation \[discovered\]: Keep the OpenClaw-style foundation aligned\.; intake \[discovered\]: Refresh target-person intake summaries\.; \+1 more/,
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
    /Skill registry:\n- total: 3\n- discovered: 3\n- custom: 0\n- root: Shared repo skill guidance\. @ skills\/README\.md\n- root sections: 2\/2 ready \(what-lives-here, layout\)\n- top skills: delivery \[discovered\]: Deliver verified slices\.; foundation \[discovered\]: Keep the OpenClaw-style foundation aligned\.; alpha \[discovered, missing\]/,
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

test('buildSummary discovers nested skill directories as leaf skills instead of collapsing them into category placeholders', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'channels', 'slack'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'providers', 'openai'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'ideas.md'), 'idea');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n- skills/<category>/<name>/SKILL.md keeps larger registries organized.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'channels', 'slack', 'SKILL.md'),
    '---\ndescription: Deliver concise Slack thread updates.\n---\n\n## What this skill is for\n- Deliver concise Slack thread updates.\n\n## Suggested workflow\n- Reuse the narrowest thread reply helper first.\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.skills.skillCount, 2);
  assert.deepEqual(summary.skills.categoryCounts, {
    channels: 1,
    providers: 1,
  });
  assert.deepEqual(summary.foundation.core.skills.categoryCounts, {
    channels: 1,
    providers: 1,
  });
  assert.deepEqual(summary.foundation.core.skills.documentedCategoryCounts, {
    channels: 1,
  });
  assert.match(
    summary.promptPreview,
    /Skill registry:\n- total: 2\n- discovered: 2\n- custom: 0\n- root: Shared repo skill guidance\. @ skills\/README\.md\n- root sections: 2\/2 ready \(what-lives-here, layout\)\n- top skills: channels\/slack \[discovered\]: Deliver concise Slack thread updates\.; providers\/openai \[discovered, missing\]/,
  );
  assert.match(summary.promptPreview, /- categories: channels 1, providers 1/);
  assert.equal(summary.foundation.core.skills.documentedCount, 1);
  assert.equal(summary.foundation.core.skills.undocumentedCount, 1);
  assert.deepEqual(summary.foundation.core.skills.samplePaths, ['skills/channels/slack/SKILL.md']);
  assert.deepEqual(summary.foundation.core.skills.undocumentedPaths, ['skills/providers/openai/SKILL.md']);
  assert.match(summary.promptPreview, /docs: skills\/channels\/slack\/SKILL\.md/);
  assert.match(summary.promptPreview, /missing docs: providers\/openai/);
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
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Vibe\n- Stay grounded.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\n## What lives here\n- Shared repo guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\n## What this skill is for\n- Use scheduled follow-ups carefully.\n\n## Suggested workflow\n- Add the exact recurring command.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory.rootReadySections, []);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, ['what-belongs-here', 'buckets']);
  assert.equal(summary.foundation.core.memory.rootReadySectionCount, 0);
  assert.equal(summary.foundation.core.memory.rootTotalSectionCount, 2);
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
      rootThinMissingSections: ['what-belongs-here', 'buckets'],
      rootThinReadySectionCount: 0,
      rootThinTotalSectionCount: 2,
      command: summary.foundation.core.maintenance.helperCommands.memory,
    },
  ]);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin memory/);
  assert.match(summary.promptPreview, /memory \[thin\]: add missing sections to memory\/README\.md: what-belongs-here, buckets @ memory\/README\.md; context root sections 0\/2 ready, missing what-belongs-here, buckets/);
  assert.match(summary.promptPreview, /memory: README yes, daily 1, long-term 1, scratch 1; buckets 3\/3 ready \(daily, long-term, scratch\); aliases daily canonical via shortTermEntries, shortTermPresent; samples: daily\/today\.md, long-term\/stable\.md, scratch\/draft\.md; root: Keep durable memory organized by horizon\. @ memory\/README\.md; root sections 0\/2 ready, missing what-belongs-here, buckets/);
});

test('buildSummary marks skills as thin when skills README lacks structured sections', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.md'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Vibe\n- Stay grounded.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'README.md'), '# Skills\n\nShared repo skill guidance.\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\n## What this skill is for\n- Use scheduled follow-ups carefully.\n\n## Suggested workflow\n- Add the exact recurring command.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.skills.rootReadySections, []);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, ['what-lives-here', 'layout']);
  assert.equal(summary.foundation.core.skills.rootReadySectionCount, 0);
  assert.equal(summary.foundation.core.skills.rootTotalSectionCount, 2);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['skills']);
  assert.equal(summary.foundation.core.maintenance.recommendedArea, 'skills');
  assert.equal(summary.foundation.core.maintenance.recommendedAction, 'add missing sections to skills/README.md: what-lives-here, layout');
  assert.deepEqual(summary.foundation.core.maintenance.recommendedPaths, ['skills/README.md']);
  assert.deepEqual(summary.foundation.core.maintenance.queuedAreas, [
    {
      area: 'skills',
      status: 'thin',
      summary: '1 registered, 1 documented, root 0/2 sections ready, missing what-lives-here, layout',
      action: 'add missing sections to skills/README.md: what-lives-here, layout',
      paths: ['skills/README.md'],
      thinPaths: ['skills/README.md'],
      rootThinMissingSections: ['what-lives-here', 'layout'],
      rootThinReadySectionCount: 0,
      rootThinTotalSectionCount: 2,
      command: summary.foundation.core.maintenance.helperCommands.skills,
    },
  ]);
  assert.match(summary.promptPreview, /coverage: 3\/4 ready; thin skills/);
  assert.match(summary.promptPreview, /skills \[thin\]: add missing sections to skills\/README\.md: what-lives-here, layout @ skills\/README\.md/);
  assert.match(summary.promptPreview, /skills: 1 registered, 1 documented \(cron\); root: Shared repo skill guidance\. @ skills\/README\.md; root sections 0\/2 ready, missing what-lives-here, layout; docs: skills\/cron\/SKILL\.md; excerpts: cron: Use scheduled follow-ups carefully\./);
});

test('buildSummary treats blockquoted memory sections and setext skills sections as ready root guidance', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n<!--\n## What belongs here\n- Hidden placeholder should stay invisible.\n-->\n\n> ## What belongs here\n> - Durable repo knowledge and operator context.\n>\n> ## Buckets\n> - daily/: short-lived run notes\n> - long-term/: durable facts and conventions\n> - scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', 'today.md'), 'note');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'stable.md'), 'fact');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'draft.md'), 'temp');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing.\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n\n## Boundaries\n- Do not bluff.\n\n## Vibe\n- Stay grounded.\n\n## Continuity\n- Carry lessons forward.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\nWhat lives here\n---------------\n- Shared repo skill guidance.\n\nLayout\n------\n- skills/<name>/SKILL.md documents a reusable workflow.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'cron', 'SKILL.md'), '# Cron\n\n## What this skill is for\n- Use scheduled follow-ups carefully.\n\n## Suggested workflow\n- Add the exact recurring command.\n');

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.foundation.core.memory.rootReadySections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, []);
  assert.equal(summary.foundation.core.memory.rootReadySectionCount, 2);
  assert.equal(summary.foundation.core.memory.rootTotalSectionCount, 2);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.equal(summary.foundation.core.skills.rootReadySectionCount, 2);
  assert.equal(summary.foundation.core.skills.rootTotalSectionCount, 2);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, []);
  assert.match(summary.promptPreview, /ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 1\/1 \(cron\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
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
  assert.deepEqual(summary.foundation.core.soul.missingSections, ['boundaries', 'vibe', 'continuity']);
  assert.equal(summary.foundation.core.soul.readySectionCount, 1);
  assert.equal(summary.foundation.core.voice.rootPath, 'voice/README.md');
  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Warm and grounded.');
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone']);
  assert.equal(summary.foundation.core.voice.readySectionCount, 1);
  assert.equal(summary.foundation.core.voice.totalSectionCount, 4);
  assert.deepEqual(summary.foundation.core.voice.missingSections, ['signature-moves', 'avoid', 'language-hints']);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 1);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['skills', 'soul', 'voice']);
  assert.deepEqual(summary.foundation.core.overview.recommendedActions, [
    'add missing sections to skills/README.md: what-lives-here, layout',
    'add missing sections to SOUL.md: boundaries, vibe, continuity',
    'add missing sections to voice/README.md: signature-moves, avoid, language-hints',
  ]);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /SOUL\.md/);
  assert.doesNotMatch(summary.foundation.core.maintenance.helperCommands.soul ?? '', /if grep -Eq/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /node --input-type=module -e/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /## Vibe/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /## Continuity/);
  assert.match(summary.foundation.core.maintenance.helperCommands.soul ?? '', /decision rules/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /voice\/README\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Signature moves/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Avoid/);
  assert.match(summary.foundation.core.maintenance.helperCommands.voice ?? '', /## Language hints/);
  assert.match(summary.promptPreview, /- soul: present, 1 lines, Stay faithful\. @ SOUL\.md, sections 1\/4 ready \(core-truths\), missing boundaries, vibe, continuity/);
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
  assert.deepEqual(summary.foundation.core.soul.readySections, []);
  assert.deepEqual(summary.foundation.core.soul.missingSections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.equal(summary.foundation.core.soul.readySectionCount, 0);
  assert.equal(summary.foundation.core.soul.rootExcerpt, 'Stay faithful after the hidden scaffold.');
  assert.equal(summary.foundation.core.voice.structured, false);
  assert.deepEqual(summary.foundation.core.voice.readySections, []);
  assert.deepEqual(summary.foundation.core.voice.missingSections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.equal(summary.foundation.core.voice.readySectionCount, 0);
  assert.equal(summary.foundation.core.voice.rootExcerpt, 'Stay direct after the hidden scaffold.');
  assert.equal(summary.foundation.core.overview.readyAreaCount, 2);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['soul', 'voice']);
  assert.deepEqual(summary.foundation.core.overview.missingAreas, []);
  assert.match(summary.promptPreview, /- soul: present, 1 lines, Stay faithful after the hidden scaffold\. @ SOUL\.md, sections 0\/4 ready, missing core-truths, boundaries, vibe, continuity/);
  assert.match(summary.promptPreview, /- voice: present, 1 lines, Stay direct after the hidden scaffold\. @ voice\/README\.md, sections 0\/4 ready, missing tone, signature-moves, avoid, language-hints/);
  assert.doesNotMatch(summary.promptPreview, /- ready details: .*soul sections 4\/4/);
  assert.doesNotMatch(summary.promptPreview, /- ready details: .*voice sections 4\/4/);
});

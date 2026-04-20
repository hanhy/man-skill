import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSummary, runImportCommand, runUpdateCommand } from '../src/index.js';

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'man-skill-work-loop-'));
}

function seedReadyFoundationRepo(rootDir: string) {
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });

  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Daily note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'repo.md'), 'Long-term note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'next.md'), 'Scratch note.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\n## What this skill is for\n- Use cron carefully.\n\n## Suggested workflow\n- Add the exact recurring command.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core truths\n- Stay faithful to the source material.\n\n## Boundaries\n- Do not bluff or overspeculate.\n\n## Vibe\n- Keep the tone grounded and direct.\n\n## Continuity\n- Preserve durable lessons across runs.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'voice', 'README.md'),
    '# Voice\n\n## Tone\nWarm and grounded.\n\n## Signature moves\n- Use crisp examples.\n\n## Avoid\n- Never pad the answer.\n\n## Language hints\n- Preserve bilingual phrasing when the source material switches languages.\n',
  );
}

function writeFullDeliveryEnv(rootDir: string, fileName: '.env' | '.env.example' = '.env.example') {
  fs.writeFileSync(path.join(rootDir, fileName), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    'OPENAI_API_KEY=***',
    'ANTHROPIC_API_KEY=***',
    'KIMI_API_KEY=***',
    'MINIMAX_API_KEY=***',
    'GLM_API_KEY=***',
    'QWEN_API_KEY=***',
    '',
  ].join('\n'));
}

function seedRuntimeReadyDeliveryRepo(rootDir: string) {
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'channels.json'), path.join(rootDir, 'manifests', 'channels.json'));
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'providers.json'), path.join(rootDir, 'manifests', 'providers.json'));
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  ['slack', 'telegram', 'whatsapp', 'feishu'].forEach((channelId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'channels', `${channelId}.js`),
      path.join(rootDir, 'src', 'channels', `${channelId}.js`),
    );
  });
  fs.mkdirSync(path.join(rootDir, 'src', 'models'), { recursive: true });
  ['openai', 'anthropic', 'kimi', 'minimax', 'glm', 'qwen'].forEach((providerId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'models', `${providerId}.js`),
      path.join(rootDir, 'src', 'models', `${providerId}.js`),
    );
  });
}

function markManifestEntriesActive(rootDir: string, relativeManifestPath: string) {
  const manifestPath = path.join(rootDir, relativeManifestPath);
  const records = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      Array.isArray(records)
        ? records.map((record) => ({
          ...record,
          status: 'active',
        }))
        : records,
      null,
      2,
    ),
  );
}

test('buildSummary work loop advances to ingestion when the base foundation is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.priorityCount, 4);
  assert.equal(summary.workLoop.readyPriorityCount, 1);
  assert.equal(summary.workLoop.queuedPriorityCount, 3);
  assert.equal(summary.workLoop.blockedPriorityCount, 0);
  assert.equal(summary.workLoop.leadingPriority?.id, 'foundation');
  assert.equal(summary.workLoop.leadingPriority?.status, 'ready');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.command, 'node src/index.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"');
  assert.match(summary.workLoop.currentPriority.summary, /0 imported/);
  assert.deepEqual(summary.workLoop.objectives, [
    'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
    'improve the user-facing ingestion/update entrance for target-person materials',
    'add chat channels Feishu, Telegram, WhatsApp, and Slack',
    'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
    'report progress in small verified increments',
  ]);
  assert.deepEqual(
    summary.workLoop.priorities.map((priority: { id: string }) => priority.id),
    ['foundation', 'ingestion', 'channels', 'providers'],
  );
  assert.equal(summary.workLoop.priorities[0].status, 'ready');
  assert.match(summary.workLoop.priorities[2].summary, /4 pending, 0 configured, 4 auth-blocked/);
  assert.deepEqual(summary.workLoop.priorities[2].paths, ['manifests/channels.json', 'src/channels/slack.js']);
  assert.match(summary.workLoop.priorities[3].summary, /6 pending, 0 configured, 6 auth-blocked/);
  assert.deepEqual(summary.workLoop.priorities[3].paths, ['manifests/providers.json', 'src/models/openai.js']);
  assert.match(summary.promptPreview, /Work loop:/);
  assert.match(summary.promptPreview, /priorities: 4 total \(1 ready, 3 queued\)/);
  assert.match(summary.promptPreview, /lead: Foundation \[ready\] — core 4\/4 ready; profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 0 imported, 0 metadata-only, drafts 0 ready, 0 queued for refresh/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person <person-id> --display-name "<Display Name>" --summary "<Short summary>"/);
  assert.match(summary.promptPreview, /objectives: strengthen the OpenClaw-like foundation around memory, skills, soul, and voice \| improve the user-facing ingestion\/update entrance for target-person materials \| add chat channels Feishu, Telegram, WhatsApp, and Slack \| add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen \| report progress in small verified increments/);
  assert.match(summary.promptPreview, /order: foundation:ready \| ingestion:queued \| channels:queued \| providers:queued/);
});

test('buildSummary work loop keeps foundation current when soul and voice docs only contain unstructured prose after hidden scaffolds', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'long-term'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'memory', 'scratch'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'cron'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'voice'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'memory', 'README.md'),
    '# Memory\n\n## What belongs here\n- Durable repo knowledge and operator context.\n\n## Buckets\n- daily/: short-lived run notes\n- long-term/: durable facts and conventions\n- scratch/: in-flight ideas to refine or promote\n',
  );
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Daily note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'repo.md'), 'Long-term note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'next.md'), 'Scratch note.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n',
  );
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'cron', 'SKILL.md'),
    '# Cron\n\n## What this skill is for\n- Use cron carefully.\n\n## Suggested workflow\n- Add the exact recurring command.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n<!--\n## Core truths\n- Hidden placeholder should not count.\n## Boundaries\n- Hidden placeholder should not count.\n## Continuity\n- Hidden placeholder should not count.\n-->\n\nStay faithful after the hidden scaffold.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n<!--\n## Tone\nMuted placeholder.\n## Signature moves\n- Hidden placeholder should not count.\n## Avoid\n- Hidden placeholder should not count.\n## Language hints\n- Hidden placeholder should not count.\n-->\n\nStay direct after the hidden scaffold.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.leadingPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.match(summary.workLoop.currentPriority.summary, /core 2\/4 ready \(2 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.workLoop.currentPriority.nextAction ?? '', /repair thin core foundation areas — starting with add missing sections to SOUL\.md: core-truths, boundaries, vibe, continuity/);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, ['soul', 'voice']);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 2\/4 ready \(2 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /soul \[thin\]: add missing sections to SOUL\.md: core-truths, boundaries, vibe, continuity @ SOUL\.md; context root sections 0\/4 ready, missing core-truths, boundaries, vibe, continuity/);
  assert.match(summary.promptPreview, /voice \[thin\]: add missing sections to voice\/README\.md: tone, signature-moves, avoid, language-hints @ voice\/README\.md; context root sections 0\/4 ready, missing tone, signature-moves, avoid, language-hints/);
  assert.doesNotMatch(summary.promptPreview, /current: Ingestion \[queued\]/);
});

test('buildSummary loads work-loop objectives from USER.md when the repo defines a current product direction', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction',
      '',
      'The current staged goal is to build ManSkill step by step with four priorities:',
      '',
      '1. harden the memory + soul handoff before delivery rollout',
      '2. make intake reruns safe for partially imported profiles',
      '3. ship Telegram before the other chat surfaces',
      '4. validate Anthropic before broad provider expansion',
      '',
      '## Usage notes',
      '',
      'Keep this file durable.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'harden the memory + soul handoff before delivery rollout',
    'make intake reruns safe for partially imported profiles',
    'ship Telegram before the other chat surfaces',
    'validate Anthropic before broad provider expansion',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: harden the memory \+ soul handoff before delivery rollout \| make intake reruns safe for partially imported profiles \| ship Telegram before the other chat surfaces \| validate Anthropic before broad provider expansion \| report progress in small verified increments/);
});

test('buildSummary loads work-loop objectives from USER.md when the current product direction heading uses closing hashes', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction ##',
      '',
      '1. keep the repo-core memory and skills docs synchronized',
      '2. make imported intake backfills visible before delivery rollout',
      '3. keep Slack queued until Telegram is runtime-ready',
      '4. stage OpenAI before the rest of the provider set',
      '',
      '## Notes ##',
      '',
      'Do not let this prose leak into the objective list.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'keep the repo-core memory and skills docs synchronized',
    'make imported intake backfills visible before delivery rollout',
    'keep Slack queued until Telegram is runtime-ready',
    'stage OpenAI before the rest of the provider set',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: keep the repo-core memory and skills docs synchronized \| make imported intake backfills visible before delivery rollout \| keep Slack queued until Telegram is runtime-ready \| stage OpenAI before the rest of the provider set \| report progress in small verified increments/);
});

test('buildSummary loads work-loop objectives from USER.md when the current product direction heading uses setext markdown', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      'Current product direction',
      '-------------------------',
      '',
      '1. harden the OpenClaw-like soul and voice layer first',
      '2. keep metadata-only intake reruns explicit and safe',
      '3. bring Feishu online after the core chat surfaces stabilize',
      '4. validate Qwen after the primary provider adapters stay green',
      '',
      'Usage notes',
      '-----------',
      '',
      'Keep this durable.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'harden the OpenClaw-like soul and voice layer first',
    'keep metadata-only intake reruns explicit and safe',
    'bring Feishu online after the core chat surfaces stabilize',
    'validate Qwen after the primary provider adapters stay green',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: harden the OpenClaw-like soul and voice layer first \| keep metadata-only intake reruns explicit and safe \| bring Feishu online after the core chat surfaces stabilize \| validate Qwen after the primary provider adapters stay green \| report progress in small verified increments/);
});

test('buildSummary loads work-loop objectives from USER.md when the current product direction heading is level-one ATX markdown', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '# Current product direction',
      '',
      '1. keep the memory + skills foundation explicit before more rollout work',
      '2. keep metadata-only intake refreshes obvious for imported profiles',
      '3. stage Slack after Telegram stays runtime-ready',
      '4. validate OpenAI before widening provider coverage',
      '',
      '# Usage notes',
      '',
      'Do not let this prose leak into the objective list.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'keep the memory + skills foundation explicit before more rollout work',
    'keep metadata-only intake refreshes obvious for imported profiles',
    'stage Slack after Telegram stays runtime-ready',
    'validate OpenAI before widening provider coverage',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: keep the memory \+ skills foundation explicit before more rollout work \| keep metadata-only intake refreshes obvious for imported profiles \| stage Slack after Telegram stays runtime-ready \| validate OpenAI before widening provider coverage \| report progress in small verified increments/);
});

test('buildSummary loads work-loop objectives from USER.md when the current product direction heading is nested and uses parenthesized numbering', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Planning notes',
      '',
      '### Current product direction',
      '',
      '1) keep the repo foundation guidance explicit before more rollout work',
      '2) keep intake updates obvious for partially imported profiles',
      '3) land WhatsApp after Slack and Telegram stay stable',
      '4) validate GLM after the primary provider adapters stay green',
      '',
      '### Notes',
      '',
      'Do not let this prose leak into the objective list.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'keep the repo foundation guidance explicit before more rollout work',
    'keep intake updates obvious for partially imported profiles',
    'land WhatsApp after Slack and Telegram stay stable',
    'validate GLM after the primary provider adapters stay green',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: keep the repo foundation guidance explicit before more rollout work \| keep intake updates obvious for partially imported profiles \| land WhatsApp after Slack and Telegram stay stable \| validate GLM after the primary provider adapters stay green \| report progress in small verified increments/);
});

test('buildSummary loads work-loop objectives from USER.md when the current product direction uses plain bullet items', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction',
      '',
      '- harden the memory + soul handoff before delivery rollout',
      '- make intake reruns safe for partially imported profiles',
      '- ship Telegram before the other chat surfaces',
      '- validate Anthropic before broad provider expansion',
      '',
      '## Usage notes',
      '',
      'Do not let this prose leak into the objective list.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'harden the memory + soul handoff before delivery rollout',
    'make intake reruns safe for partially imported profiles',
    'ship Telegram before the other chat surfaces',
    'validate Anthropic before broad provider expansion',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: harden the memory \+ soul handoff before delivery rollout \| make intake reruns safe for partially imported profiles \| ship Telegram before the other chat surfaces \| validate Anthropic before broad provider expansion \| report progress in small verified increments/);
});

test('buildSummary ignores commented and fenced placeholder objectives in USER.md current product direction', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction',
      '',
      '<!--',
      '1. placeholder foundation objective that should stay hidden',
      '2. placeholder ingestion objective that should stay hidden',
      '-->',
      '',
      '```md',
      '1. placeholder channel objective from a fenced example',
      '2. placeholder provider objective from a fenced example',
      '```',
      '',
      '1. keep the visible foundation queue honest',
      '2. keep intake reruns explicit for imported profiles',
      '3. ship Slack after the visible delivery helpers are solid',
      '4. validate OpenAI after the visible provider scaffolds stay green',
      '',
      '## Usage notes',
      '',
      'Only the visible numbered list should count.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'keep the visible foundation queue honest',
    'keep intake reruns explicit for imported profiles',
    'ship Slack after the visible delivery helpers are solid',
    'validate OpenAI after the visible provider scaffolds stay green',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: keep the visible foundation queue honest \| keep intake reruns explicit for imported profiles \| ship Slack after the visible delivery helpers are solid \| validate OpenAI after the visible provider scaffolds stay green \| report progress in small verified increments/);
  assert.doesNotMatch(summary.promptPreview, /placeholder foundation objective/);
  assert.doesNotMatch(summary.promptPreview, /placeholder channel objective/);
});

test('buildSummary loads work-loop objectives from task-list items in USER.md current product direction', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction',
      '',
      '- [ ] harden the memory + voice bridge before rollout',
      '- [x] make intake reruns safe for partially imported profiles',
      '- [ ] land Telegram before Slack and WhatsApp',
      '- [ ] validate Anthropic before broad provider expansion',
      '',
      '## Usage notes',
      '',
      'Still a durable file.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'harden the memory + voice bridge before rollout',
    'make intake reruns safe for partially imported profiles',
    'land Telegram before Slack and WhatsApp',
    'validate Anthropic before broad provider expansion',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: harden the memory \+ voice bridge before rollout \| make intake reruns safe for partially imported profiles \| land Telegram before Slack and WhatsApp \| validate Anthropic before broad provider expansion \| report progress in small verified increments/);
});

test('buildSummary accepts starred and plus task-list objectives in USER.md current product direction', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction',
      '',
      '* [ ] keep soul and voice guidance in lockstep',
      '+ [x] keep intake reruns explicit for imported profiles',
      '* [ ] stage Slack after Telegram stays stable',
      '+ [ ] validate OpenAI before widening provider coverage',
      '',
      '## Usage notes',
      '',
      'Still a durable file.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'keep soul and voice guidance in lockstep',
    'keep intake reruns explicit for imported profiles',
    'stage Slack after Telegram stays stable',
    'validate OpenAI before widening provider coverage',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: keep soul and voice guidance in lockstep \| keep intake reruns explicit for imported profiles \| stage Slack after Telegram stays stable \| validate OpenAI before widening provider coverage \| report progress in small verified increments/);
});

test('buildSummary falls back to the default work-loop objectives when USER.md has no numbered product direction items', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(
    path.join(rootDir, 'USER.md'),
    [
      '# USER.md - About Your Human',
      '',
      '## Current product direction',
      '',
      'Keep the staging order durable, but do not enumerate it here yet.',
      '',
      '## Usage notes',
      '',
      'Still a durable file.',
      '',
    ].join('\n'),
  );

  const summary = buildSummary(rootDir);

  assert.deepEqual(summary.workLoop.objectives, [
    'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
    'improve the user-facing ingestion/update entrance for target-person materials',
    'add chat channels Feishu, Telegram, WhatsApp, and Slack',
    'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
    'report progress in small verified increments',
  ]);
  assert.equal(summary.workLoop.objectiveCount, 5);
  assert.match(summary.promptPreview, /objectives: strengthen the OpenClaw-like foundation around memory, skills, soul, and voice \| improve the user-facing ingestion\/update entrance for target-person materials \| add chat channels Feishu, Telegram, WhatsApp, and Slack \| add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen \| report progress in small verified increments/);
});

test('buildSummary work loop keeps foundation first when repo-core coverage is still thin', () => {
  const rootDir = makeTempRepo();
  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Only one bucket seeded.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.match(summary.workLoop.currentPriority.summary, /core .* ready/i);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold missing or thin core foundation areas — starting with create memory/README.md | add at least one entry under memory/long-term and memory/scratch');
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.core.maintenance.helperCommands.scaffoldAll);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['memory/README.md', 'memory/long-term', 'memory/scratch', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md']);
  assert.equal(summary.workLoop.priorities[1].status, 'queued');
  assert.match(summary.workLoop.currentPriority.summary, /core 0\/4 ready \(1 thin, 3 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 0\/4 ready \(1 thin, 3 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.doesNotMatch(summary.promptPreview, /lead: Foundation \[queued\]/);
  assert.match(summary.promptPreview, /paths: memory\/README\.md, memory\/long-term, memory\/scratch/);
});

test('buildSummary work loop uses missing-only foundation helper bundles when multiple core areas are absent', () => {
  const rootDir = makeTempRepo();
  fs.writeFileSync(
    path.join(rootDir, 'SOUL.md'),
    '# Soul\n\n## Core truths\n- Stay faithful to the source material.\n\n## Boundaries\n- Do not bluff or overspeculate.\n\n## Vibe\n- Keep the tone grounded and direct.\n\n## Continuity\n- Preserve durable lessons across runs.\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.core.maintenance.helperCommands.scaffoldMissing);
  assert.match(summary.workLoop.currentPriority.nextAction, /^scaffold missing core foundation areas — starting with /);
  assert.match(summary.promptPreview, /next action: scaffold missing core foundation areas — starting with /);
});

test('buildSummary work loop uses thin-only foundation helper bundles when multiple core areas need repairs', () => {
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
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Daily note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'long-term', 'repo.md'), 'Long-term note.\n');
  fs.writeFileSync(path.join(rootDir, 'memory', 'scratch', 'next.md'), 'Scratch note.\n');
  fs.writeFileSync(
    path.join(rootDir, 'skills', 'README.md'),
    '# Skills\n\n## What lives here\n- Shared repo skill guidance.\n\n## Layout\n- skills/<name>/SKILL.md documents a reusable workflow.\n',
  );
  fs.writeFileSync(path.join(rootDir, 'skills', 'delivery', 'SKILL.md'), '# Delivery\n');
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), '# Soul\n\n## Core truths\n- Stay faithful.\n');
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), '# Voice\n\n## Tone\nWarm and grounded.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.match(summary.foundation.core.maintenance.helperCommands.scaffoldThin ?? '', /skills\/delivery\/SKILL\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.scaffoldThin ?? '', /voice\/README\.md/);
  assert.match(summary.foundation.core.maintenance.helperCommands.scaffoldThin ?? '', /SOUL\.md/);
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.core.maintenance.helperCommands.scaffoldThin);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'repair thin core foundation areas — starting with add missing sections to skills/delivery/SKILL.md: what-this-skill-is-for, suggested-workflow');
  assert.match(summary.promptPreview, /next action: repair thin core foundation areas — starting with add missing sections to skills\/delivery\/SKILL\.md: what-this-skill-is-for, suggested-workflow/);
});

test('buildSummary work loop keeps foundation current when memory README is structurally thin', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, 'memory', 'README.md'), '# Memory\n\nKeep durable memory organized by horizon.\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'add missing sections to memory/README.md: what-belongs-here, buckets');
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.core.maintenance.helperCommands.memory);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['memory/README.md']);
  assert.match(summary.workLoop.currentPriority.summary, /core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 3\/4 ready \(1 thin, 0 missing\); profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /next action: add missing sections to memory\/README\.md: what-belongs-here, buckets/);
  assert.match(summary.promptPreview, /command: node -e 'const fs = require\('/);
  assert.match(summary.promptPreview, /paths: memory\/README\.md/);
});

test('buildSummary treats nested soul and voice structured headings as ready foundation guidance', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, 'SOUL.md'), [
    '# Soul',
    '',
    'Durable posture.',
    '',
    '## Foundation posture',
    '',
    '### Core truths',
    '- Stay faithful to the source material.',
    '',
    '### Boundaries',
    '- Do not bluff certainty.',
    '',
    '### Vibe',
    '- Stay grounded and practical.',
    '',
    '### Continuity',
    '- Carry durable lessons forward.',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(rootDir, 'voice', 'README.md'), [
    '# Voice',
    '',
    'Stay direct.',
    '',
    '## House style',
    '',
    '### Tone',
    'Warm and grounded.',
    '',
    '### Signature moves',
    '- Use crisp examples.',
    '',
    '### Avoid',
    '- Never pad the answer.',
    '',
    '### Language hints',
    '- Preserve bilingual phrasing when the source material switches languages.',
    '',
  ].join('\n'));

  const summary = buildSummary(rootDir);

  assert.equal(summary.foundation.core.soul.readySectionCount, 4);
  assert.deepEqual(summary.foundation.core.soul.missingSections, []);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.workLoop.leadingPriority?.id, 'foundation');
  assert.equal(summary.workLoop.leadingPriority?.status, 'ready');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.match(summary.promptPreview, /lead: Foundation \[ready\] — core 4\/4 ready; profiles 0 queued for refresh, 0 incomplete/);
});

test('buildSummary work loop prefers the checked-in sample manifest when the repo is otherwise ready for first imports', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-chat.png'), 'fake image bytes');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'harry-post.txt',
        },
        {
          type: 'screenshot',
          file: 'harry-chat.png',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.deepEqual(summary.ingestion.sampleManifestProfileLabels, ['Harry Han (harry-han)']);
  assert.equal(summary.ingestion.sampleStarterLabel, 'Harry Han (harry-han)');
  assert.deepEqual(summary.ingestion.sampleManifestFilePaths, ['samples/harry-post.txt', 'samples/harry-chat.png']);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import the checked-in sample target profile for Harry Han (harry-han)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'samples/harry-materials.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json', 'samples/harry-post.txt', 'samples/harry-chat.png']);
  assert.match(summary.promptPreview, /next action: import the checked-in sample target profile for Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'samples\/harry-materials\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/harry-materials\.json, samples\/harry-post\.txt, samples\/harry-chat\.png/);
});

test('buildSummary work loop uses plural wording when the checked-in sample manifest spans multiple starter profiles', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(path.join(rootDir, 'samples', 'jane-post.txt'), 'Refine tomorrow after we ship today.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      profiles: [
        { personId: 'Harry Han', displayName: 'Harry Han' },
        { personId: 'Jane Doe', displayName: 'Jane Doe' },
      ],
      entries: [
        {
          personId: 'Harry Han',
          type: 'text',
          file: 'harry-post.txt',
        },
        {
          personId: 'Jane Doe',
          type: 'text',
          file: 'jane-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleStarterLabel, 'Harry Han (harry-han), Jane Doe (jane-doe)');
  assert.deepEqual(summary.ingestion.sampleManifestFilePaths, ['samples/harry-post.txt', 'samples/jane-post.txt']);
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import the checked-in sample target profiles for Harry Han (harry-han), Jane Doe (jane-doe)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'samples/harry-materials.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json', 'samples/harry-post.txt', 'samples/jane-post.txt']);
  assert.match(summary.promptPreview, /next action: import the checked-in sample target profiles for Harry Han \(harry-han\), Jane Doe \(jane-doe\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'samples\/harry-materials\.json' --refresh-foundation/);
});

test('buildSummary work loop points first-run ingestion at an invalid checked-in sample manifest before generic bootstrap', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'fix the checked-in sample manifest for first imports');
  assert.equal(summary.workLoop.currentPriority.command, null);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/harry-materials.json']);
  assert.match(summary.promptPreview, /next action: fix the checked-in sample manifest for first imports/);
  assert.match(summary.promptPreview, /paths: samples\/harry-materials\.json/);
  assert.match(summary.promptPreview, /sample manifest invalid: .* @ samples\/harry-materials\.json/);
});

test('buildSummary work loop scaffolds intake before suggesting imports for metadata-only profiles', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold the intake landing zone for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports',
    'profiles/metadata-only/imports/README.md',
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: scaffold the intake landing zone for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports, profiles\/metadata-only\/imports\/README\.md, profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop completes partially scaffolded intake landing zones before suggesting imports', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'README.md'),
    '# Partial intake scaffold\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'complete the intake landing zone for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: complete the intake landing zone for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop prioritizes partially scaffolded intake profiles over fully missing ones', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'alpha-missing'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'alpha-missing', 'profile.json'),
    JSON.stringify({
      personId: 'alpha-missing',
      displayName: 'Alpha Missing',
      summary: 'No intake scaffold yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );

  fs.mkdirSync(path.join(rootDir, 'profiles', 'zeta-partial', 'imports'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'zeta-partial', 'profile.json'),
    JSON.stringify({
      personId: 'zeta-partial',
      displayName: 'Zeta Partial',
      summary: 'Needs the intake scaffold completed.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'zeta-partial', 'imports', 'README.md'),
    '# Partial intake scaffold\n',
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'complete incomplete intake landing zones — starting with Zeta Partial (zeta-partial)');
  assert.equal(
    summary.workLoop.currentPriority.command,
    "(node src/index.js update intake --person 'zeta-partial' --display-name 'Zeta Partial' --summary 'Needs the intake scaffold completed.') && (node src/index.js update intake --person 'alpha-missing' --display-name 'Alpha Missing' --summary 'No intake scaffold yet.')",
  );
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/zeta-partial/imports/materials.template.json',
    'profiles/zeta-partial/imports/sample.txt',
    'profiles/alpha-missing/imports',
    'profiles/alpha-missing/imports/README.md',
    'profiles/alpha-missing/imports/materials.template.json',
    'profiles/alpha-missing/imports/sample.txt',
  ]);
});

test('buildSummary work loop targets metadata-only profiles with their direct import command when one is runnable', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'metadata-only.txt'), 'Ship the thin slice first.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'metadata-only.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import text --person metadata-only --file 'samples/metadata-only.txt' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'samples/metadata-only-materials.json',
    'samples/metadata-only.txt',
  ]);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 0 imported, 1 metadata-only, drafts 0 ready, 0 queued for refresh/);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import text --person metadata-only --file 'samples\/metadata-only\.txt' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/metadata-only-materials\.json, samples\/metadata-only\.txt/);
});

test('buildSummary work loop prefers a matching sample screenshot import when no direct sample text is available', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'metadata-only-chat.png'), 'fake image bytes');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'screenshot',
          file: 'metadata-only-chat.png',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import screenshot --person metadata-only --file 'samples/metadata-only-chat.png' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'samples/metadata-only-materials.json',
    'samples/metadata-only-chat.png',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import screenshot --person metadata-only --file 'samples\/metadata-only-chat\.png' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/metadata-only-materials\.json, samples\/metadata-only-chat\.png/);
});

test('buildSummary work loop keeps the sample manifest path visible for matching inline message imports', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'message',
          text: 'Ship the first useful reply, then expand from real usage.',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import message --person metadata-only --text 'Ship the first useful reply, then expand from real usage.' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['samples/metadata-only-materials.json']);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import message --person metadata-only --text 'Ship the first useful reply, then expand from real usage\.' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: samples\/metadata-only-materials\.json/);
});

test('buildSummary work loop prefers a customized profile-local intake manifest over matching checked-in sample imports', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'metadata-only.txt'), 'Sample text that should yield to the customized profile-local intake manifest.');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'metadata-only.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'local-note.txt'), 'Use the profile-local intake manifest first.');
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'local-note.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
    'profiles/metadata-only/imports/local-note.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt, profiles\/metadata-only\/imports\/local-note\.txt/);
});

test('buildSummary work loop still scaffolds intake before inline sample talk imports become runnable', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'metadata-only-materials.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'talk',
          text: 'Ship the first slice from the sample manifest.',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold the intake landing zone for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.match(summary.promptPreview, /sample talk: metadata-only -> node src\/index\.js import talk --person metadata-only --text 'Ship the first slice from the sample manifest\.' --refresh-foundation/);
});

test('buildSummary work loop prefers the profile-local starter manifest over fallback sample manifests for metadata-only profiles', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'starter-post.txt'), 'Starter profile draft.\n');
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'starter-materials.json'),
    JSON.stringify({
      personId: 'starter-person',
      entries: [
        {
          type: 'text',
          file: 'starter-post.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop prefers the profile-local starter manifest once intake scaffolding is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt/);
});

test('buildSummary work loop ignores broken sample manifests when a profile-local starter manifest is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'samples', 'harry-materials.json'),
    JSON.stringify({
      personId: 'Harry Han',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
        },
      ],
    }, null, 2),
  );
  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.sampleManifestStatus, 'invalid');
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js import manifest --file 'profiles\/metadata-only\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.doesNotMatch(summary.promptPreview, /paths: samples\/harry-materials\.json/);
});

test('buildSummary work loop points at fixing an invalid ready intake manifest before import commands', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'metadata-only',
      entries: [
        {
          type: 'text',
          file: 'missing-post.txt',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands.find((profile: { personId: string }) => profile.personId === 'metadata-only');

  assert.equal(metadataOnlyCommand?.intakeReady, true);
  assert.equal(metadataOnlyCommand?.intakeManifestStatus, 'invalid');
  assert.equal(metadataOnlyCommand?.intakeStatusSummary, 'invalid manifest — repair materials.template.json');
  assert.equal(metadataOnlyCommand?.importIntakeCommand, null);
  assert.equal(metadataOnlyCommand?.importManifestCommand, null);
  assert.equal(metadataOnlyCommand?.importMaterialCommand, null);
  assert.equal(summary.ingestion.helperCommands.importIntakeBundle, null);
  assert.equal(summary.ingestion.invalidMetadataOnlyIntakeManifestProfileCount, 1);
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.summary, '0 imported, 1 metadata-only, drafts 0 ready, 0 queued for refresh, 1 invalid metadata-only intake manifest');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'repair the invalid intake manifest for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
  ]);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 0 imported, 1 metadata-only, drafts 0 ready, 0 queued for refresh, 1 invalid metadata-only intake manifest/);
  assert.match(summary.promptPreview, /next action: repair the invalid intake manifest for Metadata Only \(metadata-only\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json/);
});

test('buildSummary marks profile-local intake manifests invalid when they target a different metadata-only profile', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json'),
    JSON.stringify({
      personId: 'other-person',
      entries: [
        {
          type: 'message',
          text: 'This manifest should stay attached to the owning profile.',
        },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);
  const metadataOnlyCommand = summary.ingestion.metadataProfileCommands.find((profile: { personId: string }) => profile.personId === 'metadata-only');

  assert.equal(metadataOnlyCommand?.intakeReady, true);
  assert.equal(metadataOnlyCommand?.intakeManifestStatus, 'invalid');
  assert.match(metadataOnlyCommand?.intakeManifestError ?? '', /targets a different profile/i);
  assert.equal(metadataOnlyCommand?.intakeStatusSummary, 'invalid manifest — repair materials.template.json');
  assert.equal(metadataOnlyCommand?.importIntakeCommand, null);
  assert.equal(metadataOnlyCommand?.importManifestCommand, null);
  assert.equal(summary.ingestion.invalidMetadataOnlyIntakeManifestProfileCount, 1);
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'repair the invalid intake manifest for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
  ]);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 0 imported, 1 metadata-only, drafts 0 ready, 0 queued for refresh, 1 invalid metadata-only intake manifest/);
  assert.match(summary.promptPreview, /Metadata Only \(metadata-only\): 0 materials \(no typed materials\), intake invalid manifest — repair materials\.template\.json/);
});

test('buildSummary work loop repairs invalid intake manifests for imported profiles before moving on to delivery work', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  runUpdateCommand(rootDir, 'intake', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Direct operator with a bias for momentum.',
  });
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the first slice before polishing the plan.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
  });
  runUpdateCommand(rootDir, 'foundation', { person: 'harry-han' });
  fs.writeFileSync(path.join(rootDir, 'profiles', 'harry-han', 'imports', 'materials.template.json'), '{ invalid json\n');

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'repair the invalid intake manifest for imported profile Harry Han (harry-han)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum.'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/harry-han/imports/materials.template.json',
  ]);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\]/);
  assert.match(summary.promptPreview, /next action: repair the invalid intake manifest for imported profile Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.promptPreview, /paths: profiles\/harry-han\/imports\/materials\.template\.json/);
});

test('buildSummary work loop bundles imported invalid intake manifest repairs when multiple imported profiles are broken', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  for (const profile of [
    {
      person: 'harry-han',
      displayName: 'Harry Han',
      summary: 'Direct operator with a bias for momentum.',
      sampleFile: 'samples/harry-post.txt',
      sampleText: 'Ship the first slice before polishing the plan.\n',
    },
    {
      person: 'jane-doe',
      displayName: 'Jane Doe',
      summary: 'Fast feedback beats polished drift.',
      sampleFile: 'samples/jane-post.txt',
      sampleText: 'Turn sharp notes into an actual next step.\n',
    },
  ]) {
    runUpdateCommand(rootDir, 'profile', {
      person: profile.person,
      'display-name': profile.displayName,
      summary: profile.summary,
    });
    runUpdateCommand(rootDir, 'intake', {
      person: profile.person,
      'display-name': profile.displayName,
      summary: profile.summary,
    });
    fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, profile.sampleFile), profile.sampleText);
    runImportCommand(rootDir, 'text', {
      person: profile.person,
      file: path.join(rootDir, profile.sampleFile),
    });
    runUpdateCommand(rootDir, 'foundation', { person: profile.person });
    fs.writeFileSync(path.join(rootDir, 'profiles', profile.person, 'imports', 'materials.template.json'), '{ invalid json\n');
  }

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'repair invalid intake manifests for imported profiles — starting with Harry Han (harry-han)');
  assert.equal(summary.workLoop.currentPriority.command, summary.ingestion.repairImportedInvalidIntakeBundleCommand);
  assert.match(summary.workLoop.currentPriority.command ?? '', /node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum\.'/);
  assert.match(summary.workLoop.currentPriority.command ?? '', /node src\/index\.js update intake --person 'jane-doe' --display-name 'Jane Doe' --summary 'Fast feedback beats polished drift\.'/);
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/harry-han/imports/materials.template.json',
    'profiles/jane-doe/imports/materials.template.json',
  ]);
});

test('buildSummary work loop bundles metadata-only invalid intake manifest repairs when multiple starter manifests are broken', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  for (const profile of [
    {
      person: 'metadata-only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
    },
    {
      person: 'second-person',
      displayName: 'Second Person',
      summary: 'Another scaffold-first profile.',
    },
  ]) {
    runUpdateCommand(rootDir, 'profile', {
      person: profile.person,
      'display-name': profile.displayName,
      summary: profile.summary,
    });
    runUpdateCommand(rootDir, 'intake', {
      person: profile.person,
      'display-name': profile.displayName,
      summary: profile.summary,
    });
    fs.writeFileSync(path.join(rootDir, 'profiles', profile.person, 'imports', 'materials.template.json'), '{ invalid json\n');
  }

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'repair invalid profile-local intake manifests — starting with Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, summary.ingestion.repairInvalidIntakeBundleCommand);
  assert.match(summary.workLoop.currentPriority.command ?? '', /node src\/index\.js update intake --person 'metadata-only' --display-name 'Metadata Only' --summary 'Profile scaffold without imported materials yet\.'/);
  assert.match(summary.workLoop.currentPriority.command ?? '', /node src\/index\.js update intake --person 'second-person' --display-name 'Second Person' --summary 'Another scaffold-first profile\.'/);
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/second-person/imports/materials.template.json',
  ]);
});

test('update intake backs up invalid starter manifests before rebuilding the scaffold', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const invalidManifestPath = path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json');
  fs.writeFileSync(invalidManifestPath, '{ invalid json\n');

  const result = runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  assert.match(result.invalidStarterManifestBackupPath, /^profiles\/metadata-only\/imports\/materials\.template\.json\.invalid-.*\.bak$/);
  const backupPath = path.join(rootDir, result.invalidStarterManifestBackupPath);
  assert.equal(fs.readFileSync(backupPath, 'utf8'), '{ invalid json\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(invalidManifestPath, 'utf8')), {
    personId: 'metadata-only',
    displayName: 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
    entries: [],
    entryTemplates: {
      message: {
        type: 'message',
        text: '<paste a representative short message>',
        notes: 'chat sample',
      },
      screenshot: {
        type: 'screenshot',
        file: '<relative-path-to-image.png>',
        notes: 'chat screenshot',
      },
      talk: {
        type: 'talk',
        text: '<paste a transcript snippet>',
        notes: 'voice memo transcript',
      },
      text: {
        type: 'text',
        file: 'sample.txt',
        notes: 'long-form writing sample',
      },
    },
  });
});

test('update intake does not create invalid-json backups for parseable placeholder manifests', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const manifestPath = path.join(rootDir, 'profiles', 'metadata-only', 'imports', 'materials.template.json');
  fs.writeFileSync(manifestPath, 'null\n');

  const result = runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  assert.equal(result.invalidStarterManifestBackupPath, null);
  const intakeDirEntries = fs.readdirSync(path.join(rootDir, 'profiles', 'metadata-only', 'imports')).sort();
  assert.equal(intakeDirEntries.some((entry) => entry.includes('.invalid-')), false);
});

test('buildSummary work loop includes manifest-backed file assets when a ready intake manifest is the next import step', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'profiles', 'metadata-only'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'profiles', 'metadata-only', 'profile.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      displayName: 'Metadata Only',
      summary: 'Profile scaffold without imported materials yet.',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }, null, 2),
  );
  runUpdateCommand(rootDir, 'intake', {
    person: 'metadata-only',
    'display-name': 'Metadata Only',
    summary: 'Profile scaffold without imported materials yet.',
  });

  const intakeDir = path.join(rootDir, 'profiles', 'metadata-only', 'imports');
  fs.writeFileSync(path.join(intakeDir, 'metadata-shot.png'), 'fake screenshot bytes\n');
  fs.writeFileSync(
    path.join(intakeDir, 'materials.template.json'),
    JSON.stringify({
      personId: 'Metadata Only',
      entries: [
        { type: 'text', file: 'sample.txt' },
        { type: 'screenshot', file: 'metadata-shot.png' },
      ],
    }, null, 2),
  );

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for Metadata Only (metadata-only)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js import manifest --file 'profiles/metadata-only/imports/materials.template.json' --refresh-foundation");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/metadata-only/imports/materials.template.json',
    'profiles/metadata-only/imports/sample.txt',
    'profiles/metadata-only/imports/metadata-shot.png',
  ]);
  assert.match(summary.promptPreview, /paths: profiles\/metadata-only\/imports\/materials\.template\.json, profiles\/metadata-only\/imports\/sample\.txt, profiles\/metadata-only\/imports\/metadata-shot\.png/);
});

test('buildSummary work loop prefers the exact ready-intake bundle when multiple metadata-only profiles are ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  ['Alpha Ready', 'Beta Ready'].forEach((personId) => {
    const personSlug = personId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const profileDir = path.join(rootDir, 'profiles', personSlug);
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, 'profile.json'),
      JSON.stringify({
        personId,
        displayName: personId,
        summary: `${personId} profile scaffold without imported materials yet.`,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      }, null, 2),
    );
    runUpdateCommand(rootDir, 'intake', {
      person: personId,
      'display-name': personId,
      summary: `${personId} profile scaffold without imported materials yet.`,
    });

    if (personSlug === 'beta-ready') {
      const intakeDir = path.join(profileDir, 'imports');
      fs.writeFileSync(path.join(intakeDir, 'beta-shot.png'), 'fake screenshot bytes\n');
      fs.writeFileSync(
        path.join(intakeDir, 'materials.template.json'),
        JSON.stringify({
          personId,
          entries: [
            { type: 'text', file: 'sample.txt' },
            { type: 'screenshot', file: 'beta-shot.png' },
          ],
        }, null, 2),
      );
    }
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'import source materials for ready intake profiles — starting with Alpha Ready (alpha-ready)');
  assert.equal(summary.ingestion.helperCommands.importIntakeBundle,
    "(node src/index.js import intake --person 'alpha-ready' --refresh-foundation) && (node src/index.js import intake --person 'beta-ready' --refresh-foundation)",
  );
  assert.equal(
    summary.workLoop.currentPriority.command,
    "(node src/index.js import intake --person 'alpha-ready' --refresh-foundation) && (node src/index.js import intake --person 'beta-ready' --refresh-foundation)",
  );
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/alpha-ready/imports/materials.template.json',
    'profiles/alpha-ready/imports/sample.txt',
    'profiles/beta-ready/imports/materials.template.json',
    'profiles/beta-ready/imports/sample.txt',
    'profiles/beta-ready/imports/beta-shot.png',
  ]);
  assert.match(summary.promptPreview, /next action: import source materials for ready intake profiles — starting with Alpha Ready \(alpha-ready\)/);
  assert.match(
    summary.promptPreview,
    /command: \(node src\/index\.js import intake --person 'alpha-ready' --refresh-foundation\) && \(node src\/index\.js import intake --person 'beta-ready' --refresh-foundation\)/,
  );
  assert.match(summary.promptPreview, /paths: profiles\/alpha-ready\/imports\/materials\.template\.json, profiles\/alpha-ready\/imports\/sample\.txt, profiles\/beta-ready\/imports\/materials\.template\.json, profiles\/beta-ready\/imports\/sample\.txt, profiles\/beta-ready\/imports\/beta-shot\.png/);
});

test('buildSummary work loop repairs the env template before channel scaffolding when leader credentials are missing', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'SLACK_BOT_TOKEN=\nOPENAI_API_KEY=\n');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.deepEqual(summary.delivery.envTemplateVarNames, ['OPENAI_API_KEY', 'SLACK_BOT_TOKEN']);
  assert.deepEqual(summary.delivery.envTemplateMissingRequiredVars, [
    'ANTHROPIC_API_KEY',
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
    'GLM_API_KEY',
    'KIMI_API_KEY',
    'MINIMAX_API_KEY',
    'QWEN_API_KEY',
    'SLACK_SIGNING_SECRET',
    'TELEGRAM_BOT_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ]);
  assert.equal(summary.delivery.helperCommands.bootstrapEnv, null);
  assert.equal(summary.delivery.channelQueue[0].helperCommands.bootstrapEnv, null);
  assert.equal(summary.delivery.providerQueue[0].helperCommands.bootstrapEnv, null);
  assert.equal(
    summary.delivery.helperCommands.populateEnvTemplate,
    "touch '.env.example' && for key in 'ANTHROPIC_API_KEY' 'FEISHU_APP_ID' 'FEISHU_APP_SECRET' 'GLM_API_KEY' 'KIMI_API_KEY' 'MINIMAX_API_KEY' 'QWEN_API_KEY' 'SLACK_SIGNING_SECRET' 'TELEGRAM_BOT_TOKEN' 'WHATSAPP_ACCESS_TOKEN' 'WHATSAPP_PHONE_NUMBER_ID'; do grep -q \"^${key}=\" '.env.example' || printf '%s=\\n' \"$key\" >> '.env.example'; done",
  );
  assert.equal(summary.workLoop.currentPriority.nextAction, 'update .env.example with missing delivery credentials; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.equal(
    summary.workLoop.currentPriority.command,
    "touch '.env.example' && for key in 'ANTHROPIC_API_KEY' 'FEISHU_APP_ID' 'FEISHU_APP_SECRET' 'GLM_API_KEY' 'KIMI_API_KEY' 'MINIMAX_API_KEY' 'QWEN_API_KEY' 'SLACK_SIGNING_SECRET' 'TELEGRAM_BOT_TOKEN' 'WHATSAPP_ACCESS_TOKEN' 'WHATSAPP_PHONE_NUMBER_ID'; do grep -q \"^${key}=\" '.env.example' || printf '%s=\\n' \"$key\" >> '.env.example'; done",
  );
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example']);
  assert.match(summary.promptPreview, /current: Channels \[queued\] — 4 pending, 0 configured, 4 auth-blocked, manifest missing, scaffolds 0\/4 present/);
  assert.match(summary.promptPreview, /env template: \.env\.example \(2\/13 required vars; missing ANTHROPIC_API_KEY, FEISHU_APP_ID, FEISHU_APP_SECRET, GLM_API_KEY, KIMI_API_KEY, MINIMAX_API_KEY, QWEN_API_KEY, SLACK_SIGNING_SECRET, TELEGRAM_BOT_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID\)/);
  assert.doesNotMatch(summary.promptPreview, /env bootstrap: cp \.env\.example \.env/);
  assert.doesNotMatch(summary.promptPreview, /\| helpers: env cp \.env\.example \.env/);
  assert.match(summary.promptPreview, /next action: update \.env\.example with missing delivery credentials; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /command: touch '\.env\.example' && for key in 'ANTHROPIC_API_KEY' 'FEISHU_APP_ID' 'FEISHU_APP_SECRET' 'GLM_API_KEY' 'KIMI_API_KEY' 'MINIMAX_API_KEY' 'QWEN_API_KEY' 'SLACK_SIGNING_SECRET' 'TELEGRAM_BOT_TOKEN' 'WHATSAPP_ACCESS_TOKEN' 'WHATSAPP_PHONE_NUMBER_ID'; do grep -q \"\^\$\{key\}=\" '\.env\.example' \|\| printf '%s=\\n' \"\$key\" >> '\.env\.example'; done/);
  assert.match(summary.promptPreview, /paths: \.env\.example/);
  assert.doesNotMatch(summary.promptPreview, /paths: .*manifests\/channels\.json/);
});

test('buildSummary work loop repairs the env template before channel credential bootstrap even when delivery manifests are already ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'SLACK_BOT_TOKEN=\nOPENAI_API_KEY=\n');
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'channels.json'), path.join(rootDir, 'manifests', 'channels.json'));
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'providers.json'), path.join(rootDir, 'manifests', 'providers.json'));
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  ['slack', 'telegram', 'whatsapp', 'feishu'].forEach((channelId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'channels', `${channelId}.js`),
      path.join(rootDir, 'src', 'channels', `${channelId}.js`),
    );
  });
  fs.mkdirSync(path.join(rootDir, 'src', 'models'), { recursive: true });
  ['openai', 'anthropic', 'kimi', 'minimax', 'glm', 'qwen'].forEach((providerId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'models', `${providerId}.js`),
      path.join(rootDir, 'src', 'models', `${providerId}.js`),
    );
  });

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.status, 'blocked');
  assert.equal(summary.channels.manifest.status, 'loaded');
  assert.equal(summary.models.manifest.status, 'loaded');
  assert.equal(summary.workLoop.priorities[2].status, 'blocked');
  assert.equal(summary.workLoop.priorities[3].status, 'blocked');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'update .env.example with missing delivery credentials; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET');
  assert.equal(
    summary.workLoop.currentPriority.command,
    summary.delivery.helperCommands.populateEnvTemplate,
  );
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example']);
  assert.match(summary.promptPreview, /current: Channels \[blocked\] — 4 pending, 0 configured, 4 auth-blocked, manifest ready, scaffolds 4\/4 present, implementations 4\/4 ready/);
  assert.match(summary.promptPreview, /next action: update \.env\.example with missing delivery credentials; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET/);
  assert.match(summary.promptPreview, /priorities: 4 total \(2 ready, 0 queued, 2 blocked\)/);
  assert.match(summary.promptPreview, /order: foundation:ready \| ingestion:ready \| channels:blocked \| providers:blocked/);
  assert.match(summary.promptPreview, /command: touch '\.env\.example' && for key in 'ANTHROPIC_API_KEY' 'FEISHU_APP_ID' 'FEISHU_APP_SECRET' 'GLM_API_KEY' 'KIMI_API_KEY' 'MINIMAX_API_KEY' 'QWEN_API_KEY' 'SLACK_SIGNING_SECRET' 'TELEGRAM_BOT_TOKEN' 'WHATSAPP_ACCESS_TOKEN' 'WHATSAPP_PHONE_NUMBER_ID'; do grep -q \"\^\$\{key\}=\" '\.env\.example' \|\| printf '%s=\\n' \"\$key\" >> '\.env\.example'; done/);
  assert.match(summary.promptPreview, /paths: \.env\.example/);
  assert.doesNotMatch(summary.promptPreview, /command: cp \.env\.example \.env/);
});

test('buildSummary work loop backfills missing intake landing zones for imported profiles before delivery rollout', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    'OPENAI_API_KEY=***',
    'ANTHROPIC_API_KEY=***',
    'KIMI_API_KEY=***',
    'MINIMAX_API_KEY=***',
    'GLM_API_KEY=***',
    'QWEN_API_KEY=***',
    '',
  ].join('\n'));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
  });
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  fs.rmSync(path.join(rootDir, 'profiles', 'harry-han', 'imports'), { recursive: true, force: true });

  const summary = buildSummary(rootDir);

  assert.equal(summary.ingestion.importedIntakeBackfillProfileCount, 1);
  assert.equal(summary.workLoop.currentPriority.id, 'ingestion');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.summary, '1 imported, 0 metadata-only, drafts 1 ready, 0 queued for refresh, 1 intake backfill');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'backfill the intake landing zone for imported profiles — starting with Harry Han (harry-han)');
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/harry-han/imports',
    'profiles/harry-han/imports/README.md',
    'profiles/harry-han/imports/materials.template.json',
    'profiles/harry-han/imports/sample.txt',
  ]);
  assert.match(summary.promptPreview, /current: Ingestion \[queued\] — 1 imported, 0 metadata-only, drafts 1 ready, 0 queued for refresh, 1 intake backfill/);
  assert.match(summary.promptPreview, /next action: backfill the intake landing zone for imported profiles — starting with Harry Han \(harry-han\)/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han'/);
  assert.match(summary.promptPreview, /paths: profiles\/harry-han\/imports, profiles\/harry-han\/imports\/README\.md, profiles\/harry-han\/imports\/materials\.template\.json, profiles\/harry-han\/imports\/sample\.txt/);
});

test('buildSummary work loop keeps credential bootstrap paths scoped to the template source during env copy', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    'OPENAI_API_KEY=***',
    'ANTHROPIC_API_KEY=***',
    'KIMI_API_KEY=***',
    'MINIMAX_API_KEY=***',
    'GLM_API_KEY=***',
    'QWEN_API_KEY=***',
    '',
  ].join('\n'));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);
  const workLoopBlock = summary.promptPreview.match(/Work loop:\n([\s\S]*?)\nCore foundation:/)?.[1] ?? '';

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.command, 'cp .env.example .env');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example']);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.match(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /command: cp \.env\.example \.env/);
  assert.match(workLoopBlock, /paths: \.env\.example/);
  assert.doesNotMatch(workLoopBlock, /paths: .*\.env(?:,|$)/);
  assert.doesNotMatch(summary.promptPreview, /paths: .*manifests\/channels\.json/);
  assert.doesNotMatch(summary.promptPreview, /paths: .*src\/channels\/slack\.js/);
});

test('buildSummary work loop drops stale implementation follow-ups while keeping env bootstrap paths scoped to the template source once checked-in delivery modules are runtime-ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    'OPENAI_API_KEY=***',
    'ANTHROPIC_API_KEY=***',
    'KIMI_API_KEY=***',
    'MINIMAX_API_KEY=***',
    'GLM_API_KEY=***',
    'QWEN_API_KEY=***',
    '',
  ].join('\n'));
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'channels.json'), path.join(rootDir, 'manifests', 'channels.json'));
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'providers.json'), path.join(rootDir, 'manifests', 'providers.json'));
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  ['slack', 'telegram', 'whatsapp', 'feishu'].forEach((channelId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'channels', `${channelId}.js`),
      path.join(rootDir, 'src', 'channels', `${channelId}.js`),
    );
  });

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);
  const workLoopBlock = summary.promptPreview.match(/Work loop:\n([\s\S]*?)\nCore foundation:/)?.[1] ?? '';

  assert.equal(summary.delivery.channelQueue[0].implementationStatus, 'ready');
  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.status, 'blocked');
  assert.equal(summary.workLoop.priorities[2].status, 'blocked');
  assert.equal(summary.workLoop.blockedPriorityCount, 1);
  assert.equal(summary.workLoop.currentPriority.command, 'cp .env.example .env');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example']);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET');
  assert.match(summary.promptPreview, /current: Channels \[blocked\] — 4 pending, 0 configured, 4 auth-blocked, manifest ready, scaffolds 4\/4 present, implementations 4\/4 ready/);
  assert.match(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET/);
  assert.match(summary.promptPreview, /priorities: 4 total \(2 ready, 1 queued, 1 blocked\)/);
  assert.match(summary.promptPreview, /order: foundation:ready \| ingestion:ready \| channels:blocked \| providers:queued/);
  assert.match(workLoopBlock, /paths: \.env\.example/);
  assert.doesNotMatch(workLoopBlock, /paths: .*\.env(?:,|$)/);
  assert.doesNotMatch(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
});

test('buildSummary work loop stays on the leading ready priority once every priority is ready', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  writeFullDeliveryEnv(rootDir, '.env.example');
  writeFullDeliveryEnv(rootDir, '.env');
  seedRuntimeReadyDeliveryRepo(rootDir);
  markManifestEntriesActive(rootDir, 'manifests/channels.json');
  markManifestEntriesActive(rootDir, 'manifests/providers.json');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);
  const workLoopBlock = summary.promptPreview.match(/Work loop:\n([\s\S]*?)\nCore foundation:/)?.[1] ?? '';

  assert.equal(summary.workLoop.readyPriorityCount, 4);
  assert.equal(summary.workLoop.queuedPriorityCount, 0);
  assert.equal(summary.workLoop.blockedPriorityCount, 0);
  assert.equal(summary.workLoop.leadingPriority?.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'ready');
  assert.equal(summary.workLoop.currentPriority.nextAction, null);
  assert.equal(summary.workLoop.currentPriority.command, null);
  assert.deepEqual(summary.workLoop.currentPriority.paths, []);
  assert.match(summary.promptPreview, /priorities: 4 total \(4 ready, 0 queued\)/);
  assert.match(summary.promptPreview, /current: Foundation \[ready\] — core 4\/4 ready; profiles 0 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /order: foundation:ready \| ingestion:ready \| channels:ready \| providers:ready/);
  assert.doesNotMatch(summary.promptPreview, /lead: Foundation \[ready\]/);
  assert.doesNotMatch(workLoopBlock, /next action:/);
  assert.doesNotMatch(workLoopBlock, /- command:/);
  assert.doesNotMatch(workLoopBlock, /- paths:/);
});

test('buildSummary work loop uses quoted repo-local .env credentials with inline comments before env bootstrap guidance', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=placeholder',
    'SLACK_SIGNING_SECRET=placeholder',
    'TELEGRAM_BOT_TOKEN=placeholder',
    'WHATSAPP_ACCESS_TOKEN=placeholder',
    'WHATSAPP_PHONE_NUMBER_ID=placeholder',
    'FEISHU_APP_ID=placeholder',
    'FEISHU_APP_SECRET=placeholder',
    'OPENAI_API_KEY=placeholder',
    'ANTHROPIC_API_KEY=placeholder',
    'KIMI_API_KEY=placeholder',
    'MINIMAX_API_KEY=placeholder',
    'GLM_API_KEY=placeholder',
    'QWEN_API_KEY=placeholder',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(rootDir, '.env'), [
    'export SLACK_BOT_TOKEN="repo-slack-token" # copied from vault',
    "SLACK_SIGNING_SECRET='repo-slack-secret' # copied from vault",
    'TELEGRAM_BOT_TOKEN=repo-telegram-token # copied from vault',
    'WHATSAPP_ACCESS_TOKEN=repo-whatsapp-token # copied from vault',
    'WHATSAPP_PHONE_NUMBER_ID=repo-whatsapp-phone',
    'FEISHU_APP_ID=repo-feishu-id',
    'FEISHU_APP_SECRET=repo-feishu-secret # copied from vault',
    '',
  ].join('\n'));
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'channels.json'), path.join(rootDir, 'manifests', 'channels.json'));
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'providers.json'), path.join(rootDir, 'manifests', 'providers.json'));
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  ['slack', 'telegram', 'whatsapp', 'feishu'].forEach((channelId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'channels', `${channelId}.js`),
      path.join(rootDir, 'src', 'channels', `${channelId}.js`),
    );
  });

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
  };
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_SIGNING_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.FEISHU_APP_ID;
  delete process.env.FEISHU_APP_SECRET;

  try {
    const summary = buildSummary(rootDir);

    assert.equal(summary.delivery.configuredChannelCount, 4);
    assert.equal(summary.delivery.authBlockedChannelCount, 0);
    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.status, 'queued');
    assert.equal(summary.workLoop.currentPriority.command, null);
    assert.equal(summary.workLoop.currentPriority.nextAction, 'credentials present');
    assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json']);
    assert.doesNotMatch(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET/);
    assert.doesNotMatch(summary.promptPreview, /command: cp \.env\.example \.env/);
  } finally {
    if (typeof originalEnv.SLACK_BOT_TOKEN === 'string') {
      process.env.SLACK_BOT_TOKEN = originalEnv.SLACK_BOT_TOKEN;
    } else {
      delete process.env.SLACK_BOT_TOKEN;
    }
    if (typeof originalEnv.SLACK_SIGNING_SECRET === 'string') {
      process.env.SLACK_SIGNING_SECRET = originalEnv.SLACK_SIGNING_SECRET;
    } else {
      delete process.env.SLACK_SIGNING_SECRET;
    }
    if (typeof originalEnv.TELEGRAM_BOT_TOKEN === 'string') {
      process.env.TELEGRAM_BOT_TOKEN = originalEnv.TELEGRAM_BOT_TOKEN;
    } else {
      delete process.env.TELEGRAM_BOT_TOKEN;
    }
    if (typeof originalEnv.WHATSAPP_ACCESS_TOKEN === 'string') {
      process.env.WHATSAPP_ACCESS_TOKEN = originalEnv.WHATSAPP_ACCESS_TOKEN;
    } else {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
    }
    if (typeof originalEnv.WHATSAPP_PHONE_NUMBER_ID === 'string') {
      process.env.WHATSAPP_PHONE_NUMBER_ID = originalEnv.WHATSAPP_PHONE_NUMBER_ID;
    } else {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    }
    if (typeof originalEnv.FEISHU_APP_ID === 'string') {
      process.env.FEISHU_APP_ID = originalEnv.FEISHU_APP_ID;
    } else {
      delete process.env.FEISHU_APP_ID;
    }
    if (typeof originalEnv.FEISHU_APP_SECRET === 'string') {
      process.env.FEISHU_APP_SECRET = originalEnv.FEISHU_APP_SECRET;
    } else {
      delete process.env.FEISHU_APP_SECRET;
    }
  }
});

test('buildSummary work loop skips env bootstrap once a repo-local .env already exists', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    'OPENAI_API_KEY=***',
    'ANTHROPIC_API_KEY=***',
    'KIMI_API_KEY=***',
    'MINIMAX_API_KEY=***',
    'GLM_API_KEY=***',
    'QWEN_API_KEY=***',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(rootDir, '.env'), 'OPENAI_API_KEY=***\n');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.delivery.envTemplateCommand, null);
  assert.equal(summary.delivery.helperCommands.bootstrapEnv, null);
  assert.equal(summary.delivery.channelQueue[0].helperCommands.bootstrapEnv, null);
  assert.equal(summary.delivery.providerQueue[0].helperCommands.bootstrapEnv, null);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create manifests/channels.json; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.equal(summary.workLoop.currentPriority.command, "mkdir -p 'manifests' && touch 'manifests/channels.json'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/slack.js']);
  assert.doesNotMatch(summary.promptPreview, /env bootstrap: cp \.env\.example \.env/);
  assert.doesNotMatch(summary.promptPreview, /\| helpers: env cp \.env\.example \.env/);
  assert.match(summary.promptPreview, /next action: create manifests\/channels\.json; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /command: mkdir -p 'manifests' && touch 'manifests\/channels\.json'/);
  assert.doesNotMatch(summary.promptPreview, /paths: .*\.env\.example/);
});

test('buildSummary work loop uses repo-local channel env repair commands once a partial .env already exists', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  writeFullDeliveryEnv(rootDir, '.env.example');
  fs.writeFileSync(path.join(rootDir, '.env'), 'OPENAI_API_KEY=***\n');
  seedRuntimeReadyDeliveryRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    KIMI_API_KEY: process.env.KIMI_API_KEY,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
    GLM_API_KEY: process.env.GLM_API_KEY,
    QWEN_API_KEY: process.env.QWEN_API_KEY,
  };
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_SIGNING_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.FEISHU_APP_ID;
  delete process.env.FEISHU_APP_SECRET;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.KIMI_API_KEY;
  delete process.env.MINIMAX_API_KEY;
  delete process.env.GLM_API_KEY;
  delete process.env.QWEN_API_KEY;

  try {
    const summary = buildSummary(rootDir);

    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.status, 'blocked');
    assert.equal(summary.workLoop.currentPriority.nextAction, 'set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET');
    assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.populateChannelEnv);
    assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env']);
    assert.equal(summary.delivery.envTemplateCommand, null);
    assert.equal(summary.delivery.helperCommands.bootstrapEnv, null);
    assert.match(summary.promptPreview, /current: Channels \[blocked\] — 4 pending, 0 configured, 4 auth-blocked, manifest ready, scaffolds 4\/4 present, implementations 4\/4 ready/);
    assert.match(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET/);
    assert.match(summary.promptPreview, /command: touch '\.env' && for key in 'SLACK_BOT_TOKEN' 'SLACK_SIGNING_SECRET' 'TELEGRAM_BOT_TOKEN' 'WHATSAPP_ACCESS_TOKEN' 'WHATSAPP_PHONE_NUMBER_ID' 'FEISHU_APP_ID' 'FEISHU_APP_SECRET'; do grep -q \"\^\$\{key\}=\" '\.env' \|\| printf '%s=\\n' \"\$key\" >> '\.env'; done/);
    assert.match(summary.promptPreview, /paths: \.env/);
    assert.doesNotMatch(summary.promptPreview, /paths: .*\.env\.example/);
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === 'string') {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  }
});

test('buildSummary work loop uses repo-local provider env repair commands once channels are already configured', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  writeFullDeliveryEnv(rootDir, '.env.example');
  fs.writeFileSync(path.join(rootDir, '.env'), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    '',
  ].join('\n'));
  seedRuntimeReadyDeliveryRepo(rootDir);
  markManifestEntriesActive(rootDir, 'manifests/channels.json');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    KIMI_API_KEY: process.env.KIMI_API_KEY,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
    GLM_API_KEY: process.env.GLM_API_KEY,
    QWEN_API_KEY: process.env.QWEN_API_KEY,
  };
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_SIGNING_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.FEISHU_APP_ID;
  delete process.env.FEISHU_APP_SECRET;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.KIMI_API_KEY;
  delete process.env.MINIMAX_API_KEY;
  delete process.env.GLM_API_KEY;
  delete process.env.QWEN_API_KEY;

  try {
    const summary = buildSummary(rootDir);

    assert.equal(summary.workLoop.currentPriority.id, 'providers');
    assert.equal(summary.workLoop.currentPriority.status, 'blocked');
    assert.equal(summary.workLoop.currentPriority.nextAction, 'set OPENAI_API_KEY for gpt-5');
    assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.populateProviderEnv);
    assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env']);
    assert.equal(summary.delivery.configuredChannelCount, 0);
    assert.equal(summary.delivery.configuredProviderCount, 0);
    assert.match(summary.promptPreview, /current: Providers \[blocked\] — 6 pending, 0 configured, 6 auth-blocked, manifest ready, scaffolds 6\/6 present, implementations 6\/6 ready/);
    assert.match(summary.promptPreview, /next action: set OPENAI_API_KEY for gpt-5/);
    assert.match(summary.promptPreview, /command: touch '\.env' && for key in 'OPENAI_API_KEY' 'ANTHROPIC_API_KEY' 'KIMI_API_KEY' 'MINIMAX_API_KEY' 'GLM_API_KEY' 'QWEN_API_KEY'; do grep -q \"\^\$\{key\}=\" '\.env' \|\| printf '%s=\\n' \"\$key\" >> '\.env'; done/);
    assert.match(summary.promptPreview, /paths: \.env/);
    assert.doesNotMatch(summary.promptPreview, /paths: .*\.env\.example/);
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === 'string') {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  }
});

test('buildSummary work loop uses repo-local .env credentials before env bootstrap guidance', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=***',
    'SLACK_SIGNING_SECRET=***',
    'TELEGRAM_BOT_TOKEN=***',
    'WHATSAPP_ACCESS_TOKEN=***',
    'WHATSAPP_PHONE_NUMBER_ID=***',
    'FEISHU_APP_ID=***',
    'FEISHU_APP_SECRET=***',
    'OPENAI_API_KEY=***',
    'ANTHROPIC_API_KEY=***',
    'KIMI_API_KEY=***',
    'MINIMAX_API_KEY=***',
    'GLM_API_KEY=***',
    'QWEN_API_KEY=***',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(rootDir, '.env'), [
    'export SLACK_BOT_TOKEN=repo-slack-token',
    'export SLACK_SIGNING_SECRET=repo-signing-secret',
    'TELEGRAM_BOT_TOKEN=repo-telegram-token',
    'WHATSAPP_ACCESS_TOKEN=repo-whatsapp-token',
    'WHATSAPP_PHONE_NUMBER_ID=repo-whatsapp-phone',
    'FEISHU_APP_ID=repo-feishu-id',
    'FEISHU_APP_SECRET=repo-feishu-secret',
    '',
  ].join('\n'));
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'channels.json'), path.join(rootDir, 'manifests', 'channels.json'));
  fs.copyFileSync(path.join(process.cwd(), 'manifests', 'providers.json'), path.join(rootDir, 'manifests', 'providers.json'));
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  ['slack', 'telegram', 'whatsapp', 'feishu'].forEach((channelId) => {
    fs.copyFileSync(
      path.join(process.cwd(), 'src', 'channels', `${channelId}.js`),
      path.join(rootDir, 'src', 'channels', `${channelId}.js`),
    );
  });

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
  };
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_SIGNING_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.FEISHU_APP_ID;
  delete process.env.FEISHU_APP_SECRET;

  try {
    const summary = buildSummary(rootDir);

    assert.equal(summary.delivery.configuredChannelCount, 4);
    assert.equal(summary.delivery.authBlockedChannelCount, 0);
    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.status, 'queued');
    assert.equal(summary.workLoop.currentPriority.command, null);
    assert.equal(summary.workLoop.currentPriority.nextAction, 'credentials present');
    assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json']);
    assert.doesNotMatch(summary.promptPreview, /next action: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET/);
    assert.doesNotMatch(summary.promptPreview, /command: cp \.env\.example \.env/);
    assert.match(summary.promptPreview, /current: Channels \[queued\] — 4 pending, 4 configured, 0 auth-blocked, manifest ready, scaffolds 4\/4 present, implementations 4\/4 ready/);
    assert.match(summary.promptPreview, /next action: credentials present/);
  } finally {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (typeof value === 'string') {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  }
});

test('buildSummary work loop reports required env coverage from matching vars only when the template includes extras', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), [
    'SLACK_BOT_TOKEN=***',
    'EXTRA_ALPHA=',
    'EXTRA_BETA=',
    'EXTRA_GAMMA=',
    'EXTRA_DELTA=',
    'EXTRA_EPSILON=',
    'EXTRA_ZETA=',
    'EXTRA_ETA=',
    'EXTRA_THETA=',
    'EXTRA_IOTA=',
    'EXTRA_KAPPA=',
    'EXTRA_LAMBDA=',
    'EXTRA_MU=',
    'EXTRA_NU=',
    '',
  ].join('\n'));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.match(summary.promptPreview, /env template: \.env\.example \(1\/13 required vars; missing ANTHROPIC_API_KEY, FEISHU_APP_ID, FEISHU_APP_SECRET, GLM_API_KEY, KIMI_API_KEY, MINIMAX_API_KEY, OPENAI_API_KEY, QWEN_API_KEY, SLACK_SIGNING_SECRET, TELEGRAM_BOT_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID\)/);
});

test('buildSummary work loop scaffolds the channel manifest once the queue leader is already configured', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'SLACK_BOT_TOKEN=\nSLACK_SIGNING_SECRET=\n');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  };

  process.env.SLACK_BOT_TOKEN = 'token';
  process.env.SLACK_SIGNING_SECRET = 'secret';

  try {
    runImportCommand(rootDir, 'text', {
      person: 'harry-han',
      file: 'samples/harry-post.txt',
      'refresh-foundation': true,
    });

    const summary = buildSummary(rootDir);

    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.nextAction, 'create manifests/channels.json; credentials present; next: implement inbound event handling and outbound thread replies');
    assert.equal(summary.workLoop.currentPriority.command, "mkdir -p 'manifests' && touch 'manifests/channels.json'");
    assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/slack.js']);
    assert.match(summary.promptPreview, /next action: create manifests\/channels\.json; credentials present; next: implement inbound event handling and outbound thread replies/);
    assert.match(summary.promptPreview, /command: mkdir -p 'manifests' && touch 'manifests\/channels\.json'/);
    assert.doesNotMatch(summary.promptPreview, /paths: .*\.env\.example/);
  } finally {
    if (originalEnv.SLACK_BOT_TOKEN === undefined) {
      delete process.env.SLACK_BOT_TOKEN;
    } else {
      process.env.SLACK_BOT_TOKEN = originalEnv.SLACK_BOT_TOKEN;
    }

    if (originalEnv.SLACK_SIGNING_SECRET === undefined) {
      delete process.env.SLACK_SIGNING_SECRET;
    } else {
      process.env.SLACK_SIGNING_SECRET = originalEnv.SLACK_SIGNING_SECRET;
    }
  }
});

test('buildSummary work loop scaffolds the channel manifest when delivery setup lacks an env template', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create manifests/channels.json; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.equal(summary.workLoop.currentPriority.command, "mkdir -p 'manifests' && touch 'manifests/channels.json'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/slack.js']);
  assert.match(summary.promptPreview, /next action: create manifests\/channels\.json; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /command: mkdir -p 'manifests' && touch 'manifests\/channels\.json'/);
});

test('buildSummary work loop bundles missing channel implementations once the channel manifest exists and credentials are configured', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([{ id: 'slack', status: 'planned' }], null, 2));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
  };

  process.env.SLACK_BOT_TOKEN='***';
  process.env.SLACK_SIGNING_SECRET='***';
  process.env.TELEGRAM_BOT_TOKEN='***';
  process.env.WHATSAPP_ACCESS_TOKEN='***';
  process.env.WHATSAPP_PHONE_NUMBER_ID='***';
  process.env.FEISHU_APP_ID='***';
  process.env.FEISHU_APP_SECRET='***';

  try {
    runImportCommand(rootDir, 'text', {
      person: 'harry-han',
      file: 'samples/harry-post.txt',
      'refresh-foundation': true,
    });

    const summary = buildSummary(rootDir);

    assert.equal(summary.delivery.helperCommands.scaffoldChannelImplementationBundle, "(mkdir -p 'src/channels' && touch 'src/channels/slack.js') && (mkdir -p 'src/channels' && touch 'src/channels/telegram.js') && (mkdir -p 'src/channels' && touch 'src/channels/whatsapp.js') && (mkdir -p 'src/channels' && touch 'src/channels/feishu.js')");
    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.nextAction, 'create pending channel implementations — starting with src/channels/slack.js; credentials present; next: implement inbound event handling and outbound thread replies');
    assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.scaffoldChannelImplementationBundle);
    assert.deepEqual(summary.workLoop.currentPriority.paths, [
      'manifests/channels.json',
      'src/channels/slack.js',
      'src/channels/telegram.js',
      'src/channels/whatsapp.js',
      'src/channels/feishu.js',
    ]);
    assert.match(summary.promptPreview, /current: Channels \[queued\] — 4 pending, 4 configured, 0 auth-blocked, manifest ready, scaffolds 0\/4 present/);
    assert.match(summary.promptPreview, /next action: create pending channel implementations — starting with src\/channels\/slack\.js; credentials present; next: implement inbound event handling and outbound thread replies/);
    assert.match(summary.promptPreview, /command: \(mkdir -p 'src\/channels' && touch 'src\/channels\/slack\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/telegram\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/whatsapp\.js'\) && \(mkdir -p 'src\/channels' && touch 'src\/channels\/feishu\.js'\)/);
  } finally {
    if (originalEnv.SLACK_BOT_TOKEN === undefined) {
      delete process.env.SLACK_BOT_TOKEN;
    } else {
      process.env.SLACK_BOT_TOKEN = originalEnv.SLACK_BOT_TOKEN;
    }
    if (originalEnv.SLACK_SIGNING_SECRET === undefined) {
      delete process.env.SLACK_SIGNING_SECRET;
    } else {
      process.env.SLACK_SIGNING_SECRET = originalEnv.SLACK_SIGNING_SECRET;
    }
    if (originalEnv.TELEGRAM_BOT_TOKEN === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalEnv.TELEGRAM_BOT_TOKEN;
    }
    if (originalEnv.WHATSAPP_ACCESS_TOKEN === undefined) {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_ACCESS_TOKEN = originalEnv.WHATSAPP_ACCESS_TOKEN;
    }
    if (originalEnv.WHATSAPP_PHONE_NUMBER_ID === undefined) {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    } else {
      process.env.WHATSAPP_PHONE_NUMBER_ID = originalEnv.WHATSAPP_PHONE_NUMBER_ID;
    }
    if (originalEnv.FEISHU_APP_ID === undefined) {
      delete process.env.FEISHU_APP_ID;
    } else {
      process.env.FEISHU_APP_ID = originalEnv.FEISHU_APP_ID;
    }
    if (originalEnv.FEISHU_APP_SECRET === undefined) {
      delete process.env.FEISHU_APP_SECRET;
    } else {
      process.env.FEISHU_APP_SECRET = originalEnv.FEISHU_APP_SECRET;
    }
  }
});

test('buildSummary work loop omits env bootstrap paths when implementation scaffolding is the real next step', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([{ id: 'slack', status: 'planned' }], null, 2));
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'SLACK_BOT_TOKEN=\nSLACK_SIGNING_SECRET=\n');

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  const originalEnv = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
  };

  process.env.SLACK_BOT_TOKEN='***';
  process.env.SLACK_SIGNING_SECRET='***';
  process.env.TELEGRAM_BOT_TOKEN='***';
  process.env.WHATSAPP_ACCESS_TOKEN='***';
  process.env.WHATSAPP_PHONE_NUMBER_ID='***';
  process.env.FEISHU_APP_ID='***';
  process.env.FEISHU_APP_SECRET='***';

  try {
    runImportCommand(rootDir, 'text', {
      person: 'harry-han',
      file: 'samples/harry-post.txt',
      'refresh-foundation': true,
    });

    const summary = buildSummary(rootDir);

    assert.equal(summary.workLoop.currentPriority.id, 'channels');
    assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.scaffoldChannelImplementationBundle);
    assert.deepEqual(summary.workLoop.currentPriority.paths, [
      'manifests/channels.json',
      'src/channels/slack.js',
      'src/channels/telegram.js',
      'src/channels/whatsapp.js',
      'src/channels/feishu.js',
    ]);
    assert.doesNotMatch(summary.promptPreview, /paths: .*\.env\.example/);
  } finally {
    if (originalEnv.SLACK_BOT_TOKEN === undefined) {
      delete process.env.SLACK_BOT_TOKEN;
    } else {
      process.env.SLACK_BOT_TOKEN = originalEnv.SLACK_BOT_TOKEN;
    }
    if (originalEnv.SLACK_SIGNING_SECRET === undefined) {
      delete process.env.SLACK_SIGNING_SECRET;
    } else {
      process.env.SLACK_SIGNING_SECRET = originalEnv.SLACK_SIGNING_SECRET;
    }
    if (originalEnv.TELEGRAM_BOT_TOKEN === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalEnv.TELEGRAM_BOT_TOKEN;
    }
    if (originalEnv.WHATSAPP_ACCESS_TOKEN === undefined) {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_ACCESS_TOKEN = originalEnv.WHATSAPP_ACCESS_TOKEN;
    }
    if (originalEnv.WHATSAPP_PHONE_NUMBER_ID === undefined) {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    } else {
      process.env.WHATSAPP_PHONE_NUMBER_ID = originalEnv.WHATSAPP_PHONE_NUMBER_ID;
    }
    if (originalEnv.FEISHU_APP_ID === undefined) {
      delete process.env.FEISHU_APP_ID;
    } else {
      process.env.FEISHU_APP_ID = originalEnv.FEISHU_APP_ID;
    }
    if (originalEnv.FEISHU_APP_SECRET === undefined) {
      delete process.env.FEISHU_APP_SECRET;
    } else {
      process.env.FEISHU_APP_SECRET = originalEnv.FEISHU_APP_SECRET;
    }
  }
});

test('buildSummary work loop repairs the env template when it misses the leader credentials before channel scaffolding', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'planned' },
    { id: 'telegram', status: 'planned' },
    { id: 'whatsapp', status: 'planned' },
    { id: 'feishu', status: 'planned' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, '.env.example'), 'TELEGRAM_BOT_TOKEN=***\n');
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.populateEnvTemplate);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'update .env.example with missing delivery credentials; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['.env.example']);
});

test('buildSummary work loop keeps scaffold-only delivery files visible as runtime backlog', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'src', 'models'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'slack.js'), "export const slackChannelScaffold = { id: 'slack' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'telegram.js'), "export const telegramChannelScaffold = { id: 'telegram' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'whatsapp.js'), "export const whatsappChannelScaffold = { id: 'whatsapp' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'feishu.js'), "export const feishuChannelScaffold = { id: 'feishu' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'openai.js'), "export const openaiProviderScaffold = { id: 'openai' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'anthropic.js'), "export const anthropicProviderScaffold = { id: 'anthropic' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'kimi.js'), "export const kimiProviderScaffold = { id: 'kimi' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'minimax.js'), "export const minimaxProviderScaffold = { id: 'minimax' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'glm.js'), "export const glmProviderScaffold = { id: 'glm' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'qwen.js'), "export const qwenProviderScaffold = { id: 'qwen' };\n");
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'planned' },
    { id: 'telegram', status: 'planned' },
    { id: 'whatsapp', status: 'planned' },
    { id: 'feishu', status: 'planned' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'planned' },
    { id: 'anthropic', status: 'planned' },
    { id: 'kimi', status: 'planned' },
    { id: 'minimax', status: 'planned' },
    { id: 'glm', status: 'planned' },
    { id: 'qwen', status: 'planned' },
  ], null, 2));
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.match(summary.workLoop.currentPriority.summary, /4 pending, 0 configured, 4 auth-blocked, manifest ready, scaffolds 4\/4 present, implementations 0\/4 ready/);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'implement pending channel integrations — starting with src/channels/slack.js; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.equal(summary.workLoop.currentPriority.command, null);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/slack.js', 'src/channels/telegram.js', 'src/channels/whatsapp.js', 'src/channels/feishu.js']);
  assert.match(summary.promptPreview, /current: Channels \[queued\] — 4 pending, 0 configured, 4 auth-blocked, manifest ready, scaffolds 4\/4 present, implementations 0\/4 ready/);
  assert.match(summary.promptPreview, /next action: implement pending channel integrations — starting with src\/channels\/slack\.js; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies/);
  assert.match(summary.promptPreview, /channel queue: 4 pending \(4 auth-blocked\), manifest ready, scaffolds 4\/4 present, implementations 0\/4 ready via manifests\/channels\.json/);
  assert.match(summary.promptPreview, /runtime implementations: 0\/4 channels, 0\/6 providers ready/);
});

test('buildSummary work loop still scaffolds missing delivery files before scaffold-only ones', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'slack.js'), "export const slackChannelScaffold = { id: 'slack' };\n");
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'planned' },
    { id: 'telegram', status: 'planned' },
    { id: 'whatsapp', status: 'planned' },
    { id: 'feishu', status: 'planned' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'planned' },
  ], null, 2));
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.command, "(mkdir -p 'src/channels' && touch 'src/channels/telegram.js') && (mkdir -p 'src/channels' && touch 'src/channels/whatsapp.js') && (mkdir -p 'src/channels' && touch 'src/channels/feishu.js')");
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create pending channel implementations — starting with src/channels/telegram.js; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/telegram.js', 'src/channels/whatsapp.js', 'src/channels/feishu.js']);
});

test('buildSummary work loop paths follow the actual missing delivery file when a scaffold-only leader stays ahead of a single missing implementation', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'src', 'channels'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'slack.js'), "export const slackChannelScaffold = { id: 'slack' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'telegram.js'), "export const telegramChannelScaffold = { id: 'telegram' };\n");
  fs.writeFileSync(path.join(rootDir, 'src', 'channels', 'whatsapp.js'), "export const whatsappChannelScaffold = { id: 'whatsapp' };\n");
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'planned' },
    { id: 'telegram', status: 'planned' },
    { id: 'whatsapp', status: 'planned' },
    { id: 'feishu', status: 'planned' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'planned' },
  ], null, 2));
  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');
  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'channels');
  assert.equal(summary.workLoop.currentPriority.command, "mkdir -p 'src/channels' && touch 'src/channels/feishu.js'");
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create src/channels/feishu.js; set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET; next: implement inbound event handling and outbound thread replies');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/channels.json', 'src/channels/feishu.js']);
  assert.match(summary.promptPreview, /command: mkdir -p 'src\/channels' && touch 'src\/channels\/feishu\.js'/);
  assert.match(summary.promptPreview, /paths: manifests\/channels\.json, src\/channels\/feishu\.js/);
});

test('buildSummary work loop bundles missing provider implementations once the provider manifest exists', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([{ id: 'openai', status: 'planned' }], null, 2));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.delivery.helperCommands.scaffoldProviderImplementationBundle, "(mkdir -p 'src/models' && touch 'src/models/openai.js') && (mkdir -p 'src/models' && touch 'src/models/anthropic.js') && (mkdir -p 'src/models' && touch 'src/models/kimi.js') && (mkdir -p 'src/models' && touch 'src/models/minimax.js') && (mkdir -p 'src/models' && touch 'src/models/glm.js') && (mkdir -p 'src/models' && touch 'src/models/qwen.js')");
  assert.equal(summary.workLoop.currentPriority.id, 'providers');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'create pending provider implementations — starting with src/models/openai.js; set OPENAI_API_KEY for gpt-5; next: implement chat/tool request translation and response normalization');
  assert.equal(summary.workLoop.currentPriority.command, summary.delivery.helperCommands.scaffoldProviderImplementationBundle);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/providers.json', 'src/models/openai.js', 'src/models/anthropic.js', 'src/models/kimi.js', 'src/models/minimax.js', 'src/models/glm.js', 'src/models/qwen.js']);
  assert.match(summary.promptPreview, /current: Providers \[queued\] — 6 pending, 0 configured, 6 auth-blocked, manifest ready, scaffolds 0\/6 present/);
  assert.match(summary.promptPreview, /next action: create pending provider implementations — starting with src\/models\/openai\.js; set OPENAI_API_KEY for gpt-5; next: implement chat\/tool request translation and response normalization/);
  assert.match(summary.promptPreview, /command: \(mkdir -p 'src\/models' && touch 'src\/models\/openai\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/anthropic\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/kimi\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/minimax\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/glm\.js'\) && \(mkdir -p 'src\/models' && touch 'src\/models\/qwen\.js'\)/);
});

test('buildSummary work loop refuses to scaffold outside-repo provider implementation paths', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'active' },
    { id: 'anthropic', status: 'active' },
    { id: 'kimi', status: 'active' },
    { id: 'minimax', status: 'active' },
    { id: 'glm', status: 'active' },
    { id: 'qwen', status: 'active' },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      status: 'candidate',
      models: ['deepseek-chat'],
      features: ['chat'],
      defaultModel: 'deepseek-chat',
      authEnvVar: 'DEEPSEEK_API_KEY',
      modalities: ['chat'],
      implementationPath: '../outside-provider.js',
      nextStep: 'implement deepseek transport adapter',
    },
  ], null, 2));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'providers');
  assert.equal(summary.workLoop.currentPriority.command, null);
  assert.equal(summary.workLoop.currentPriority.nextAction, 'set DEEPSEEK_API_KEY for deepseek-chat; next: implement deepseek transport adapter');
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['manifests/providers.json']);
  assert.doesNotMatch(summary.promptPreview, /paths: .*outside-provider\.js/);
  assert.doesNotMatch(summary.promptPreview, /outside-provider\.js'.*touch/);
});

test('buildSummary work loop omits outside-repo implementation paths when bundling provider scaffolds', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'manifests', 'channels.json'), JSON.stringify([
    { id: 'slack', status: 'active' },
    { id: 'telegram', status: 'active' },
    { id: 'whatsapp', status: 'active' },
    { id: 'feishu', status: 'active' },
  ], null, 2));
  fs.writeFileSync(path.join(rootDir, 'manifests', 'providers.json'), JSON.stringify([
    { id: 'openai', status: 'planned', implementationPath: 'src/models/openai.js' },
    { id: 'anthropic', status: 'planned', implementationPath: 'src/models/anthropic.js' },
    { id: 'kimi', status: 'active' },
    { id: 'minimax', status: 'active' },
    { id: 'glm', status: 'active' },
    { id: 'qwen', status: 'active' },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      status: 'candidate',
      models: ['deepseek-chat'],
      features: ['chat'],
      defaultModel: 'deepseek-chat',
      authEnvVar: 'DEEPSEEK_API_KEY',
      modalities: ['chat'],
      implementationPath: '../outside-provider.js',
      nextStep: 'implement deepseek transport adapter',
    },
  ], null, 2));
  fs.mkdirSync(path.join(rootDir, 'src', 'models'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'openai.js'), 'export const providerId = \'openai\';\n');
  fs.writeFileSync(path.join(rootDir, 'src', 'models', 'anthropic.js'), 'export const providerId = \'anthropic\';\n');
  fs.rmSync(path.join(rootDir, 'src', 'models', 'openai.js'));
  fs.rmSync(path.join(rootDir, 'src', 'models', 'anthropic.js'));

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'providers');
  assert.equal(
    summary.workLoop.currentPriority.command,
    "(mkdir -p 'src/models' && touch 'src/models/openai.js') && (mkdir -p 'src/models' && touch 'src/models/anthropic.js')",
  );
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'manifests/providers.json',
    'src/models/openai.js',
    'src/models/anthropic.js',
  ]);
  assert.doesNotMatch(summary.promptPreview, /paths: .*outside-provider\.js/);
  assert.doesNotMatch(summary.promptPreview, /outside-provider\.js'.*touch/);
});

test('buildSummary work loop points foundation refreshes at the stale profile draft paths', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });
  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Updated profile metadata without refreshing foundation drafts.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'refresh Harry Han (harry-han) — reasons profile metadata drift + draft metadata drift');
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.maintenance.recommendedCommand);
  assert.equal(summary.workLoop.currentPriority.command, "node src/index.js update foundation --person 'harry-han'");
  assert.deepEqual(summary.workLoop.currentPriority.paths, summary.foundation.maintenance.recommendedPaths);
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/harry-han/memory/long-term/foundation.json',
    'profiles/harry-han/skills/README.md',
    'profiles/harry-han/soul/README.md',
    'profiles/harry-han/voice/README.md',
  ]);
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 4\/4 ready; profiles 1 queued for refresh, 0 incomplete/);
  assert.match(summary.promptPreview, /next action: refresh Harry Han \(harry-han\) — reasons profile metadata drift \+ draft metadata drift/);
  assert.match(summary.promptPreview, /command: node src\/index\.js update foundation --person 'harry-han'/);
  assert.match(summary.promptPreview, /paths: profiles\/harry-han\/memory\/long-term\/foundation\.json, profiles\/harry-han\/skills\/README\.md, profiles\/harry-han\/soul\/README\.md, profiles\/harry-han\/voice\/README\.md/);
});

test('buildSummary work loop keeps repo-core foundation ahead of stale profile refresh when the base scaffold is still thin', () => {
  const rootDir = makeTempRepo();

  fs.mkdirSync(path.join(rootDir, 'memory', 'daily'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'memory', 'daily', '2026-04-17.md'), 'Only one bucket seeded.\n');

  runImportCommand(rootDir, 'message', {
    person: 'jane-doe',
    text: 'Tight loops beat big plans.',
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(summary.workLoop.currentPriority.status, 'queued');
  assert.equal(summary.workLoop.currentPriority.nextAction, 'scaffold missing or thin core foundation areas — starting with create memory/README.md | add at least one entry under memory/long-term and memory/scratch');
  assert.equal(summary.workLoop.currentPriority.command, summary.foundation.core.maintenance.helperCommands.scaffoldAll);
  assert.deepEqual(summary.workLoop.currentPriority.paths, ['memory/README.md', 'memory/long-term', 'memory/scratch', 'skills/starter/SKILL.md', 'SOUL.md', 'voice/README.md']);
  assert.match(summary.workLoop.currentPriority.summary, /core 0\/4 ready \(1 thin, 3 missing\); profiles 1 queued for refresh, 1 incomplete/);
  assert.equal(summary.foundation.maintenance.queuedProfiles[0].id, 'jane-doe');
  assert.match(summary.promptPreview, /current: Foundation \[queued\] — core 0\/4 ready \(1 thin, 3 missing\); profiles 1 queued for refresh, 1 incomplete/);
  assert.match(summary.promptPreview, /next action: scaffold missing or thin core foundation areas — starting with create memory\/README\.md \| add at least one entry under memory\/long-term and memory\/scratch/);
  assert.match(summary.promptPreview, /paths: memory\/README\.md, memory\/long-term, memory\/scratch, skills\/starter\/SKILL\.md, SOUL\.md, voice\/README\.md/);
});

test('buildSummary work loop prioritizes the most incomplete stale foundation profile first', () => {
  const rootDir = makeTempRepo();
  seedReadyFoundationRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, 'samples'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'samples', 'harry-post.txt'), 'Ship the thin slice first.\n');

  runImportCommand(rootDir, 'text', {
    person: 'harry-han',
    file: 'samples/harry-post.txt',
    'refresh-foundation': true,
  });
  runUpdateCommand(rootDir, 'profile', {
    person: 'harry-han',
    'display-name': 'Harry Han',
    summary: 'Metadata drift without refreshing drafts yet.',
  });

  runImportCommand(rootDir, 'message', {
    person: 'jane-doe',
    text: 'Tight loops beat big plans.',
  });

  runImportCommand(rootDir, 'message', {
    person: 'ready-pal',
    text: 'Already refreshed and should stay out of stale refresh paths.',
    'refresh-foundation': true,
  });

  const summary = buildSummary(rootDir);

  assert.equal(summary.workLoop.currentPriority.id, 'foundation');
  assert.equal(
    summary.workLoop.currentPriority.command,
    summary.foundation.maintenance.refreshBundleCommand,
  );
  assert.equal(
    summary.workLoop.currentPriority.command,
    "(node src/index.js update foundation --person 'jane-doe') && (node src/index.js update foundation --person 'harry-han')",
  );
  assert.equal(summary.workLoop.currentPriority.nextAction, 'refresh stale or incomplete target profiles — starting with jane-doe (missing drafts + new materials)');
  assert.deepEqual(summary.workLoop.currentPriority.paths, [
    'profiles/jane-doe/memory/long-term/foundation.json',
    'profiles/jane-doe/skills/README.md',
    'profiles/jane-doe/soul/README.md',
    'profiles/jane-doe/voice/README.md',
    'profiles/harry-han/memory/long-term/foundation.json',
    'profiles/harry-han/skills/README.md',
    'profiles/harry-han/soul/README.md',
    'profiles/harry-han/voice/README.md',
  ]);
  assert.match(summary.promptPreview, /next action: refresh stale or incomplete target profiles — starting with jane-doe \(missing drafts \+ new materials\)/);
  assert.match(summary.promptPreview, /command: \(node src\/index\.js update foundation --person 'jane-doe'\) && \(node src\/index\.js update foundation --person 'harry-han'\)/);
  assert.match(summary.promptPreview, /refresh command: node src\/index\.js update foundation --stale/);
  assert.match(summary.promptPreview, /paths: profiles\/jane-doe\/memory\/long-term\/foundation\.json, profiles\/jane-doe\/skills\/README\.md, profiles\/jane-doe\/soul\/README\.md, profiles\/jane-doe\/voice\/README\.md, profiles\/harry-han\/memory\/long-term\/foundation\.json, profiles\/harry-han\/skills\/README\.md, profiles\/harry-han\/soul\/README\.md, profiles\/harry-han\/voice\/README\.md/);
  assert.equal(summary.foundation.maintenance.queuedProfiles[0].id, 'jane-doe');
  assert.equal(summary.foundation.maintenance.queuedProfiles[0].generatedDraftCount, 0);
  assert.equal(summary.foundation.maintenance.queuedProfiles[1].id, 'harry-han');
  assert.equal(summary.foundation.maintenance.queuedProfiles[1].generatedDraftCount, 4);
  assert.equal(summary.workLoop.priorities[1].id, 'ingestion');
  assert.equal(summary.workLoop.priorities[1].nextAction, 'refresh stale or incomplete target profiles');
  assert.equal(
    summary.workLoop.priorities[1].command,
    summary.ingestion.refreshFoundationBundleCommand,
  );
  assert.equal(
    summary.workLoop.priorities[1].command,
    "(node src/index.js update foundation --person 'jane-doe') && (node src/index.js update foundation --person 'harry-han')",
  );
  assert.deepEqual(summary.workLoop.priorities[1].paths, [
    'profiles/jane-doe/memory/long-term/foundation.json',
    'profiles/jane-doe/skills/README.md',
    'profiles/jane-doe/soul/README.md',
    'profiles/jane-doe/voice/README.md',
    'profiles/harry-han/memory/long-term/foundation.json',
    'profiles/harry-han/skills/README.md',
    'profiles/harry-han/soul/README.md',
    'profiles/harry-han/voice/README.md',
  ]);
});

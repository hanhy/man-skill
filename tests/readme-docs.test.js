import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSummary } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
const architectureDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'architecture.md'), 'utf8');
const ingestionDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'ingestion.md'), 'utf8');
const memoryDoc = fs.readFileSync(path.join(repoRoot, 'memory', 'README.md'), 'utf8');
const skillsDoc = fs.readFileSync(path.join(repoRoot, 'skills', 'README.md'), 'utf8');
const soulDoc = fs.readFileSync(path.join(repoRoot, 'SOUL.md'), 'utf8');
const voiceDoc = fs.readFileSync(path.join(repoRoot, 'voice', 'README.md'), 'utf8');
const userDoc = fs.readFileSync(path.join(repoRoot, 'USER.md'), 'utf8');
const profilesDoc = fs.readFileSync(path.join(repoRoot, 'profiles', 'README.md'), 'utf8');
const harryIntakeReadme = fs.readFileSync(path.join(repoRoot, 'profiles', 'harry-han', 'imports', 'README.md'), 'utf8');
const harryIntakeManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'profiles', 'harry-han', 'imports', 'materials.template.json'), 'utf8'));
const harryIntakeSample = fs.readFileSync(path.join(repoRoot, 'profiles', 'harry-han', 'imports', 'sample.txt'), 'utf8');

test('README documents the default delivery foundation targets and repo manifests', () => {
  assert.match(readme, /Delivery foundation/i);
  assert.match(readme, /Feishu, Telegram, WhatsApp, and Slack/);
  assert.match(readme, /OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen/);
  assert.match(readme, /work-loop queue follow that same order/i);
  assert.match(readme, /runtime-ready integrations that are still waiting on auth\/configuration/i);
  assert.match(readme, /\.env\.example/);
  assert.match(readme, /bootstrap blast radius explicit/i);
  assert.match(readme, /`\.env\.example` and `\.env`/);
  assert.match(readme, /manifests\/channels\.json/);
  assert.match(readme, /manifests\/providers\.json/);
});

test('architecture and ingestion docs explain work-loop leader/blocker semantics and sample-manifest entrypoints', () => {
  assert.match(architectureDoc, /canonical rollout order: Feishu, Telegram, WhatsApp, Slack/);
  assert.match(architectureDoc, /canonical rollout order: OpenAI, Anthropic, Kimi, Minimax, GLM, Qwen/);
  assert.match(architectureDoc, /keep Feishu, Telegram, WhatsApp, and Slack adapter manifests\/implementations visible in the delivery summary/);
  assert.match(architectureDoc, /surfacing both `leadingPriority` \(the first item in order, even when it is already ready\) and the actionable `currentPriority`/);
  assert.match(architectureDoc, /split readiness counters \(`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`\)/);
  assert.match(architectureDoc, /`USER\.md` current product direction loader.*ignores fenced or commented scaffold headings so only visible objectives drive the work loop while still accepting blockquoted visible headings\/list items/i);
  assert.match(architectureDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(architectureDoc, /shorter starter alias via `sampleStarterCommand`/);
  assert.match(architectureDoc, /bootstrap that means `paths` keeps both `\.env\.example` and `\.env` visible when `cp \.env\.example \.env` is the active delivery step/i);
  assert.match(architectureDoc, /once `\.env` is already present, switch the blocked rollout step to the narrower `touch '\.env' && \.{3}` populate helper so `paths` narrows to `\.env`/i);
  assert.match(architectureDoc, /delivery priorities as `blocked`.*rollout leader is auth-blocked and otherwise runtime-ready.*later channels\/providers still have missing implementation files/i);
  assert.match(architectureDoc, /sampleStarterSource/);
  assert.match(architectureDoc, /exact helper-command bundles for scaffold\/import\/refresh work/);
  assert.match(architectureDoc, /skills candidate-profile coverage/i);
  assert.match(ingestionDoc, /skills candidate-profile coverage/i);
  assert.match(architectureDoc, /repair-invalid-bundle/i);
  assert.match(architectureDoc, /repair-imported-invalid-bundle/i);
  assert.match(architectureDoc, /sample-message/i);
  assert.match(architectureDoc, /sample-talk/i);
  assert.match(architectureDoc, /sample-screenshot/i);
  assert.match(architectureDoc, /update-bundle/i);
  assert.match(architectureDoc, /sync-bundle/i);
  assert.match(ingestionDoc, /the top-level `workLoop` summary now also exposes both `leadingPriority` and `currentPriority`/);
  assert.match(ingestionDoc, /split readiness counters \(`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`\)/);
  assert.match(ingestionDoc, /`USER\.md` current product direction loader.*ignores fenced or commented scaffold headings so only visible objectives drive the work loop, while still accepting blockquoted visible headings and list items/i);
  assert.match(ingestionDoc, /metadata-only intake headline now treats `intakeReadyProfileCount` as `import-ready` coverage only/);
  assert.match(ingestionDoc, /blocked delivery priorities keep their exact env\/bootstrap command and surface both `\.env\.example` and `\.env` when the bootstrap step writes the repo-local env file/);
  assert.match(ingestionDoc, /once `\.env` already exists, the blocked delivery step narrows to the repo-local `touch '\.env' && \.{3}` populate helper so `paths` drops back to `\.env`/i);
  assert.match(ingestionDoc, /current rollout leader is auth-blocked and otherwise runtime-ready.*delivery priority also upgrades to `blocked`.*later channels\/providers still need implementation files/i);
  assert.match(ingestionDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(ingestionDoc, /shorter `sampleStarterCommand` visible as the friendly starter shortcut/);
  assert.match(ingestionDoc, /`sampleStarterSource` keeps the exact checked-in manifest path visible/i);
  assert.match(ingestionDoc, /`import intake --stale` bulk-imports only import-ready metadata-only intake scaffolds/i);
  assert.match(ingestionDoc, /without refreshing derived drafts by default/i);
  assert.match(ingestionDoc, /re-run the same bulk intake path with `--refresh-foundation` when you want memory \/ voice \/ soul \/ skills drafts regenerated in the same pass/i);
  assert.match(ingestionDoc, /plain `import intake --imported` path leaves derived drafts alone so you can inspect the replayed materials first/i);
  assert.match(ingestionDoc, /add `--refresh-foundation` when you want the same pass to regenerate memory \/ voice \/ soul \/ skills drafts too/i);
  assert.match(ingestionDoc, /repair-invalid-bundle/i);
  assert.match(ingestionDoc, /repair-imported-invalid-bundle/i);
  assert.match(ingestionDoc, /sample-message/i);
  assert.match(ingestionDoc, /sample-talk/i);
  assert.match(ingestionDoc, /sample-screenshot/i);
  assert.match(ingestionDoc, /update-bundle/i);
  assert.match(ingestionDoc, /sync-bundle/i);
});

test('checked-in USER current product direction stays aligned with the default work-loop objectives', () => {
  assert.match(userDoc, /## Current product direction/);
  assert.match(userDoc, /1\. strengthen the OpenClaw-like foundation around memory, skills, soul, and voice/);
  assert.match(userDoc, /2\. improve the user-facing ingestion\/update entrance for target-person materials/);
  assert.match(userDoc, /3\. add chat channels Feishu, Telegram, WhatsApp, and Slack/);
  assert.match(userDoc, /4\. add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen/);

  const summary = buildSummary(repoRoot);
  assert.deepEqual(summary.workLoop.objectives, [
    'strengthen the OpenClaw-like foundation around memory, skills, soul, and voice',
    'improve the user-facing ingestion/update entrance for target-person materials',
    'add chat channels Feishu, Telegram, WhatsApp, and Slack',
    'add model providers OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen',
    'report progress in small verified increments',
  ]);
});

test('checked-in intake scaffold stays aligned with the repo-level starter ingress for Harry Han', () => {
  assert.match(readme, /`update intake` writes `profiles\/<person-id>\/imports\/README\.md`, `sample\.txt`, and `materials\.template\.json`/);
  assert.match(ingestionDoc, /`update intake` bootstraps a profile-local landing zone at `profiles\/<person-id>\/imports\/` with a `README\.md`, a `sample\.txt` placeholder, and a `materials\.template\.json` starter manifest/);
  assert.match(readme, /Once an already-imported profile's drafts are fresh and it still has only the untouched `profiles\/<person-id>\/imports\/materials\.template\.json` starter manifest, the ingestion entrance keeps the top-level `next intake` step descriptive until entries are added, while the per-profile command palette still exposes the follow-up `import manifest --file \.\.\. --refresh-foundation` command/i);
  assert.match(ingestionDoc, /when an already-imported profile's drafts are already fresh and it still only has the untouched `profiles\/<id>\/imports\/materials\.template\.json` starter scaffold, the same `recommendedCommand` \/ `next intake` path stays descriptive until entries are added, while the per-profile command palette still exposes the follow-up `import manifest --file \.\.\. --refresh-foundation` command/i);
  assert.match(profilesDoc, /profiles\/<person-id>\/imports\//);
  assert.match(profilesDoc, /`update intake` bootstraps `profiles\/<person-id>\/imports\/README\.md`, `sample\.txt`, and `materials\.template\.json` as the profile-local user-facing landing zone/i);
  assert.match(profilesDoc, /plain `node src\/index\.js import intake --person <id>` replay path that keeps derived drafts untouched for inspection/i);
  assert.match(profilesDoc, /`node src\/index\.js import intake --person <id> --refresh-foundation` variant when the same rerun should regenerate memory \/ voice \/ soul \/ skills drafts/i);
  assert.match(profilesDoc, /`node src\/index\.js update profile --person <id>` path keeps metadata edits without requiring a new material import/i);

  assert.match(harryIntakeReadme, /^# Intake scaffold for Harry Han/m);
  assert.match(harryIntakeReadme, /Starter manifest: profiles\/harry-han\/imports\/materials\.template\.json/);
  assert.match(harryIntakeReadme, /Sample text placeholder: profiles\/harry-han\/imports\/sample\.txt/);
  assert.match(harryIntakeReadme, /Import after editing: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/);
  assert.match(harryIntakeReadme, /refresh this intake scaffold: node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.'/);
  assert.match(harryIntakeReadme, /edit target-profile metadata without refreshing drafts: node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.'/);
  assert.match(harryIntakeReadme, /sync target-profile metadata and refresh drafts: node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.' --refresh-foundation/);
  assert.doesNotMatch(harryIntakeReadme, /import intake --person 'harry-han'/);
  assert.match(harryIntakeReadme, /text: node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation/);
  assert.match(harryIntakeReadme, /message: node src\/index\.js import message --person harry-han --text <message> --refresh-foundation/);
  assert.match(harryIntakeReadme, /talk: node src\/index\.js import talk --person harry-han --text <snippet> --refresh-foundation/);
  assert.match(harryIntakeReadme, /screenshot: node src\/index\.js import screenshot --person harry-han --file <image\.png> --refresh-foundation/);

  assert.equal(harryIntakeManifest.personId, 'harry-han');
  assert.equal(harryIntakeManifest.displayName, 'Harry Han');
  assert.equal(harryIntakeManifest.summary, 'Direct operator with a bias for momentum and fast feedback loops.');
  assert.deepEqual(harryIntakeManifest.entries, []);
  assert.deepEqual(Object.keys(harryIntakeManifest.entryTemplates), ['text', 'message', 'talk', 'screenshot']);
  assert.equal(harryIntakeManifest.entryTemplates.text.file, 'sample.txt');
  assert.equal(harryIntakeManifest.entryTemplates.message.text, '<paste a representative short message>');
  assert.equal(harryIntakeManifest.entryTemplates.talk.text, '<paste a transcript snippet>');
  assert.equal(harryIntakeManifest.entryTemplates.screenshot.file, '<relative-path-to-image.png>');
  assert.match(harryIntakeSample, /Replace this file with a real writing sample for Harry Han\./);

  const summary = buildSummary(repoRoot);
  const harryCommand = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');
  assert.ok(harryCommand);
  assert.equal(harryCommand.intakeReady, true);
  assert.equal(harryCommand.intakeManifestStatus, 'starter');
  assert.equal(harryCommand.intakeManifestPath, 'profiles/harry-han/imports/materials.template.json');
  assert.equal(harryCommand.importIntakeWithoutRefreshCommand, null);
  assert.equal(harryCommand.importIntakeCommand, null);
  assert.equal(harryCommand.importManifestCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.equal(harryCommand.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.'");
  assert.equal(harryCommand.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.'");
  assert.equal(harryCommand.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.' --refresh-foundation");
  assert.equal(
    summary.workLoop.priorities.find((priority) => priority.id === 'ingestion')?.summary,
    '1 imported, 0 metadata-only, drafts 1 ready, 0 queued for refresh, 1 imported intake starter scaffold available',
  );
  assert.equal(summary.ingestion.recommendedCommand, null);
  assert.match(
    summary.promptPreview,
    /next intake: populate the imported intake starter manifest for Harry Han \(harry-han\) @ profiles\/harry-han\/imports, profiles\/harry-han\/imports\/README\.md, profiles\/harry-han\/imports\/materials\.template\.json, profiles\/harry-han\/imports\/sample\.txt/,
  );
  assert.match(
    summary.promptPreview,
    /Harry Han \(harry-han\): 4 materials \(message:1, screenshot:1, talk:1, text:1\), latest .* intake starter template — add entries before import \| manifest node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/,
  );
});

test('repo memory, skills, soul, and voice docs stay aligned with the structured foundation sections', () => {
  assert.match(readme, /Foundation contract/i);
  assert.match(readme, /OpenClaw-like/i);
  assert.match(readme, /memory\/README\.md.*What belongs here.*Buckets/i);
  assert.match(readme, /`daily\/` as the canonical short-term working-memory bucket/i);
  assert.match(readme, /memory summary still mirrors that bucket through `shortTermEntries` and `shortTermPresent` for legacy consumers/i);
  assert.match(readme, /memorySummary\.canonicalShortTermBucket.*memorySummary\.legacyShortTermAliases/i);
  assert.match(readme, /skills\/README\.md.*What lives here.*Layout/i);
  assert.match(readme, /SOUL\.md.*Core truths.*Boundaries.*Vibe.*Continuity/i);
  assert.match(readme, /voice\/README\.md.*Tone.*Signature moves.*Avoid.*Language hints/i);
  assert.match(readme, /prompt preview surfaces the exact missing sections plus a runnable repair command/i);
  assert.match(readme, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(readme, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(readme, /foundation\.core\.soul\.readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(readme, /foundation\.core\.voice\.readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(readme, /foundation\.core\.maintenance\.queuedAreas\[\*\]\.rootThinReadySections.*rootThinMissingSections.*rootThinReadySectionCount.*rootThinTotalSectionCount/i);
  assert.match(readme, /foundation\.core\.maintenance\.recommendedArea.*recommendedAction.*recommendedCommand.*recommendedPaths/i);
  assert.match(readme, /when the queue narrows to a single area, `recommendedStatus` and `recommendedSummary` carry that same target's detailed context/i);
  assert.match(readme, /foundation\.maintenance\.recommendedProfileId.*recommendedAction.*recommendedCommand.*recommendedPaths/i);
  assert.match(readme, /next repair.*next refresh/i);
  assert.match(architectureDoc, /`daily\/` .*canonical short-term working-memory bucket/i);
  assert.match(architectureDoc, /still exposing `shortTermEntries` and `shortTermPresent` as compatibility aliases for older summary consumers/i);
  assert.match(architectureDoc, /memorySummary\.canonicalShortTermBucket.*memorySummary\.legacyShortTermAliases/i);
  assert.match(architectureDoc, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.memory\.canonicalShortTermBucket.*foundation\.core\.memory\.legacyShortTermAliases/i);
  assert.match(architectureDoc, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.soul.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.voice.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(architectureDoc, /foundation\.core\.maintenance.*rootThinReadySections.*rootThinMissingSections.*rootThinReadySectionCount.*rootThinTotalSectionCount/i);
  assert.match(architectureDoc, /single-target-only detail fields \(`recommendedStatus`, `recommendedSummary` when exactly one area is queued\)/i);
  assert.match(architectureDoc, /checked-in root `SOUL\.md` stable on `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`/i);
  assert.match(architectureDoc, /checked-in root `voice\/README\.md` stable on `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`/i);
  assert.match(ingestionDoc, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.memory\.canonicalShortTermBucket.*foundation\.core\.memory\.legacyShortTermAliases/i);
  assert.match(ingestionDoc, /memorySummary\.canonicalShortTermBucket.*memorySummary\.legacyShortTermAliases/i);
  assert.match(ingestionDoc, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.soul.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.voice.*readySections.*missingSections.*readySectionCount.*totalSectionCount/i);
  assert.match(ingestionDoc, /foundation\.core\.maintenance.*rootThinReadySections.*rootThinMissingSections.*rootThinReadySectionCount.*rootThinTotalSectionCount/i);
  assert.match(ingestionDoc, /when the queue narrows to one area, the additive `recommendedStatus` and `recommendedSummary` fields carry that single target's detailed context/i);
  assert.match(ingestionDoc, /checked-in root docs stay parser-aligned: `SOUL\.md` should keep `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`, while `voice\/README\.md` should keep `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`/i);

  assert.match(memoryDoc, /## What belongs here/);
  assert.match(memoryDoc, /## Buckets/);
  assert.match(memoryDoc, /`daily\/`.*checked-in short-term bucket/i);

  assert.match(skillsDoc, /## What lives here/);
  assert.match(skillsDoc, /## Layout/);
  assert.match(skillsDoc, /- <skill>\/SKILL\.md: per-skill workflow and guidance/);
  assert.match(skillsDoc, /- <category>\/<skill>\/SKILL\.md: grouped skill families for larger registries/);
  assert.match(skillsDoc, /- README\.md: shared conventions for the repo skills layer/);

  assert.match(soulDoc, /## Core truths/);
  assert.match(soulDoc, /## Boundaries/);
  assert.match(soulDoc, /## Vibe/);
  assert.match(soulDoc, /## Continuity/);

  assert.match(voiceDoc, /## Tone/);
  assert.match(voiceDoc, /## Signature moves/);
  assert.match(voiceDoc, /## Avoid/);
  assert.match(voiceDoc, /## Language hints/);

  const summary = buildSummary(repoRoot);
  assert.equal(summary.foundation.core.overview.readyAreaCount, 4);
  assert.deepEqual(summary.foundation.core.overview.thinAreas, []);
  assert.deepEqual(summary.foundation.core.overview.missingAreas, []);
  assert.deepEqual(summary.foundation.core.memory.rootReadySections, ['what-belongs-here', 'buckets']);
  assert.deepEqual(summary.foundation.core.memory.rootMissingSections, []);
  assert.deepEqual(summary.foundation.core.skills.rootReadySections, ['what-lives-here', 'layout']);
  assert.deepEqual(summary.foundation.core.skills.rootMissingSections, []);
  assert.equal(summary.foundation.core.skills.count, 11);
  assert.deepEqual(summary.skills.skills.map((skill) => skill.id), [
    'channels/feishu',
    'channels/slack',
    'channels/telegram',
    'channels/whatsapp',
    'cron',
    'providers/anthropic',
    'providers/glm',
    'providers/kimi',
    'providers/minimax',
    'providers/openai',
    'providers/qwen',
  ]);
  assert.deepEqual(summary.foundation.core.soul.readySections, ['core-truths', 'boundaries', 'vibe', 'continuity']);
  assert.deepEqual(summary.foundation.core.soul.missingSections, []);
  assert.equal(summary.foundation.core.soul.readySectionCount, 4);
  assert.equal(summary.foundation.core.soul.totalSectionCount, 4);
  assert.deepEqual(summary.foundation.core.voice.readySections, ['tone', 'signature-moves', 'avoid', 'language-hints']);
  assert.deepEqual(summary.foundation.core.voice.missingSections, []);
  assert.equal(summary.foundation.core.voice.readySectionCount, 4);
  assert.equal(summary.foundation.core.voice.totalSectionCount, 4);
  assert.match(summary.promptPreview, /Core foundation:\n- coverage: 4\/4 ready\n- queue: 4 ready, 0 thin, 0 missing\n- ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\); skills docs 11\/11 \(channels\/feishu, channels\/slack, channels\/telegram, channels\/whatsapp, cron\), root sections 2\/2 \(what-lives-here, layout\); soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\); voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\)/);
  assert.doesNotMatch(summary.promptPreview, /- memory: README yes, daily 1, long-term 1, scratch 1/);
  assert.doesNotMatch(summary.promptPreview, /- skills: 11 registered, 11 documented/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 11\n- discovered: 11\n- custom: 0\n- top skills: channels\/feishu \[discovered\]: Use when wiring or reviewing the checked-in Feishu channel runtime helper.*; channels\/slack \[discovered\]: Use when wiring or reviewing the checked-in Slack channel runtime helper.*; channels\/telegram \[discovered\]: Use when wiring or reviewing the checked-in Telegram channel runtime helper.*; \+8 more/);
});

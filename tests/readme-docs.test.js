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
  assert.match(readme, /bootstrap blast radius honest/i);
  assert.match(readme, /`paths` stays source-focused on `?\.env\.example`?/i);
  assert.match(readme, /manifests\/channels\.json/);
  assert.match(readme, /manifests\/providers\.json/);
});

test('architecture and ingestion docs explain work-loop leader/blocker semantics and sample-manifest entrypoints', () => {
  assert.match(architectureDoc, /canonical rollout order: Feishu, Telegram, WhatsApp, Slack/);
  assert.match(architectureDoc, /canonical rollout order: OpenAI, Anthropic, Kimi, Minimax, GLM, Qwen/);
  assert.match(architectureDoc, /keep Feishu, Telegram, WhatsApp, and Slack adapter manifests\/implementations visible in the delivery summary/);
  assert.match(architectureDoc, /surfacing both `leadingPriority` \(the first item in order, even when it is already ready\) and the queued-or-blocked `currentPriority`/);
  assert.match(architectureDoc, /`runnablePriority` for the first still-runnable step in priority order.*ready follow-up.*imported intake starter manifest/i);
  assert.match(architectureDoc, /`actionableReadyPriority` as the narrower ready-only advisory alias/);
  assert.match(architectureDoc, /split readiness counters \(`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`\)/);
  assert.match(architectureDoc, /`USER\.md` current product direction loader.*ignores fenced or commented scaffold headings so only visible objectives drive the work loop while still accepting blockquoted visible headings\/list items/i);
  assert.match(architectureDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(architectureDoc, /shorter starter alias via `sampleStarterCommand`/);
  assert.match(architectureDoc, /during bootstrap that means `paths` stays source-focused on `\.env\.example` so the active step names the shared template rather than both source and destination/i);
  assert.match(architectureDoc, /once `\.env` is already present, switch the blocked rollout step to the narrower `touch '\.env' && \.{3}` populate helper so `paths` narrows to `\.env`/i);
  assert.match(architectureDoc, /delivery priorities as `blocked`.*rollout leader is auth-blocked and otherwise runtime-ready.*later channels\/providers still have missing implementation files/i);
  assert.match(architectureDoc, /sampleStarterSource/);
  assert.match(architectureDoc, /exact helper-command bundles for scaffold\/import\/refresh work/);
  assert.match(architectureDoc, /skills candidate-profile coverage/i);
  assert.match(architectureDoc, /keep both files in the canonical `daily` count\/list rather than collapsing them to one basename match/i);
  assert.match(ingestionDoc, /skills candidate-profile coverage/i);
  assert.match(ingestionDoc, /keeps both files in the canonical `daily` count\/list instead of collapsing them to one basename match/i);
  assert.match(architectureDoc, /repair-invalid-bundle/i);
  assert.match(architectureDoc, /repair-imported-invalid-bundle/i);
  assert.match(architectureDoc, /sample-message/i);
  assert.match(architectureDoc, /sample-talk/i);
  assert.match(architectureDoc, /sample-screenshot/i);
  assert.match(architectureDoc, /update-bundle/i);
  assert.match(architectureDoc, /sync-bundle/i);
  assert.match(ingestionDoc, /the top-level `workLoop` summary now also exposes both `leadingPriority` and `currentPriority`/);
  assert.match(ingestionDoc, /`runnablePriority` for the first still-runnable step in priority order.*ready follow-up.*imported starter-manifest edits/i);
  assert.match(ingestionDoc, /`actionableReadyPriority` as the ready-only advisory alias/);
  assert.match(ingestionDoc, /split readiness counters \(`readyPriorityCount`, `queuedPriorityCount`, `blockedPriorityCount`\)/);
  assert.match(ingestionDoc, /`USER\.md` current product direction loader.*ignores fenced or commented scaffold headings so only visible objectives drive the work loop, while still accepting blockquoted visible headings and list items/i);
  assert.match(ingestionDoc, /metadata-only intake headline now treats `intakeReadyProfileCount` as `import-ready` coverage only/);
  assert.match(ingestionDoc, /blocked delivery priorities keep their exact env\/bootstrap command while keeping bootstrap `paths` source-focused on `\.env\.example`/);
  assert.match(ingestionDoc, /once `\.env` already exists, the blocked delivery step narrows to the repo-local `touch '\.env' && \.{3}` populate helper so `paths` drops back to `\.env`/i);
  assert.match(ingestionDoc, /current rollout leader is auth-blocked and otherwise runtime-ready.*delivery priority also upgrades to `blocked`.*later channels\/providers still need implementation files/i);
  assert.match(ingestionDoc, /exact checked-in sample manifest command via `sampleManifestCommand`/);
  assert.match(ingestionDoc, /shorter `sampleStarterCommand` visible as the friendly starter shortcut/);
  assert.match(ingestionDoc, /`sampleStarterSource` keeps the exact checked-in manifest path visible/i);
  assert.match(ingestionDoc, /`import intake --stale` bulk-imports only import-ready metadata-only intake scaffolds/i);
  assert.match(ingestionDoc, /without refreshing derived drafts by default/i);
  assert.match(ingestionDoc, /re-run the same bulk intake path with `--refresh-foundation` when you want memory \/ voice \/ soul \/ skills drafts regenerated in the same pass/i);
  assert.match(ingestionDoc, /node src\/index\.js import intake --all\s+node src\/index\.js import intake --all --refresh-foundation/i);
  assert.match(ingestionDoc, /plain `--all` path preserves existing drafts so you can inspect the replayed records first/i);
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

test('README keeps the intake replay defaults aligned with the CLI entrance semantics', () => {
  assert.match(readme, /preserves both files in the canonical `daily` count\/list instead of collapsing them to one basename match/i);
  assert.match(readme, /backfill missing intake landing zones for already-imported profiles with `update intake --imported`/i);
  assert.match(readme, /re-run that imported backfill plus draft regeneration with `update intake --imported --refresh-foundation` when the touched profiles already have materials on disk/i);
  assert.match(readme, /bulk-import only first-run metadata-only intake manifests with `import intake --stale`/i);
  assert.match(readme, /re-run the same first-run batch with `import intake --stale --refresh-foundation` when you want the import pass to regenerate derived memory \/ voice \/ soul \/ skills drafts too/i);
  assert.match(readme, /bulk-import only already-imported profile-local intake manifests with `import intake --imported`/i);
  assert.match(readme, /re-run imported intake replay with `import intake --imported --refresh-foundation` when you want the same pass to regenerate derived memory \/ voice \/ soul \/ skills drafts/i);
  assert.match(readme, /re-run the broader `import intake --all` replay with `import intake --all --refresh-foundation` when you intentionally want every ready profile-local intake manifest/i);
  assert.match(readme, /Batch `update intake --stale` and `update intake --all` remain scaffold-only metadata prep, so even when `--refresh-foundation` is present they do not import materials or regenerate drafts on their own/i);
  assert.match(ingestionDoc, /node src\/index\.js update intake --stale\s+node src\/index\.js update intake --stale --refresh-foundation/i);
  assert.match(ingestionDoc, /Even if you pass `--refresh-foundation`, the returned `foundationRefresh` bundle stays empty until those touched profiles have imported materials/i);
  assert.match(ingestionDoc, /node src\/index\.js update intake --imported\s+node src\/index\.js update intake --imported --refresh-foundation/i);
  assert.match(ingestionDoc, /Add `--refresh-foundation` when you want the same pass to regenerate memory \/ voice \/ soul \/ skills drafts for those already-imported profiles once the intake landing zone is back in place/i);
  assert.match(ingestionDoc, /node src\/index\.js update intake --all\s+node src\/index\.js update intake --all --refresh-foundation/i);
  assert.match(ingestionDoc, /Like `update intake --stale`, this remains scaffold-only metadata prep until those targets have imported materials, so the optional `foundationRefresh` bundle stays empty on purely metadata-only runs/i);
  assert.match(readme, /`node src\/index\.js --help` now prints a concise operator-facing usage guide/i);
  assert.match(readme, /without refreshing derived drafts by default/i);
});

test('checked-in intake scaffold stays aligned with the repo-level starter ingress for Harry Han', () => {
  assert.match(readme, /`update intake` writes `profiles\/<person-id>\/imports\/README\.md`, creates `profiles\/<person-id>\/imports\/images\/` for screenshot assets, and seeds `sample\.txt` plus `materials\.template\.json`/i);
  assert.match(ingestionDoc, /`update intake` bootstraps a profile-local landing zone at `profiles\/<person-id>\/imports\/` with a `README\.md`, an `images\/` folder for screenshot assets, a `sample\.txt` placeholder, and a `materials\.template\.json` starter manifest/i);
  assert.match(readme, /`materials\.template\.json` file paths resolve relative to `profiles\/<person-id>\/imports\/`, so local screenshots or attachments can live beside `sample\.txt` \(or under a small subdirectory like `imports\/images\/`\)/i);
  assert.match(ingestionDoc, /`materials\.template\.json` resolves `file` paths relative to `profiles\/<person-id>\/imports\/`, so operators can keep local assets beside `sample\.txt` or under a small sibling folder like `imports\/images\/`/i);
  assert.match(readme, /Once an already-imported profile's drafts are fresh and it still has only the untouched `profiles\/<person-id>\/imports\/materials\.template\.json` starter manifest, the ingestion entrance keeps the top-level `next intake` step descriptive while also surfacing `recommendedEditPath`, `recommendedEditPaths`, `recommendedFollowUpCommand`, and `recommendedFallbackCommand`, so operators know which file to edit in the single-profile case, which manifest set to edit in the bundled multi-profile case, which `import intake --person <id> --refresh-foundation` replay to run next, and which direct starter import still works as a fallback/i);
  assert.match(readme, /per-profile prompt-preview line now also keeps the local scaffold refresh visible as `refresh-intake node src\/index\.js update intake --person \.{3}`, an `inspect-after-edit node src\/index\.js import intake --person \.{3}` replay for a plain post-edit inspection pass, and a matching `replay-after-edit node src\/index\.js import intake --person \.{3} --refresh-foundation` follow-up/i);
  assert.match(ingestionDoc, /recommendedEditPath`.*`recommendedEditPaths`.*`recommendedFollowUpCommand`/i);
  assert.match(ingestionDoc, /starter-template profile rows in the prompt preview now also keep `refresh-intake node src\/index\.js update intake --person \.{3}` visible beside manifest\/import actions, plus both post-edit intake reruns: `inspect-after-edit node src\/index\.js import intake --person <id>` for a plain replay and `replay-after-edit node src\/index\.js import intake --person <id> --refresh-foundation` when the same pass should regenerate drafts too/i);
  assert.match(ingestionDoc, /per-profile command bundles now also carry both `followUpImportIntakeWithoutRefreshCommand` and `followUpImportIntakeCommand`, so starter-template profiles advertise the plain `import intake --person <id>` inspection replay and the `--refresh-foundation` replay that becomes runnable after editing a starter manifest/i);
  assert.match(profilesDoc, /profiles\/<person-id>\/imports\//);
  assert.match(profilesDoc, /## User-facing ingestion entrance/);
  assert.match(profilesDoc, /`update intake` bootstraps `profiles\/<person-id>\/imports\/README\.md`, an `images\/` folder for screenshot assets, `sample\.txt`, and `materials\.template\.json` as the profile-local user-facing landing zone/i);
  assert.match(profilesDoc, /plain `node src\/index\.js import intake --person <id>` replay path that keeps derived drafts untouched for inspection/i);
  assert.match(profilesDoc, /`node src\/index\.js import intake --person <id> --refresh-foundation` variant when the same rerun should regenerate memory \/ voice \/ soul \/ skills drafts/i);
  assert.match(profilesDoc, /direct `import manifest --file \.\.\. --refresh-foundation` and one-off `import text\|message\|talk\|screenshot \.\.\.` paths/i);
  assert.match(profilesDoc, /top-level recommendation stays edit-first: `recommendedCommand` remains empty while `recommendedEditPath` points at the manifest for a single starter-template profile, `recommendedEditPaths` expands that into a bundled manifest set when multiple imported starter templates are queued, `recommendedFollowUpCommand` shows the `import intake --person <id> --refresh-foundation` replay to run after the edit, and `recommendedFallbackCommand` keeps the seeded direct starter import visible when operators want a stopgap import before customizing the manifest/i);
  assert.match(profilesDoc, /per-profile command palette still stays actionable in that starter-template state/i);
  assert.match(profilesDoc, /`refresh-intake` via `node src\/index\.js update intake --person <id> \.\.\.`/i);
  assert.match(profilesDoc, /`after-editing import` via `node src\/index\.js import intake --person <id>` when you want to inspect the replay without regenerating drafts yet/i);
  assert.match(profilesDoc, /`after-editing import\+refresh` via `node src\/index\.js import intake --person <id> --refresh-foundation` when the same replay should regenerate memory \/ voice \/ soul \/ skills drafts/i);
  assert.match(profilesDoc, /`importManifestWithoutRefreshCommand` for `node src\/index\.js import manifest --file 'profiles\/<id>\/imports\/materials\.template\.json'`/i);
  assert.match(profilesDoc, /`importManifestCommand` for `node src\/index\.js import manifest --file 'profiles\/<id>\/imports\/materials\.template\.json' --refresh-foundation`/i);
  assert.match(profilesDoc, /`starterImportCommand` for the checked-in `profiles\/<id>\/imports\/sample\.txt` starter import/i);
  assert.match(profilesDoc, /both `followUpImportIntakeWithoutRefreshCommand` and `followUpImportIntakeCommand` so the prompt preview can surface the plain `import intake --person <id>` inspection replay and the `--refresh-foundation` replay that become runnable after editing the starter manifest/i);
  assert.match(profilesDoc, /`updateProfileAndRefreshCommand` for metadata edits plus immediate draft regeneration/i);
  assert.match(profilesDoc, /`node src\/index\.js update profile --person <id>` path keeps metadata edits without requiring a new material import/i);

  assert.match(harryIntakeReadme, /^# Intake scaffold for Harry Han/m);
  assert.match(harryIntakeReadme, /Starter manifest: profiles\/harry-han\/imports\/materials\.template\.json/);
  assert.match(harryIntakeReadme, /Sample text placeholder: profiles\/harry-han\/imports\/sample\.txt/);
  assert.match(harryIntakeReadme, /Import after editing: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(harryIntakeReadme, /`materials\.template\.json` resolves every `file` relative to `profiles\/harry-han\/imports\/`\./);
  assert.match(harryIntakeReadme, /if you save a screenshot at `profiles\/harry-han\/imports\/images\/chat\.png`, use `images\/chat\.png` inside the manifest/i);
  assert.match(harryIntakeReadme, /Starter entry examples:/);
  assert.match(harryIntakeReadme, /"file": "sample\.txt"/);
  assert.match(harryIntakeReadme, /"text": "Ship the thin slice first, then tighten it with real feedback\."/);
  assert.match(harryIntakeReadme, /"text": "If we can learn it in one run today, that beats polishing a big plan all week\."/);
  assert.match(harryIntakeReadme, /"file": "images\/chat\.png"/);
  assert.match(harryIntakeReadme, /refresh this intake scaffold: node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.'/);
  assert.match(harryIntakeReadme, /after editing, replay the profile-local intake without refreshing drafts: node src\/index\.js import intake --person 'harry-han'/);
  assert.match(harryIntakeReadme, /after editing, replay the profile-local intake and refresh drafts: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(harryIntakeReadme, /edit target-profile metadata without refreshing drafts: node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.'/);
  assert.match(harryIntakeReadme, /sync target-profile metadata and refresh drafts: node src\/index\.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.' --refresh-foundation/);
  assert.match(harryIntakeReadme, /Import after editing: node src\/index\.js import intake --person 'harry-han' --refresh-foundation/);
  assert.match(harryIntakeReadme, /text: node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation/);
  assert.match(harryIntakeReadme, /message: node src\/index\.js import message --person harry-han --text <message> --refresh-foundation/);
  assert.match(harryIntakeReadme, /talk: node src\/index\.js import talk --person harry-han --text <snippet> --refresh-foundation/);
  assert.match(harryIntakeReadme, /Starter image folder: profiles\/harry-han\/imports\/images/);
  assert.match(harryIntakeReadme, /screenshot: node src\/index\.js import screenshot --person harry-han --file <image\.png> --refresh-foundation/);
  assert.match(harryIntakeReadme, /manifest: node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation/);

  assert.equal(harryIntakeManifest.personId, 'harry-han');
  assert.equal(harryIntakeManifest.displayName, 'Harry Han');
  assert.equal(harryIntakeManifest.summary, 'Direct operator with a bias for momentum and fast feedback loops.');
  assert.deepEqual(harryIntakeManifest.entries, []);
  assert.deepEqual(Object.keys(harryIntakeManifest.entryTemplates), ['text', 'message', 'talk', 'screenshot']);
  assert.equal(harryIntakeManifest.entryTemplates.text.file, 'sample.txt');
  assert.equal(harryIntakeManifest.entryTemplates.message.text, '<paste a representative short message>');
  assert.equal(harryIntakeManifest.entryTemplates.talk.text, '<paste a transcript snippet>');
  assert.equal(harryIntakeManifest.entryTemplates.screenshot.file, 'images/chat.png');
  assert.match(harryIntakeSample, /Replace this file with a real writing sample for Harry Han\./);

  const summary = buildSummary(repoRoot);
  const harryCommand = summary.ingestion.allProfileCommands.find((profile) => profile.personId === 'harry-han');
  assert.ok(harryCommand);
  assert.equal(harryCommand.intakeReady, true);
  assert.equal(harryCommand.intakeManifestStatus, 'starter');
  assert.equal(harryCommand.intakeManifestPath, 'profiles/harry-han/imports/materials.template.json');
  assert.equal(harryCommand.importIntakeWithoutRefreshCommand, null);
  assert.equal(harryCommand.importIntakeCommand, null);
  assert.equal(harryCommand.starterImportCommand, "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation");
  assert.equal(harryCommand.importManifestWithoutRefreshCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json'");
  assert.equal(harryCommand.importManifestCommand, "node src/index.js import manifest --file 'profiles/harry-han/imports/materials.template.json' --refresh-foundation");
  assert.equal(harryCommand.followUpImportIntakeWithoutRefreshCommand, "node src/index.js import intake --person 'harry-han'");
  assert.equal(harryCommand.followUpImportIntakeCommand, "node src/index.js import intake --person 'harry-han' --refresh-foundation");
  assert.equal(harryCommand.updateIntakeCommand, "node src/index.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.'");
  assert.equal(harryCommand.updateProfileCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.'");
  assert.equal(harryCommand.updateProfileAndRefreshCommand, "node src/index.js update profile --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops.' --refresh-foundation");
  assert.equal(
    summary.workLoop.priorities.find((priority) => priority.id === 'ingestion')?.summary,
    '1 imported, 0 metadata-only, drafts 1 ready, 0 queued for refresh, 1 imported intake starter scaffold available',
  );
  assert.equal(summary.ingestion.recommendedCommand, null);
  assert.equal(summary.ingestion.recommendedFallbackCommand, "node src/index.js import text --person harry-han --file 'profiles/harry-han/imports/sample.txt' --refresh-foundation");
  assert.equal(summary.ingestion.recommendedEditPath, 'profiles/harry-han/imports/materials.template.json');
  assert.equal(
    summary.ingestion.recommendedFollowUpCommand,
    "node src/index.js import intake --person 'harry-han' --refresh-foundation",
  );
  assert.match(
    summary.promptPreview,
    /next intake: populate the imported intake starter manifest for Harry Han \(harry-han\); edit profiles\/harry-han\/imports\/materials\.template\.json; then run node src\/index\.js import intake --person 'harry-han' --refresh-foundation; fallback node src\/index\.js import text --person harry-han --file 'profiles\/harry-han\/imports\/sample\.txt' --refresh-foundation @ profiles\/harry-han\/imports, profiles\/harry-han\/imports\/images, profiles\/harry-han\/imports\/README\.md, profiles\/harry-han\/imports\/materials\.template\.json, profiles\/harry-han\/imports\/sample\.txt/,
  );
  assert.match(
    summary.promptPreview,
    /Harry Han \(harry-han\): 4 materials \(message:1, screenshot:1, talk:1, text:1\), latest .* intake starter template — add entries before import \| refresh-intake node src\/index\.js update intake --person 'harry-han' --display-name 'Harry Han' --summary 'Direct operator with a bias for momentum and fast feedback loops\.' \| manifest-inspect node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' \| manifest node src\/index\.js import manifest --file 'profiles\/harry-han\/imports\/materials\.template\.json' --refresh-foundation \| inspect-after-edit node src\/index\.js import intake --person 'harry-han' \| replay-after-edit node src\/index\.js import intake --person 'harry-han' --refresh-foundation/,
  );
});

test('repo memory, skills, soul, and voice docs stay aligned with the structured foundation sections', () => {
  assert.match(readme, /Foundation contract/i);
  assert.match(readme, /OpenClaw-like/i);
  assert.match(readme, /memory\/README\.md.*What belongs here.*Buckets/i);
  assert.match(readme, /`daily\/` as the canonical short-term working-memory bucket/i);
  assert.match(readme, /legacy `memory\/short-term\/` files into that same canonical `daily` lane at load time/i);
  assert.match(readme, /memory summary still mirrors that bucket through `shortTermEntries` and `shortTermPresent` for legacy consumers/i);
  assert.match(readme, /memorySummary\.canonicalShortTermBucket.*memorySummary\.legacyShortTermAliases/i);
  assert.match(readme, /memorySummary\.legacyShortTermSourceCount.*memorySummary\.legacyShortTermSources.*legacyShortTermSampleSources.*legacyShortTermSourceOverflowCount/i);
  assert.match(readme, /first three `memory\/short-term\/\.\.\.` paths plus a `\+N more` remainder marker/i);
  assert.match(readme, /top-level `Memory store:` preview.*foundation\.core\.memory\.rootExcerpt.*rootPath.*memory\/README\.md/i);
  assert.match(readme, /skills\/README\.md.*What lives here.*Layout/i);
  assert.match(readme, /default checked-in skill catalog stays explicit: 4 channel guides \(`channels\/feishu`, `channels\/slack`, `channels\/telegram`, `channels\/whatsapp`\), 6 provider guides \(`providers\/anthropic`, `providers\/glm`, `providers\/kimi`, `providers\/minimax`, `providers\/openai`, `providers\/qwen`\), plus `cron`/i);
  assert.match(readme, /summary\.skills\.categoryCounts.*foundation\.core\.skills\.categoryCounts.*foundation\.core\.skills\.documentedCategoryCounts/i);
  assert.match(readme, /SOUL\.md.*Core truths.*Boundaries.*Vibe.*Continuity/i);
  assert.match(readme, /voice\/README\.md.*Tone.*Signature moves.*Avoid.*Language hints/i);
  assert.match(readme, /top-level `Soul profile:` and `Voice profile:` preview blocks.*foundation\.core\.soul\|voice\.rootExcerpt.*rootPath.*heading aliases/i);
  assert.match(readme, /prompt preview surfaces the exact missing sections plus a runnable repair command/i);
  assert.match(readme, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount.*headingAliases/i);
  assert.match(readme, /what-lives-here->what-belongs-here.*layout->buckets/i);
  assert.match(readme, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount.*headingAliases/i);
  assert.match(readme, /what-belongs-here->what-lives-here.*buckets->layout/i);
  assert.match(readme, /foundation\.core\.soul\.readySections.*missingSections.*readySectionCount.*totalSectionCount.*headingAliases/i);
  assert.match(readme, /core-values->core-truths.*decision-rules->continuity/i);
  assert.match(readme, /foundation\.core\.voice\.readySections.*missingSections.*readySectionCount.*totalSectionCount.*headingAliases/i);
  assert.match(readme, /voice-should-capture->signature-moves.*voice-should-not-capture->avoid.*current-default->language-hints/i);
  assert.match(readme, /foundation\.core\.maintenance\.queuedAreas\[\*\]\.rootThinReadySections.*rootThinMissingSections.*rootThinReadySectionCount.*rootThinTotalSectionCount/i);
  assert.match(readme, /memory\/daily\/\$\(date \+%F\)\.md.*memory\/long-term\/notes\.md.*memory\/scratch\/draft\.md/i);
  assert.match(readme, /foundation\.core\.maintenance\.recommendedArea.*recommendedAction.*recommendedCommand.*recommendedPaths/i);
  assert.match(readme, /when the queue narrows to a single area, `recommendedStatus` and `recommendedSummary` carry that same target's detailed context/i);
  assert.match(readme, /foundation\.maintenance\.recommendedProfileId.*recommendedAction.*recommendedCommand.*recommendedPaths/i);
  assert.match(readme, /next repair.*next refresh/i);
  assert.match(architectureDoc, /`daily\/` .*canonical short-term working-memory bucket/i);
  assert.match(architectureDoc, /legacy `memory\/short-term\/` files still fold into the canonical `daily` lane/i);
  assert.match(architectureDoc, /still exposing `shortTermEntries` and `shortTermPresent` as compatibility aliases for older summary consumers/i);
  assert.match(architectureDoc, /memorySummary\.canonicalShortTermBucket.*memorySummary\.legacyShortTermAliases/i);
  assert.match(architectureDoc, /foundation\.core\.memory\.legacyShortTermSourceCount.*foundation\.core\.memory\.legacyShortTermSources.*legacyShortTermSampleSources.*legacyShortTermSourceOverflowCount/i);
  assert.match(architectureDoc, /summary\.skills\.categoryCounts.*foundation\.core\.skills\.categoryCounts.*foundation\.core\.skills\.documentedCategoryCounts/i);
  assert.match(architectureDoc, /top-level `Memory store:` preview.*foundation\.core\.memory\.rootExcerpt.*rootPath.*memory\/README\.md/i);

  assert.match(architectureDoc, /foundation\.core\.memory\.canonicalShortTermBucket.*foundation\.core\.memory\.legacyShortTermAliases/i);
  assert.match(architectureDoc, /foundation\.core\.memory\.legacyShortTermSourceCount.*foundation\.core\.memory\.legacyShortTermSources.*legacyShortTermSampleSources.*legacyShortTermSourceOverflowCount/i);
  assert.match(architectureDoc, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount.*headingAliases/i);
  assert.match(architectureDoc, /what-lives-here->what-belongs-here.*layout->buckets/i);
  assert.match(architectureDoc, /what-belongs-here->what-lives-here.*buckets->layout/i);
  assert.match(architectureDoc, /foundation\.core\.soul.*readySections.*missingSections.*readySectionCount.*totalSectionCount.*headingAliases/i);
  assert.match(architectureDoc, /core-values->core-truths.*decision-rules->continuity/i);
  assert.match(architectureDoc, /foundation\.core\.voice.*readySections.*missingSections.*readySectionCount.*totalSectionCount.*headingAliases/i);
  assert.match(architectureDoc, /voice-should-capture->signature-moves.*voice-should-not-capture->avoid.*current-default->language-hints/i);
  assert.match(architectureDoc, /foundation\.core\.maintenance.*rootThinReadySections.*rootThinMissingSections.*rootThinReadySectionCount.*rootThinTotalSectionCount/i);
  assert.match(architectureDoc, /single-target-only detail fields \(`recommendedStatus`, `recommendedSummary` when exactly one area is queued\)/i);
  assert.match(architectureDoc, /mirror those same `foundation\.core\.soul\|voice` root excerpts, section counts, and optional heading aliases into the compact top-level `Soul profile:` \/ `Voice profile:` prompt blocks/i);
  assert.match(architectureDoc, /checked-in root `SOUL\.md` stable on `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`/i);
  assert.match(architectureDoc, /checked-in root `voice\/README\.md` stable on `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`/i);
  assert.match(architectureDoc, /compact `ready details` line.*`@ memory\/README\.md`, `@ skills\/README\.md`, `@ SOUL\.md`, `@ voice\/README\.md`/i);
  assert.match(architectureDoc, /memory\/daily\/\$\(date \+%F\)\.md.*memory\/long-term\/notes\.md.*memory\/scratch\/draft\.md/i);
  assert.match(ingestionDoc, /foundation\.core\.memory\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount.*headingAliases/i);
  assert.match(ingestionDoc, /foundation\.core\.memory\.canonicalShortTermBucket.*foundation\.core\.memory\.legacyShortTermAliases/i);
  assert.match(ingestionDoc, /foundation\.core\.memory\.legacyShortTermSourceCount.*foundation\.core\.memory\.legacyShortTermSources.*legacyShortTermSampleSources.*legacyShortTermSourceOverflowCount/i);
  assert.match(ingestionDoc, /repo loading also folds legacy `memory\/short-term\/` files into that canonical `daily` lane/i);
  assert.match(ingestionDoc, /memorySummary\.canonicalShortTermBucket.*memorySummary\.legacyShortTermAliases/i);
  assert.match(ingestionDoc, /memorySummary\.legacyShortTermSourceCount.*memorySummary\.legacyShortTermSources.*legacyShortTermSampleSources.*legacyShortTermSourceOverflowCount/i);
  assert.match(ingestionDoc, /foundation\.core\.skills\.rootReadySections.*rootMissingSections.*rootReadySectionCount.*rootTotalSectionCount.*headingAliases/i);
  assert.match(ingestionDoc, /what-lives-here->what-belongs-here.*layout->buckets/i);
  assert.match(ingestionDoc, /what-belongs-here->what-lives-here.*buckets->layout/i);
  assert.match(ingestionDoc, /foundation\.core\.soul.*readySections.*missingSections.*readySectionCount.*totalSectionCount.*headingAliases/i);
  assert.match(ingestionDoc, /core-values->core-truths.*decision-rules->continuity/i);
  assert.match(ingestionDoc, /foundation\.core\.voice.*readySections.*missingSections.*readySectionCount.*totalSectionCount.*headingAliases/i);
  assert.match(ingestionDoc, /voice-should-capture->signature-moves.*voice-should-not-capture->avoid.*current-default->language-hints/i);
  assert.match(ingestionDoc, /foundation\.core\.maintenance.*rootThinReadySections.*rootThinMissingSections.*rootThinReadySectionCount.*rootThinTotalSectionCount/i);
  assert.match(ingestionDoc, /memory\/daily\/\$\(date \+%F\)\.md.*memory\/long-term\/notes\.md.*memory\/scratch\/draft\.md/i);
  assert.match(ingestionDoc, /compact ready-state line.*`@ memory\/README\.md`, `@ skills\/README\.md`, `@ SOUL\.md`, `@ voice\/README\.md`/i);
  assert.match(ingestionDoc, /first three `memory\/short-term\/\.\.\.` paths plus a `\+N more` remainder marker/i);
  assert.match(ingestionDoc, /when the queue narrows to one area, the additive `recommendedStatus` and `recommendedSummary` fields carry that single target's detailed context/i);
  assert.match(ingestionDoc, /starterImportCommand.*helperCommands` block .*starterImport/i);
  assert.match(ingestionDoc, /checked-in root docs stay parser-aligned: `SOUL\.md` should keep `## Core truths`, `## Boundaries`, `## Vibe`, and `## Continuity`, while `voice\/README\.md` should keep `## Tone`, `## Signature moves`, `## Avoid`, and `## Language hints`/i);

  assert.match(memoryDoc, /## What belongs here/);
  assert.match(memoryDoc, /## Buckets/);
  assert.match(memoryDoc, /legacy `memory\/short-term\/` files are folded into `daily\/`/);

  assert.match(skillsDoc, /## What lives here/);
  assert.match(skillsDoc, /## Layout/);
  assert.match(skillsDoc, /- <skill>\/SKILL\.md: per-skill workflow and guidance/);
  assert.match(skillsDoc, /- <category>\/<skill>\/SKILL\.md: grouped skill families for larger registries/);
  assert.match(skillsDoc, /- README\.md: shared conventions for the repo skills layer/);
  assert.match(skillsDoc, /## Default checked-in catalog/);
  assert.match(skillsDoc, /- channels: `channels\/feishu`, `channels\/slack`, `channels\/telegram`, `channels\/whatsapp`/);
  assert.match(skillsDoc, /- providers: `providers\/anthropic`, `providers\/glm`, `providers\/kimi`, `providers\/minimax`, `providers\/openai`, `providers\/qwen`/);
  assert.match(skillsDoc, /- utilities: `cron`/);

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
  assert.deepEqual(summary.skills.categoryCounts, { channels: 4, providers: 6, root: 1 });
  assert.deepEqual(summary.foundation.core.skills.categoryCounts, { channels: 4, providers: 6, root: 1 });
  assert.deepEqual(summary.foundation.core.skills.documentedCategoryCounts, { channels: 4, providers: 6, root: 1 });
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
  assert.match(summary.promptPreview, /Soul profile:\n- excerpt: .*\n- core truths: \d+\n- boundaries: \d+\n- vibe: \d+\n- continuity: \d+\n- root: .* @ SOUL\.md\n- sections: 4\/4 ready \(core-truths, boundaries, vibe, continuity\)/);
  assert.match(summary.promptPreview, /Voice profile:\n- tone: .*\n- style: documented\n- constraints: \d+ \(.*\)\n- signatures: \d+ \(.*\)\n- language hints: \d+ \(.*\)\n- root: .* @ voice\/README\.md\n- sections: 4\/4 ready \(tone, signature-moves, avoid, language-hints\)/);
  assert.match(summary.promptPreview, /Memory store:\n- daily: 1\n- long-term: 1\n- scratch: 1\n- total: 3\n- buckets: 3\/3 ready \(daily, long-term, scratch\)\n- aliases: daily canonical via shortTermEntries, shortTermPresent\n- root: This directory stores the agent's durable and working memory in plain files\. @ memory\/README\.md\n- root sections: 2\/2 ready \(what-belongs-here, buckets\)/);
  assert.match(summary.promptPreview, /Core foundation:\n- coverage: 4\/4 ready\n- queue: 4 ready, 0 thin, 0 missing\n- ready details: memory buckets 3\/3 \(daily, long-term, scratch\), aliases daily canonical via shortTermEntries, shortTermPresent, root sections 2\/2 \(what-belongs-here, buckets\) @ memory\/README\.md; skills docs 11\/11 \(channels\/feishu, channels\/slack, channels\/telegram, channels\/whatsapp, cron\), root sections 2\/2 \(what-lives-here, layout\) @ skills\/README\.md; soul sections 4\/4 \(core-truths, boundaries, vibe, continuity\) @ SOUL\.md; voice sections 4\/4 \(tone, signature-moves, avoid, language-hints\) @ voice\/README\.md/);
  assert.doesNotMatch(summary.promptPreview, /- memory: README yes, daily 1, long-term 1, scratch 1/);
  assert.doesNotMatch(summary.promptPreview, /- skills: 11 registered, 11 documented/);
  assert.match(summary.promptPreview, /Skill registry:\n- total: 11\n- discovered: 11\n- custom: 0\n- root: Skills are reusable behavior modules that teach the agent how to perform a class of tasks consistently\. @ skills\/README\.md\n- root sections: 2\/2 ready \(what-lives-here, layout\)\n- top skills: channels\/feishu \[discovered\]: Use when wiring or reviewing the checked-in Feishu channel runtime helper.*; channels\/slack \[discovered\]: Use when wiring or reviewing the checked-in Slack channel runtime helper.*; channels\/telegram \[discovered\]: Use when wiring or reviewing the checked-in Telegram channel runtime helper.*; \+8 more\n- categories: channels 4, providers 6, root 1/);
});

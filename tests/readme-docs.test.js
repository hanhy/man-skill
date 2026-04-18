import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

test('README documents the default delivery foundation targets and repo manifests', () => {
  assert.match(readme, /Delivery foundation/i);
  assert.match(readme, /Slack, Telegram, WhatsApp, and Feishu/);
  assert.match(readme, /OpenAI, Anthropic, Kimi, Minimax, GLM, and Qwen/);
  assert.match(readme, /manifests\/channels\.json/);
  assert.match(readme, /manifests\/providers\.json/);
});

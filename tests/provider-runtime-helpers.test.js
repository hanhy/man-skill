import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenAIProvider, normalizeOpenAIChatResponse } from '../src/models/openai.js';
import { createAnthropicProvider } from '../src/models/anthropic.js';
import { createKimiProvider, normalizeKimiChatResponse } from '../src/models/kimi.js';
import { createMinimaxProvider, normalizeMinimaxChatResponse } from '../src/models/minimax.js';
import { createGLMProvider, normalizeGLMChatResponse } from '../src/models/glm.js';
import { createQwenProvider, normalizeQwenChatResponse } from '../src/models/qwen.js';

function createArrayTextResponse({ id, model, providerTextBlocks, toolCalls = [] }) {
  return {
    id,
    model,
    choices: [{
      finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      message: {
        role: 'assistant',
        content: providerTextBlocks,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      },
    }],
    usage: {
      prompt_tokens: 32,
      completion_tokens: 12,
      total_tokens: 44,
    },
  };
}

test('provider runtime helpers expose required env vars and configuration checks', () => {
  const openai = createOpenAIProvider();
  const anthropic = createAnthropicProvider();
  const kimi = createKimiProvider();
  const minimax = createMinimaxProvider();
  const glm = createGLMProvider();
  const qwen = createQwenProvider();

  assert.deepEqual(openai.requiredEnvVars(), ['OPENAI_API_KEY']);
  assert.deepEqual(anthropic.requiredEnvVars(), ['ANTHROPIC_API_KEY']);
  assert.deepEqual(kimi.requiredEnvVars(), ['KIMI_API_KEY']);
  assert.deepEqual(minimax.requiredEnvVars(), ['MINIMAX_API_KEY']);
  assert.deepEqual(glm.requiredEnvVars(), ['GLM_API_KEY']);
  assert.deepEqual(qwen.requiredEnvVars(), ['QWEN_API_KEY']);

  assert.deepEqual(openai.missingEnvVars({}), ['OPENAI_API_KEY']);
  assert.equal(openai.isConfigured({ OPENAI_API_KEY: 'test-key' }), true);
  assert.deepEqual(anthropic.missingEnvVars({}), ['ANTHROPIC_API_KEY']);
  assert.equal(anthropic.isConfigured({ ANTHROPIC_API_KEY: 'test-key' }), true);
});

test('openai-compatible provider runtime helpers normalize structured text content arrays', () => {
  const openaiResponse = createArrayTextResponse({
    id: 'chatcmpl-openai-array',
    model: 'gpt-5',
    providerTextBlocks: [
      { type: 'output_text', text: 'Ship the thin slice' },
      { type: 'output_text', text: 'first, then tighten it.' },
      { type: 'reasoning', summary: 'skip me' },
    ],
    toolCalls: [{
      id: 'call_openai_1',
      type: 'function',
      function: {
        name: 'lookup_profile',
        arguments: '{"personId":"harry-han"}',
      },
    }],
  });
  const kimiResponse = createArrayTextResponse({
    id: 'chatcmpl-kimi-array',
    model: 'moonshot-v1-32k',
    providerTextBlocks: [
      { type: 'text', text: 'Kimi keeps the' },
      { type: 'text', text: 'feedback loop tight.' },
    ],
  });
  const minimaxResponse = createArrayTextResponse({
    id: 'chatcmpl-minimax-array',
    model: 'minimax-text-01',
    providerTextBlocks: [
      { type: 'text', text: 'Minimax can emit' },
      { type: 'text', text: 'structured chat parts.' },
    ],
  });
  const glmResponse = createArrayTextResponse({
    id: 'chatcmpl-glm-array',
    model: 'glm-4-plus',
    providerTextBlocks: [
      { type: 'output_text', text: 'GLM wants profile' },
      { type: 'text', text: 'context before replying.' },
    ],
  });
  const qwenResponse = createArrayTextResponse({
    id: 'chatcmpl-qwen-array',
    model: 'qwen-max',
    providerTextBlocks: [
      { type: 'text', text: 'Qwen can emit' },
      { type: 'output_text', text: 'structured updates too.' },
    ],
  });

  assert.equal(normalizeOpenAIChatResponse(openaiResponse).text, 'Ship the thin slice first, then tighten it.');
  assert.equal(normalizeKimiChatResponse(kimiResponse).text, 'Kimi keeps the feedback loop tight.');
  assert.equal(normalizeMinimaxChatResponse(minimaxResponse).text, 'Minimax can emit structured chat parts.');
  assert.equal(normalizeGLMChatResponse(glmResponse).text, 'GLM wants profile context before replying.');
  assert.equal(normalizeQwenChatResponse(qwenResponse).text, 'Qwen can emit structured updates too.');
});

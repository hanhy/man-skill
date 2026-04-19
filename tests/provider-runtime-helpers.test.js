import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenAIProvider, normalizeOpenAIChatResponse } from '../src/models/openai.js';
import { createAnthropicProvider, buildAnthropicMessagesRequest, normalizeAnthropicMessagesResponse } from '../src/models/anthropic.js';
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

test('anthropic provider runtime helpers build request payloads and normalize text/tool blocks compactly', () => {
  const anthropic = createAnthropicProvider();

  assert.deepEqual(
    anthropic.buildMessagesRequest({
      system: 'Stay direct.',
      messages: [{ role: 'user', content: 'Ship it.' }],
      tools: [{ name: 'lookup_profile' }],
      toolChoice: { type: 'tool', name: 'lookup_profile' },
      maxTokens: 2048,
      temperature: 0.2,
      metadata: { source: 'test' },
    }),
    buildAnthropicMessagesRequest({
      model: 'claude-3.7-sonnet',
      system: 'Stay direct.',
      messages: [{ role: 'user', content: 'Ship it.' }],
      tools: [{ name: 'lookup_profile' }],
      toolChoice: { type: 'tool', name: 'lookup_profile' },
      maxTokens: 2048,
      temperature: 0.2,
      metadata: { source: 'test' },
    }),
  );

  assert.deepEqual(
    normalizeAnthropicMessagesResponse({
      id: 'msg_123',
      model: 'claude-3.7-sonnet',
      role: 'assistant',
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: ' Ship the thin slice ' },
        { type: 'thinking', thinking: 'skip me' },
        { type: 'text', text: 'first, then tighten it.' },
        { type: 'tool_use', id: 'toolu_1', name: 'lookup_profile', input: { personId: 'harry-han' } },
      ],
      usage: {
        input_tokens: 32,
        output_tokens: 12,
      },
    }),
    {
      provider: 'anthropic',
      id: 'msg_123',
      model: 'claude-3.7-sonnet',
      role: 'assistant',
      text: 'Ship the thin slice first, then tighten it.',
      stopReason: 'tool_use',
      toolCalls: [
        {
          id: 'toolu_1',
          name: 'lookup_profile',
          input: { personId: 'harry-han' },
        },
      ],
      usage: {
        inputTokens: 32,
        outputTokens: 12,
      },
    },
  );
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

test('openai-compatible provider runtime helpers normalize nested SDK-style text blocks', () => {
  const openaiResponse = createArrayTextResponse({
    id: 'chatcmpl-openai-nested',
    model: 'gpt-5',
    providerTextBlocks: [
      {
        type: 'output_text',
        text: {
          value: 'Ship nested text first.',
        },
      },
      {
        type: 'output_message',
        content: [
          { type: 'text', text: { value: 'Then tighten it with feedback.' } },
          { type: 'image_url', image_url: { url: 'https://example.com/shot.png' } },
        ],
      },
    ],
  });
  const kimiResponse = createArrayTextResponse({
    id: 'chatcmpl-kimi-nested',
    model: 'moonshot-v1-32k',
    providerTextBlocks: [
      { type: 'text', text: { value: 'Kimi can unpack nested SDK text.' } },
    ],
  });
  const minimaxResponse = createArrayTextResponse({
    id: 'chatcmpl-minimax-nested',
    model: 'minimax-text-01',
    providerTextBlocks: [
      {
        type: 'message',
        content: [
          { type: 'text', text: { value: 'Minimax nested blocks still read cleanly.' } },
        ],
      },
    ],
  });
  const glmResponse = createArrayTextResponse({
    id: 'chatcmpl-glm-nested',
    model: 'glm-4-plus',
    providerTextBlocks: [
      {
        type: 'output_message',
        content: [
          { type: 'output_text', text: { value: 'GLM keeps' } },
          { type: 'text', text: { value: 'the full sentence.' } },
        ],
      },
    ],
  });
  const qwenResponse = createArrayTextResponse({
    id: 'chatcmpl-qwen-nested',
    model: 'qwen-max',
    providerTextBlocks: [
      {
        type: 'message',
        content: [
          { type: 'reasoning', summary: 'skip me' },
          { type: 'text', text: { value: 'Qwen nested responses normalize too.' } },
        ],
      },
    ],
  });

  assert.equal(normalizeOpenAIChatResponse(openaiResponse).text, 'Ship nested text first. Then tighten it with feedback.');
  assert.equal(normalizeKimiChatResponse(kimiResponse).text, 'Kimi can unpack nested SDK text.');
  assert.equal(normalizeMinimaxChatResponse(minimaxResponse).text, 'Minimax nested blocks still read cleanly.');
  assert.equal(normalizeGLMChatResponse(glmResponse).text, 'GLM keeps the full sentence.');
  assert.equal(normalizeQwenChatResponse(qwenResponse).text, 'Qwen nested responses normalize too.');
});

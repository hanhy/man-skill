import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeProviderToolArguments, extractProviderTextContent } from '../src/models/base-provider.js';
import { createOpenAIProvider, normalizeOpenAIChatResponse } from '../src/models/openai.js';
import { createAnthropicProvider, buildAnthropicMessagesRequest, normalizeAnthropicMessagesResponse } from '../src/models/anthropic.js';
import { createKimiProvider, normalizeKimiChatResponse } from '../src/models/kimi.js';
import { createMinimaxProvider, buildMinimaxChatRequest, normalizeMinimaxChatResponse } from '../src/models/minimax.js';
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
  assert.deepEqual(openai.missingEnvVars({ OPENAI_API_KEY: '   ' }), ['OPENAI_API_KEY']);
  assert.equal(openai.isConfigured({ OPENAI_API_KEY: '   ' }), false);
  assert.deepEqual(anthropic.missingEnvVars({}), ['ANTHROPIC_API_KEY']);
  assert.equal(anthropic.isConfigured({ ANTHROPIC_API_KEY: 'test-key' }), true);
});

test('base provider helpers normalize whitespace-only tool arguments and SDK-style parts arrays', () => {
  assert.equal(normalizeProviderToolArguments('   '), '{}');
  assert.equal(normalizeProviderToolArguments('  {"personId":"harry-han"}  '), '{"personId":"harry-han"}');
  assert.equal(normalizeProviderToolArguments({ personId: 'harry-han' }), '{"personId":"harry-han"}');

  assert.equal(
    extractProviderTextContent({
      parts: [
        { text: 'Ship the thin slice' },
        { text: { value: 'then tighten the loop.' } },
      ],
    }),
    'Ship the thin slice then tighten the loop.',
  );
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
        arguments: '  {"personId":"harry-han"}  ',
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
    toolCalls: [{
      id: 'call_openai_nested',
      type: 'function',
      function: {
        name: 'lookup_profile',
        arguments: { personId: 'harry-han', includeDrafts: true },
      },
    }],
  });
  const kimiResponse = createArrayTextResponse({
    id: 'chatcmpl-kimi-nested',
    model: 'moonshot-v1-32k',
    providerTextBlocks: [
      { type: 'text', text: { value: 'Kimi can unpack nested SDK text.' } },
    ],
    toolCalls: [{
      id: 'call_kimi_nested',
      function: {
        name: 'queue_refresh',
        arguments: { personId: 'jane-doe', refresh: true },
      },
    }],
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
    toolCalls: [{
      id: 'call_minimax_nested',
      function: {
        name: 'queue_refresh',
        arguments: { personId: 'ready-pal', refresh: true },
      },
    }],
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
    toolCalls: [{
      id: 'call_glm_nested',
      function: {
        name: 'lookup_skill',
        arguments: ['voice', 'soul'],
      },
    }],
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
    toolCalls: [{
      id: 'call_qwen_nested',
      function: {
        name: 'lookup_materials',
        arguments: { personId: 'ready-pal', kinds: ['talk', 'message'] },
      },
    }],
  });

  const normalizedOpenAI = normalizeOpenAIChatResponse(openaiResponse);
  const normalizedKimi = normalizeKimiChatResponse(kimiResponse);
  const normalizedMinimax = normalizeMinimaxChatResponse(minimaxResponse);
  const normalizedGLM = normalizeGLMChatResponse(glmResponse);
  const normalizedQwen = normalizeQwenChatResponse(qwenResponse);

  assert.equal(normalizedOpenAI.text, 'Ship nested text first. Then tighten it with feedback.');
  assert.equal(normalizedOpenAI.toolCalls[0]?.arguments, '{"personId":"harry-han","includeDrafts":true}');
  assert.equal(normalizedKimi.text, 'Kimi can unpack nested SDK text.');
  assert.equal(normalizedKimi.toolCalls[0]?.arguments, '{"personId":"jane-doe","refresh":true}');
  assert.equal(normalizedMinimax.text, 'Minimax nested blocks still read cleanly.');
  assert.equal(normalizedMinimax.toolCalls[0]?.arguments, '{"personId":"ready-pal","refresh":true}');
  assert.equal(normalizedGLM.text, 'GLM keeps the full sentence.');
  assert.equal(normalizedGLM.toolCalls[0]?.arguments, '["voice","soul"]');
  assert.equal(normalizedQwen.text, 'Qwen nested responses normalize too.');
  assert.equal(normalizedQwen.toolCalls[0]?.arguments, '{"personId":"ready-pal","kinds":["talk","message"]}');
});

test('minimax provider runtime helpers mirror openai-compatible tool request and response payloads', () => {
  const minimax = createMinimaxProvider();

  assert.deepEqual(
    minimax.buildChatRequest({
      messages: [{ role: 'user', content: 'Ship it.' }],
      tools: [{ type: 'function', function: { name: 'lookup_profile' } }],
      toolChoice: 'auto',
      temperature: 0.3,
      maxOutputTokens: 256,
      topP: 0.8,
      botSetting: [{ bot_name: 'ManSkill', content: 'Stay direct.' }],
    }),
    buildMinimaxChatRequest({
      messages: [{ role: 'user', content: 'Ship it.' }],
      tools: [{ type: 'function', function: { name: 'lookup_profile' } }],
      toolChoice: 'auto',
      temperature: 0.3,
      maxOutputTokens: 256,
      topP: 0.8,
      botSetting: [{ bot_name: 'ManSkill', content: 'Stay direct.' }],
    }),
  );

  assert.deepEqual(
    minimax.normalizeChatResponse({
      id: 'chatcmpl-minimax-tools',
      model: 'minimax-text-01',
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          role: 'assistant',
          content: 'Minimax wants to inspect the profile first.',
          tool_calls: [{
            id: 'call_minimax_1',
            function: {
              name: 'lookup_profile',
              arguments: { personId: 'harry-han', includeDrafts: true },
            },
          }],
        },
      }],
      usage: {
        prompt_tokens: 21,
        completion_tokens: 9,
        total_tokens: 30,
      },
    }),
    {
      provider: 'minimax',
      id: 'chatcmpl-minimax-tools',
      model: 'minimax-text-01',
      role: 'assistant',
      text: 'Minimax wants to inspect the profile first.',
      finishReason: 'tool_calls',
      toolCalls: [{
        id: 'call_minimax_1',
        type: 'function',
        name: 'lookup_profile',
        arguments: '{"personId":"harry-han","includeDrafts":true}',
      }],
      usage: {
        promptTokens: 21,
        completionTokens: 9,
        totalTokens: 30,
      },
    },
  );
});

test('openai-compatible provider runtime helpers normalize responses-api output payloads', () => {
  const openaiResponse = {
    id: 'resp_openai_1',
    model: 'gpt-5',
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'output_text', text: 'Ship the verified slice.' },
          { type: 'output_text', text: { value: 'Then tighten the prompt preview.' } },
        ],
      },
      {
        type: 'function_call',
        call_id: 'fc_openai_1',
        name: 'lookup_profile',
        arguments: { personId: 'harry-han', includeDrafts: true },
      },
    ],
    usage: {
      input_tokens: 18,
      output_tokens: 11,
    },
  };
  const kimiResponse = {
    id: 'resp_kimi_1',
    model: 'moonshot-v1-32k',
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Kimi can normalize output payloads too.' }],
      },
      {
        type: 'function_call',
        id: 'fc_kimi_1',
        name: 'queue_refresh',
        arguments: { personId: 'jane-doe' },
      },
    ],
    usage: {
      input_tokens: 9,
      output_tokens: 4,
      total_tokens: 13,
    },
  };
  const glmResponse = {
    id: 'resp_glm_1',
    model: 'glm-4-plus',
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'GLM uses output arrays in some SDKs.' }],
      },
      {
        type: 'function_call',
        call_id: 'fc_glm_1',
        name: 'lookup_skill',
        arguments: ['voice', 'soul'],
      },
    ],
    usage: {
      input_tokens: 7,
      output_tokens: 5,
    },
  };
  const qwenResponse = {
    id: 'resp_qwen_1',
    model: 'qwen-max',
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: { value: 'Qwen output payloads stay readable.' } }],
      },
      {
        type: 'function_call',
        call_id: 'fc_qwen_1',
        name: 'lookup_materials',
        arguments: { personId: 'ready-pal', kinds: ['talk'] },
      },
    ],
    usage: {
      input_tokens: 6,
      output_tokens: 3,
    },
  };

  const normalizedOpenAI = normalizeOpenAIChatResponse(openaiResponse);
  const normalizedKimi = normalizeKimiChatResponse(kimiResponse);
  const normalizedGLM = normalizeGLMChatResponse(glmResponse);
  const normalizedQwen = normalizeQwenChatResponse(qwenResponse);

  assert.deepEqual(normalizedOpenAI, {
    provider: 'openai',
    id: 'resp_openai_1',
    model: 'gpt-5',
    role: 'assistant',
    text: 'Ship the verified slice. Then tighten the prompt preview.',
    finishReason: 'completed',
    toolCalls: [{
      id: 'fc_openai_1',
      type: 'function',
      name: 'lookup_profile',
      arguments: '{"personId":"harry-han","includeDrafts":true}',
    }],
    usage: {
      promptTokens: 18,
      completionTokens: 11,
      totalTokens: 29,
    },
  });
  assert.equal(normalizedKimi.text, 'Kimi can normalize output payloads too.');
  assert.equal(normalizedKimi.toolCalls[0]?.id, 'fc_kimi_1');
  assert.equal(normalizedKimi.toolCalls[0]?.arguments, '{"personId":"jane-doe"}');
  assert.deepEqual(normalizedKimi.usage, { promptTokens: 9, completionTokens: 4, totalTokens: 13 });
  assert.equal(normalizedGLM.text, 'GLM uses output arrays in some SDKs.');
  assert.equal(normalizedGLM.toolCalls[0]?.arguments, '["voice","soul"]');
  assert.deepEqual(normalizedGLM.usage, { promptTokens: 7, completionTokens: 5, totalTokens: 12 });
  assert.equal(normalizedQwen.text, 'Qwen output payloads stay readable.');
  assert.equal(normalizedQwen.toolCalls[0]?.id, 'fc_qwen_1');
  assert.deepEqual(normalizedQwen.usage, { promptTokens: 6, completionTokens: 3, totalTokens: 9 });
});

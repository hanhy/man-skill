import { BaseProvider, extractProviderTextContent } from './base-provider.js';

export const kimiProviderScaffold = {
  id: 'kimi',
  name: 'Kimi',
  models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  status: 'planned',
  features: ['chat', 'long-context'],
  defaultModel: 'moonshot-v1-32k',
  authEnvVar: 'KIMI_API_KEY',
  modalities: ['chat', 'long-context'],
  implementationPath: 'src/models/kimi.js',
  nextStep: 'implement moonshot-compatible client setup and model selection',
};

function normalizeKimiToolCalls(toolCalls = []) {
  return toolCalls
    .filter((toolCall) => toolCall && typeof toolCall === 'object')
    .map((toolCall) => ({
      id: typeof toolCall.id === 'string' && toolCall.id.length > 0 ? toolCall.id : null,
      type: typeof toolCall.type === 'string' && toolCall.type.length > 0 ? toolCall.type : 'function',
      name: typeof toolCall.function?.name === 'string' && toolCall.function.name.length > 0 ? toolCall.function.name : null,
      arguments: typeof toolCall.function?.arguments === 'string' && toolCall.function.arguments.length > 0 ? toolCall.function.arguments : '{}',
    }));
}

export function buildKimiChatRequest({
  model = kimiProviderScaffold.defaultModel,
  messages = [],
  temperature,
  maxOutputTokens,
  tools = [],
  toolChoice,
  metadata,
} = {}) {
  return {
    model,
    messages,
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_tokens: maxOutputTokens } : {}),
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
  };
}

export function normalizeKimiChatResponse(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const message = choice?.message && typeof choice.message === 'object' ? choice.message : {};

  return {
    provider: 'kimi',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof message.role === 'string' && message.role.length > 0 ? message.role : 'assistant',
    text: extractProviderTextContent(message.content),
    finishReason: typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0 ? choice.finish_reason : null,
    toolCalls: normalizeKimiToolCalls(message.tool_calls),
    usage: {
      promptTokens: Number.isFinite(response?.usage?.prompt_tokens) ? response.usage.prompt_tokens : 0,
      completionTokens: Number.isFinite(response?.usage?.completion_tokens) ? response.usage.completion_tokens : 0,
      totalTokens: Number.isFinite(response?.usage?.total_tokens) ? response.usage.total_tokens : 0,
    },
  };
}

export class KimiProvider extends BaseProvider {
  buildChatRequest(options) {
    return buildKimiChatRequest({
      model: this.defaultModel,
      ...options,
    });
  }

  normalizeChatResponse(response) {
    return normalizeKimiChatResponse(response);
  }
}

export function createKimiProvider(overrides = {}) {
  return new KimiProvider({ ...kimiProviderScaffold, ...overrides });
}

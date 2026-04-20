import {
  BaseProvider,
  extractProviderTextContent,
  normalizeOpenAICompatibleUsage,
  normalizeProviderToolArguments,
  resolveOpenAICompatibleResponseMessage,
  resolveOpenAICompatibleToolCalls,
} from './base-provider.js';

export const qwenProviderScaffold = {
  id: 'qwen',
  name: 'Qwen',
  models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  status: 'planned',
  features: ['chat', 'tools'],
  defaultModel: 'qwen-max',
  authEnvVar: 'QWEN_API_KEY',
  modalities: ['chat', 'tools', 'vision'],
  implementationPath: 'src/models/qwen.js',
  nextStep: 'implement qwen chat wrapper and multimodal request mapping',
};

function normalizeQwenToolCalls(toolCalls = []) {
  return toolCalls
    .filter((toolCall) => toolCall && typeof toolCall === 'object')
    .map((toolCall) => ({
      id: typeof toolCall.id === 'string' && toolCall.id.length > 0 ? toolCall.id : null,
      type: typeof toolCall.type === 'string' && toolCall.type.length > 0 ? toolCall.type : 'function',
      name: typeof toolCall.function?.name === 'string' && toolCall.function.name.length > 0 ? toolCall.function.name : null,
      arguments: normalizeProviderToolArguments(toolCall.function?.arguments),
    }));
}

export function buildQwenChatRequest({
  model = qwenProviderScaffold.defaultModel,
  messages = [],
  tools = [],
  toolChoice,
  temperature,
  maxOutputTokens,
  topP,
  responseFormat,
} = {}) {
  return {
    model,
    messages,
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_tokens: maxOutputTokens } : {}),
    ...(typeof topP === 'number' ? { top_p: topP } : {}),
    ...(responseFormat && typeof responseFormat === 'object' ? { response_format: responseFormat } : {}),
  };
}

export function normalizeQwenChatResponse(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const message = resolveOpenAICompatibleResponseMessage(response);

  return {
    provider: 'qwen',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof message.role === 'string' && message.role.length > 0 ? message.role : 'assistant',
    text: extractProviderTextContent(message.content),
    finishReason: typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0
      ? choice.finish_reason
      : (typeof response.status === 'string' && response.status.length > 0 ? response.status : null),
    toolCalls: normalizeQwenToolCalls(resolveOpenAICompatibleToolCalls(response)),
    usage: normalizeOpenAICompatibleUsage(response?.usage),
  };
}

export class QwenProvider extends BaseProvider {
  buildChatRequest(options) {
    return buildQwenChatRequest({
      model: this.defaultModel,
      ...options,
    });
  }

  normalizeChatResponse(response) {
    return normalizeQwenChatResponse(response);
  }
}

export function createQwenProvider(overrides = {}) {
  return new QwenProvider({ ...qwenProviderScaffold, ...overrides });
}

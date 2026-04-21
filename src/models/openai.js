import {
  BaseProvider,
  extractProviderTextContent,
  normalizeOpenAICompatibleUsage,
  normalizeProviderToolArguments,
  resolveOpenAICompatibleResponseMessage,
  resolveOpenAICompatibleToolCalls,
} from './base-provider.js';

export const openaiProviderScaffold = {
  id: 'openai',
  name: 'OpenAI',
  models: ['gpt-4.1', 'gpt-4o', 'gpt-5'],
  status: 'planned',
  features: ['chat', 'tools', 'reasoning'],
  defaultModel: 'gpt-5',
  authEnvVar: 'OPENAI_API_KEY',
  modalities: ['chat', 'reasoning', 'vision'],
  implementationPath: 'src/models/openai.js',
  nextStep: 'implement chat/tool request translation and response normalization',
};

function normalizeOpenAIToolCalls(toolCalls = []) {
  return toolCalls
    .filter((toolCall) => toolCall && typeof toolCall === 'object')
    .map((toolCall) => ({
      id: typeof toolCall.id === 'string' && toolCall.id.length > 0 ? toolCall.id : null,
      type: typeof toolCall.type === 'string' && toolCall.type.length > 0 ? toolCall.type : 'function',
      name: typeof toolCall.function?.name === 'string' && toolCall.function.name.length > 0 ? toolCall.function.name : null,
      arguments: normalizeProviderToolArguments(toolCall.function?.arguments),
    }));
}

export function buildOpenAIChatRequest({
  model = openaiProviderScaffold.defaultModel,
  messages = [],
  tools = [],
  toolChoice,
  temperature,
  maxOutputTokens,
  metadata,
  responseFormat,
} = {}) {
  return {
    model,
    messages,
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_completion_tokens: maxOutputTokens } : {}),
    ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
    ...(responseFormat && typeof responseFormat === 'object' ? { response_format: responseFormat } : {}),
  };
}

export function normalizeOpenAIChatResponse(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const message = resolveOpenAICompatibleResponseMessage(response);

  return {
    provider: 'openai',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof message.role === 'string' && message.role.length > 0 ? message.role : 'assistant',
    text: extractProviderTextContent(message.content),
    finishReason: typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0
      ? choice.finish_reason
      : (typeof response.status === 'string' && response.status.length > 0 ? response.status : null),
    toolCalls: normalizeOpenAIToolCalls(resolveOpenAICompatibleToolCalls(response)),
    usage: normalizeOpenAICompatibleUsage(response?.usage),
  };
}

export class OpenAIProvider extends BaseProvider {
  buildChatRequest(options) {
    return buildOpenAIChatRequest({
      model: this.defaultModel,
      ...options,
    });
  }

  normalizeChatResponse(response) {
    return normalizeOpenAIChatResponse(response);
  }
}

export function createOpenAIProvider(overrides = {}) {
  return new OpenAIProvider({ ...openaiProviderScaffold, ...overrides });
}

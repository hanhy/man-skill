import {
  BaseProvider,
  extractProviderTextContent,
  normalizeOpenAICompatibleUsage,
  normalizeProviderToolArguments,
  resolveOpenAICompatibleResponseMessage,
  resolveOpenAICompatibleToolCalls,
} from './base-provider.js';

export const minimaxProviderScaffold = {
  id: 'minimax',
  name: 'Minimax',
  models: ['abab6.5s-chat', 'minimax-text-01'],
  status: 'planned',
  features: ['chat', 'tools'],
  defaultModel: 'minimax-text-01',
  authEnvVar: 'MINIMAX_API_KEY',
  modalities: ['chat', 'tools'],
  implementationPath: 'src/models/minimax.js',
  nextStep: 'implement minimax request signing and chat completion mapping',
};

function normalizeMinimaxToolCalls(toolCalls = []) {
  return toolCalls
    .filter((toolCall) => toolCall && typeof toolCall === 'object')
    .map((toolCall) => ({
      id: typeof toolCall.id === 'string' && toolCall.id.length > 0 ? toolCall.id : null,
      type: typeof toolCall.type === 'string' && toolCall.type.length > 0 ? toolCall.type : 'function',
      name: typeof toolCall.function?.name === 'string' && toolCall.function.name.length > 0 ? toolCall.function.name : null,
      arguments: normalizeProviderToolArguments(toolCall.function?.arguments),
    }));
}

export function buildMinimaxChatRequest({
  model = minimaxProviderScaffold.defaultModel,
  messages = [],
  temperature,
  maxOutputTokens,
  topP,
  botSetting,
  tools = [],
  toolChoice,
} = {}) {
  return {
    model,
    messages,
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_tokens: maxOutputTokens } : {}),
    ...(typeof topP === 'number' ? { top_p: topP } : {}),
    ...(Array.isArray(botSetting) && botSetting.length > 0 ? { bot_setting: botSetting } : {}),
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };
}

export function normalizeMinimaxChatResponse(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const message = resolveOpenAICompatibleResponseMessage(response);

  return {
    provider: 'minimax',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof message.role === 'string' && message.role.length > 0 ? message.role : 'assistant',
    text: extractProviderTextContent(message.content),
    finishReason: typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0
      ? choice.finish_reason
      : (typeof response.status === 'string' && response.status.length > 0 ? response.status : null),
    toolCalls: normalizeMinimaxToolCalls(resolveOpenAICompatibleToolCalls(response)),
    usage: normalizeOpenAICompatibleUsage(response?.usage),
  };
}

export class MinimaxProvider extends BaseProvider {
  buildChatRequest(options) {
    return buildMinimaxChatRequest({
      model: this.defaultModel,
      ...options,
    });
  }

  normalizeChatResponse(response) {
    return normalizeMinimaxChatResponse(response);
  }
}

export function createMinimaxProvider(overrides = {}) {
  return new MinimaxProvider({ ...minimaxProviderScaffold, ...overrides });
}

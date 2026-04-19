import { BaseProvider, extractProviderTextContent } from './base-provider.js';

export const minimaxProviderScaffold = {
  id: 'minimax',
  name: 'Minimax',
  models: ['abab6.5s-chat', 'minimax-text-01'],
  status: 'planned',
  features: ['chat'],
  defaultModel: 'minimax-text-01',
  authEnvVar: 'MINIMAX_API_KEY',
  modalities: ['chat'],
  implementationPath: 'src/models/minimax.js',
  nextStep: 'implement minimax request signing and chat completion mapping',
};

export function buildMinimaxChatRequest({
  model = minimaxProviderScaffold.defaultModel,
  messages = [],
  temperature,
  maxOutputTokens,
  topP,
  botSetting,
} = {}) {
  return {
    model,
    messages,
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_tokens: maxOutputTokens } : {}),
    ...(typeof topP === 'number' ? { top_p: topP } : {}),
    ...(Array.isArray(botSetting) && botSetting.length > 0 ? { bot_setting: botSetting } : {}),
  };
}

export function normalizeMinimaxChatResponse(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const message = choice?.message && typeof choice.message === 'object' ? choice.message : {};

  return {
    provider: 'minimax',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof message.role === 'string' && message.role.length > 0 ? message.role : 'assistant',
    text: extractProviderTextContent(message.content),
    finishReason: typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0 ? choice.finish_reason : null,
    usage: {
      promptTokens: Number.isFinite(response?.usage?.prompt_tokens) ? response.usage.prompt_tokens : 0,
      completionTokens: Number.isFinite(response?.usage?.completion_tokens) ? response.usage.completion_tokens : 0,
      totalTokens: Number.isFinite(response?.usage?.total_tokens) ? response.usage.total_tokens : 0,
    },
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

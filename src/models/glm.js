import {
  BaseProvider,
  extractProviderTextContent,
  normalizeOpenAICompatibleUsage,
  normalizeProviderToolArguments,
  resolveOpenAICompatibleResponseMessage,
  resolveOpenAICompatibleToolCalls,
} from './base-provider.js';

export const glmProviderScaffold = {
  id: 'glm',
  name: 'GLM',
  models: ['glm-4-plus', 'glm-4-air'],
  status: 'planned',
  features: ['chat', 'tools'],
  defaultModel: 'glm-4-plus',
  authEnvVar: 'GLM_API_KEY',
  modalities: ['chat', 'tools', 'vision'],
  implementationPath: 'src/models/glm.js',
  nextStep: 'implement glm request payload translation with tool support',
};

function normalizeGLMToolCalls(toolCalls = []) {
  return toolCalls
    .filter((toolCall) => toolCall && typeof toolCall === 'object')
    .map((toolCall) => ({
      id: typeof toolCall.id === 'string' && toolCall.id.length > 0 ? toolCall.id : null,
      type: typeof toolCall.type === 'string' && toolCall.type.length > 0 ? toolCall.type : 'function',
      name: typeof toolCall.function?.name === 'string' && toolCall.function.name.length > 0 ? toolCall.function.name : null,
      arguments: normalizeProviderToolArguments(toolCall.function?.arguments),
    }));
}

export function buildGLMChatRequest({
  model = glmProviderScaffold.defaultModel,
  messages = [],
  tools = [],
  toolChoice,
  temperature,
  maxOutputTokens,
  topP,
} = {}) {
  return {
    model,
    messages,
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_tokens: maxOutputTokens } : {}),
    ...(typeof topP === 'number' ? { top_p: topP } : {}),
  };
}

export function normalizeGLMChatResponse(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const message = resolveOpenAICompatibleResponseMessage(response);

  return {
    provider: 'glm',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof message.role === 'string' && message.role.length > 0 ? message.role : 'assistant',
    text: extractProviderTextContent(message.content),
    finishReason: typeof choice?.finish_reason === 'string' && choice.finish_reason.length > 0
      ? choice.finish_reason
      : (typeof response.status === 'string' && response.status.length > 0 ? response.status : null),
    toolCalls: normalizeGLMToolCalls(resolveOpenAICompatibleToolCalls(response)),
    usage: normalizeOpenAICompatibleUsage(response?.usage),
  };
}

export class GLMProvider extends BaseProvider {
  buildChatRequest(options) {
    return buildGLMChatRequest({
      model: this.defaultModel,
      ...options,
    });
  }

  normalizeChatResponse(response) {
    return normalizeGLMChatResponse(response);
  }
}

export function createGLMProvider(overrides = {}) {
  return new GLMProvider({ ...glmProviderScaffold, ...overrides });
}

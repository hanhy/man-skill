import { BaseProvider, extractProviderTextContent } from './base-provider.js';

export const anthropicProviderScaffold = {
  id: 'anthropic',
  name: 'Anthropic',
  models: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
  status: 'candidate',
  features: ['chat', 'tools', 'long-context'],
  defaultModel: 'claude-3.7-sonnet',
  authEnvVar: 'ANTHROPIC_API_KEY',
  modalities: ['chat', 'long-context', 'vision'],
  implementationPath: 'src/models/anthropic.js',
  nextStep: null,
};

function normalizeAnthropicToolCalls(content = []) {
  return content
    .filter((block) => block && typeof block === 'object' && block.type === 'tool_use')
    .map((block) => ({
      id: typeof block.id === 'string' && block.id.length > 0 ? block.id : null,
      name: typeof block.name === 'string' && block.name.length > 0 ? block.name : null,
      input: block.input ?? {},
    }));
}

function normalizeAnthropicText(content = []) {
  const text = extractProviderTextContent(
    content
      .filter((block) => block && typeof block === 'object' && block.type === 'text')
      .map((block) => ({ text: block.text })),
  );

  return typeof text === 'string' && text.length > 0 ? text : null;
}

export function buildAnthropicMessagesRequest({
  model = anthropicProviderScaffold.defaultModel,
  system,
  messages = [],
  tools = [],
  toolChoice,
  maxTokens = 1024,
  temperature,
  metadata,
} = {}) {
  return {
    model,
    max_tokens: maxTokens,
    messages,
    ...(typeof system === 'string' && system.length > 0 ? { system } : {}),
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
  };
}

export function normalizeAnthropicMessagesResponse(response = {}) {
  const content = Array.isArray(response.content) ? response.content : [];

  return {
    provider: 'anthropic',
    id: typeof response.id === 'string' && response.id.length > 0 ? response.id : null,
    model: typeof response.model === 'string' && response.model.length > 0 ? response.model : null,
    role: typeof response.role === 'string' && response.role.length > 0 ? response.role : 'assistant',
    text: normalizeAnthropicText(content),
    stopReason: typeof response.stop_reason === 'string' && response.stop_reason.length > 0 ? response.stop_reason : null,
    toolCalls: normalizeAnthropicToolCalls(content),
    usage: {
      inputTokens: Number.isFinite(response?.usage?.input_tokens) ? response.usage.input_tokens : 0,
      outputTokens: Number.isFinite(response?.usage?.output_tokens) ? response.usage.output_tokens : 0,
    },
  };
}

export class AnthropicProvider extends BaseProvider {
  buildMessagesRequest(options) {
    return buildAnthropicMessagesRequest({
      model: this.defaultModel,
      ...options,
    });
  }

  normalizeMessagesResponse(response) {
    return normalizeAnthropicMessagesResponse(response);
  }
}

export function createAnthropicProvider(overrides = {}) {
  return new AnthropicProvider({ ...anthropicProviderScaffold, ...overrides });
}

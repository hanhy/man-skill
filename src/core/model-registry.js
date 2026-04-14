import { BaseRegistry } from './base-registry.js';

const DEFAULT_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-5'],
    status: 'planned',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
    status: 'planned',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    status: 'planned',
  },
  {
    id: 'minimax',
    name: 'Minimax',
    models: ['abab6.5s-chat', 'minimax-text-01'],
    status: 'planned',
  },
  {
    id: 'glm',
    name: 'GLM',
    models: ['glm-4-plus', 'glm-4-air'],
    status: 'planned',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    status: 'planned',
  },
];

export class ModelRegistry extends BaseRegistry {
  constructor(providers = DEFAULT_PROVIDERS) {
    super(providers);
  }

  normalize(provider) {
    if (typeof provider === 'string') {
      return {
        id: provider,
        name: provider,
        models: [],
        status: 'unknown',
      };
    }

    return {
      models: [],
      status: 'unknown',
      ...provider,
    };
  }

  summary() {
    return {
      providerCount: this.count(),
      providers: this.list(),
    };
  }
}

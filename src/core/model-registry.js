import { BaseRegistry } from './base-registry.js';

function collectProviderAuthEnvVars(providers) {
  return [...new Set(providers.map((provider) => provider.authEnvVar).filter((value) => typeof value === 'string' && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

const DEFAULT_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-5'],
    status: 'planned',
    features: ['chat', 'tools', 'reasoning'],
    defaultModel: 'gpt-5',
    authEnvVar: 'OPENAI_API_KEY',
    modalities: ['chat', 'reasoning', 'vision'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
    status: 'planned',
    features: ['chat', 'tools', 'long-context'],
    defaultModel: 'claude-3.7-sonnet',
    authEnvVar: 'ANTHROPIC_API_KEY',
    modalities: ['chat', 'long-context', 'vision'],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    status: 'planned',
    features: ['chat', 'long-context'],
    defaultModel: 'moonshot-v1-32k',
    authEnvVar: 'KIMI_API_KEY',
    modalities: ['chat', 'long-context'],
  },
  {
    id: 'minimax',
    name: 'Minimax',
    models: ['abab6.5s-chat', 'minimax-text-01'],
    status: 'planned',
    features: ['chat'],
    defaultModel: 'minimax-text-01',
    authEnvVar: 'MINIMAX_API_KEY',
    modalities: ['chat'],
  },
  {
    id: 'glm',
    name: 'GLM',
    models: ['glm-4-plus', 'glm-4-air'],
    status: 'planned',
    features: ['chat', 'tools'],
    defaultModel: 'glm-4-plus',
    authEnvVar: 'GLM_API_KEY',
    modalities: ['chat', 'tools', 'vision'],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    status: 'planned',
    features: ['chat', 'tools'],
    defaultModel: 'qwen-max',
    authEnvVar: 'QWEN_API_KEY',
    modalities: ['chat', 'tools', 'vision'],
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
        features: [],
        defaultModel: null,
        authEnvVar: null,
        modalities: [],
      };
    }

    return {
      models: [],
      status: 'unknown',
      features: [],
      defaultModel: null,
      authEnvVar: null,
      modalities: [],
      ...provider,
    };
  }

  summary() {
    const providers = this.list();
    return {
      providerCount: this.count(),
      activeCount: providers.filter((provider) => provider.status === 'active').length,
      plannedCount: providers.filter((provider) => provider.status === 'planned').length,
      candidateCount: providers.filter((provider) => provider.status === 'candidate').length,
      multimodalProviderCount: providers.filter((provider) => (provider.modalities ?? []).length > 1).length,
      authEnvVars: collectProviderAuthEnvVars(providers),
      providers,
    };
  }
}

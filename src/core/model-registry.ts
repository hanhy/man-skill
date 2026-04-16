import { BaseRegistry } from './base-registry.js';

export interface ProviderRecord {
  id: string;
  name: string;
  models: string[];
  status: string;
  features: string[];
  defaultModel: string | null;
  authEnvVar: string | null;
  modalities: string[];
  [key: string]: unknown;
}

function mergeStringLists(...lists: Array<string[] | undefined>): string[] {
  return [...new Set(lists.flatMap((list) => (Array.isArray(list) ? list : [])))];
}

const DEFAULT_PROVIDERS: ProviderRecord[] = [
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

const DEFAULT_PROVIDERS_BY_ID = new Map(DEFAULT_PROVIDERS.map((provider) => [provider.id, provider]));

export class ModelRegistry extends BaseRegistry<string | ProviderRecord> {
  constructor(providers: Array<string | ProviderRecord> = DEFAULT_PROVIDERS) {
    super(providers);
  }

  normalize(provider: string | ProviderRecord): ProviderRecord {
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

    const defaultProvider = typeof provider.id === 'string' ? DEFAULT_PROVIDERS_BY_ID.get(provider.id) : undefined;
    const normalizedProvider = {
      models: [],
      status: 'unknown',
      features: [],
      defaultModel: null,
      authEnvVar: null,
      modalities: [],
      ...defaultProvider,
      ...provider,
    };

    return {
      ...normalizedProvider,
      models: mergeStringLists(defaultProvider?.models, provider.models),
      features: mergeStringLists(defaultProvider?.features, provider.features),
      modalities: mergeStringLists(defaultProvider?.modalities, provider.modalities),
    };
  }

  summary(): { providerCount: number; providers: ProviderRecord[] } {
    return {
      providerCount: this.count(),
      providers: this.list() as ProviderRecord[],
    };
  }
}

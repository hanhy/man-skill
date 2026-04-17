import { BaseRegistry } from './base-registry.js';
import { DEFAULT_PROVIDER_SCAFFOLDS, DEFAULT_PROVIDER_SCAFFOLDS_BY_ID } from '../models/scaffolds.js';

function mergeStringLists(...lists) {
  return [...new Set(lists.flatMap((list) => (Array.isArray(list) ? list : [])))];
}

function collectProviderAuthEnvVars(providers) {
  return [...new Set(providers.map((provider) => provider.authEnvVar).filter((value) => typeof value === 'string' && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

const DEFAULT_PROVIDERS = DEFAULT_PROVIDER_SCAFFOLDS;
const DEFAULT_PROVIDERS_BY_ID = DEFAULT_PROVIDER_SCAFFOLDS_BY_ID;

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
        implementationPath: null,
        nextStep: null,
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
      implementationPath: null,
      nextStep: null,
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

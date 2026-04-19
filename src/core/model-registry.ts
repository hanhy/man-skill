import { DEFAULT_PROVIDER_SCAFFOLDS, DEFAULT_PROVIDER_SCAFFOLDS_BY_ID } from '../models/scaffolds.js';
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
  implementationPath?: string | null;
  nextStep?: string | null;
  [key: string]: unknown;
}

function mergeStringLists(...lists: Array<string[] | undefined>): string[] {
  return [...new Set(lists.flatMap((list) => (Array.isArray(list) ? list : [])))];
}

function collectProviderAuthEnvVars(providers: ProviderRecord[]): string[] {
  return [...new Set(providers.map((provider) => provider.authEnvVar).filter((value): value is string => typeof value === 'string' && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

const DEFAULT_PROVIDERS: ProviderRecord[] = DEFAULT_PROVIDER_SCAFFOLDS.map((provider) => ({
  ...provider,
  models: [...provider.models],
  features: [...provider.features],
  modalities: [...provider.modalities],
}));

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
        implementationPath: null,
        nextStep: null,
      };
    }

    const defaultProvider = typeof provider.id === 'string' ? DEFAULT_PROVIDER_SCAFFOLDS_BY_ID.get(provider.id) : undefined;
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

  summary(): { providerCount: number; activeCount: number; plannedCount: number; candidateCount: number; multimodalProviderCount: number; authEnvVars: string[]; providers: ProviderRecord[] } {
    const providers = this.list() as ProviderRecord[];
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

import { BaseProvider } from './base-provider.js';
import { DEFAULT_PROVIDER_SCAFFOLDS } from './scaffolds.js';

export function createDefaultProviders() {
  return DEFAULT_PROVIDER_SCAFFOLDS.map((provider) => new BaseProvider({ ...provider }));
}

import { BaseProvider } from './base-provider.js';

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

export function createGLMProvider(overrides = {}) {
  return new BaseProvider({ ...glmProviderScaffold, ...overrides });
}

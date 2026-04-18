import { BaseProvider } from './base-provider.js';

export const openaiProviderScaffold = {
  id: 'openai',
  name: 'OpenAI',
  models: ['gpt-4.1', 'gpt-4o', 'gpt-5'],
  status: 'planned',
  features: ['chat', 'tools', 'reasoning'],
  defaultModel: 'gpt-5',
  authEnvVar: 'OPENAI_API_KEY',
  modalities: ['chat', 'reasoning', 'vision'],
  implementationPath: 'src/models/openai.js',
  nextStep: 'implement chat/tool request translation and response normalization',
};

export function createOpenAIProvider(overrides = {}) {
  return new BaseProvider({ ...openaiProviderScaffold, ...overrides });
}

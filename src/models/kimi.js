export const kimiProviderScaffold = {
  id: 'kimi',
  name: 'Kimi',
  models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  status: 'planned',
  features: ['chat', 'long-context'],
  defaultModel: 'moonshot-v1-32k',
  authEnvVar: 'KIMI_API_KEY',
  modalities: ['chat', 'long-context'],
  implementationPath: 'src/models/kimi.js',
  nextStep: 'implement moonshot-compatible client setup and model selection',
};

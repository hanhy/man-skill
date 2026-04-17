export const minimaxProviderScaffold = {
  id: 'minimax',
  name: 'Minimax',
  models: ['abab6.5s-chat', 'minimax-text-01'],
  status: 'planned',
  features: ['chat'],
  defaultModel: 'minimax-text-01',
  authEnvVar: 'MINIMAX_API_KEY',
  modalities: ['chat'],
  implementationPath: 'src/models/minimax.js',
  nextStep: 'implement minimax request signing and chat completion mapping',
};

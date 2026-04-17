export const anthropicProviderScaffold = {
  id: 'anthropic',
  name: 'Anthropic',
  models: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
  status: 'planned',
  features: ['chat', 'tools', 'long-context'],
  defaultModel: 'claude-3.7-sonnet',
  authEnvVar: 'ANTHROPIC_API_KEY',
  modalities: ['chat', 'long-context', 'vision'],
  implementationPath: 'src/models/anthropic.js',
  nextStep: 'implement messages api wrapper with long-context defaults',
};

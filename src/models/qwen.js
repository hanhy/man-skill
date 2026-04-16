export const qwenProviderScaffold = {
  id: 'qwen',
  name: 'Qwen',
  models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  status: 'planned',
  features: ['chat', 'tools'],
  defaultModel: 'qwen-max',
  authEnvVar: 'QWEN_API_KEY',
  modalities: ['chat', 'tools', 'vision'],
  implementationPath: 'src/models/qwen.js',
  nextStep: 'implement qwen chat wrapper and multimodal request mapping',
};

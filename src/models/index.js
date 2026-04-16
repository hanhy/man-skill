import { BaseProvider } from './base-provider.js';

export function createDefaultProviders() {
  return [
    new BaseProvider({
      id: 'openai',
      name: 'OpenAI',
      models: ['gpt-4.1', 'gpt-4o', 'gpt-5'],
      features: ['chat', 'tools', 'reasoning'],
      defaultModel: 'gpt-5',
      authEnvVar: 'OPENAI_API_KEY',
      modalities: ['chat', 'reasoning', 'vision'],
    }),
    new BaseProvider({
      id: 'anthropic',
      name: 'Anthropic',
      models: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
      features: ['chat', 'tools', 'long-context'],
      defaultModel: 'claude-3.7-sonnet',
      authEnvVar: 'ANTHROPIC_API_KEY',
      modalities: ['chat', 'long-context', 'vision'],
    }),
    new BaseProvider({
      id: 'kimi',
      name: 'Kimi',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      features: ['chat', 'long-context'],
      defaultModel: 'moonshot-v1-32k',
      authEnvVar: 'KIMI_API_KEY',
      modalities: ['chat', 'long-context'],
    }),
    new BaseProvider({
      id: 'minimax',
      name: 'Minimax',
      models: ['abab6.5s-chat', 'minimax-text-01'],
      features: ['chat'],
      defaultModel: 'minimax-text-01',
      authEnvVar: 'MINIMAX_API_KEY',
      modalities: ['chat'],
    }),
    new BaseProvider({
      id: 'glm',
      name: 'GLM',
      models: ['glm-4-plus', 'glm-4-air'],
      features: ['chat', 'tools'],
      defaultModel: 'glm-4-plus',
      authEnvVar: 'GLM_API_KEY',
      modalities: ['chat', 'tools', 'vision'],
    }),
    new BaseProvider({
      id: 'qwen',
      name: 'Qwen',
      models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
      features: ['chat', 'tools'],
      defaultModel: 'qwen-max',
      authEnvVar: 'QWEN_API_KEY',
      modalities: ['chat', 'tools', 'vision'],
    }),
  ];
}

import { BaseProvider } from './base-provider.js';

export function createDefaultProviders() {
  return [
    new BaseProvider({
      id: 'openai',
      name: 'OpenAI',
      models: ['gpt-4.1', 'gpt-4o', 'gpt-5'],
      features: ['chat', 'tools', 'reasoning'],
    }),
    new BaseProvider({
      id: 'anthropic',
      name: 'Anthropic',
      models: ['claude-3.7-sonnet', 'claude-3.5-sonnet'],
      features: ['chat', 'tools', 'long-context'],
    }),
    new BaseProvider({
      id: 'kimi',
      name: 'Kimi',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      features: ['chat', 'long-context'],
    }),
    new BaseProvider({
      id: 'minimax',
      name: 'Minimax',
      models: ['abab6.5s-chat', 'minimax-text-01'],
      features: ['chat'],
    }),
    new BaseProvider({
      id: 'glm',
      name: 'GLM',
      models: ['glm-4-plus', 'glm-4-air'],
      features: ['chat', 'tools'],
    }),
    new BaseProvider({
      id: 'qwen',
      name: 'Qwen',
      models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
      features: ['chat', 'tools'],
    }),
  ];
}

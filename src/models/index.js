import { createOpenAIProvider } from './openai.js';
import { createAnthropicProvider } from './anthropic.js';
import { createKimiProvider } from './kimi.js';
import { createMinimaxProvider } from './minimax.js';
import { createGLMProvider } from './glm.js';
import { createQwenProvider } from './qwen.js';

export function createDefaultProviders() {
  return [
    createOpenAIProvider(),
    createAnthropicProvider(),
    createKimiProvider(),
    createMinimaxProvider(),
    createGLMProvider(),
    createQwenProvider(),
  ];
}

import { openaiProviderScaffold } from './openai.js';
import { anthropicProviderScaffold } from './anthropic.js';
import { kimiProviderScaffold } from './kimi.js';
import { minimaxProviderScaffold } from './minimax.js';
import { glmProviderScaffold } from './glm.js';
import { qwenProviderScaffold } from './qwen.js';

export const DEFAULT_PROVIDER_SCAFFOLDS = [
  openaiProviderScaffold,
  anthropicProviderScaffold,
  kimiProviderScaffold,
  minimaxProviderScaffold,
  glmProviderScaffold,
  qwenProviderScaffold,
];

export const DEFAULT_PROVIDER_SCAFFOLDS_BY_ID = new Map(
  DEFAULT_PROVIDER_SCAFFOLDS.map((provider) => [provider.id, provider]),
);

export function normalizeProviderToolArguments(argumentsValue) {
  if (typeof argumentsValue === 'string') {
    const trimmed = argumentsValue.trim();
    return trimmed.length > 0 ? trimmed : '{}';
  }

  if (argumentsValue && typeof argumentsValue === 'object') {
    try {
      const serialized = JSON.stringify(argumentsValue);
      return typeof serialized === 'string' && serialized.length > 0 ? serialized : '{}';
    } catch {
      return '{}';
    }
  }

  return '{}';
}

function cloneStringArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

export class BaseProvider {
  constructor({
    id,
    name,
    status = 'planned',
    models = [],
    features = [],
    defaultModel = null,
    authEnvVar = null,
    modalities = [],
    implementationPath = null,
    nextStep = null,
  } = {}) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.models = cloneStringArray(models);
    this.features = cloneStringArray(features);
    this.defaultModel = defaultModel;
    this.authEnvVar = authEnvVar;
    this.modalities = cloneStringArray(modalities);
    this.implementationPath = implementationPath;
    this.nextStep = nextStep;
  }

  requiredEnvVars() {
    return typeof this.authEnvVar === 'string' && this.authEnvVar.length > 0 ? [this.authEnvVar] : [];
  }

  missingEnvVars(environment = process.env) {
    return this.requiredEnvVars().filter((envVar) => !hasConfiguredEnvValue(environment?.[envVar]));
  }

  isConfigured(environment = process.env) {
    const envVars = this.requiredEnvVars();
    return envVars.length > 0 && this.missingEnvVars(environment).length === 0;
  }

  supportsFeature(feature) {
    return typeof feature === 'string' && this.features.includes(feature);
  }

  supportsModality(modality) {
    return typeof modality === 'string' && this.modalities.includes(modality);
  }

  summary() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      models: cloneStringArray(this.models),
      features: cloneStringArray(this.features),
      defaultModel: this.defaultModel,
      authEnvVar: this.authEnvVar,
      modalities: cloneStringArray(this.modalities),
      implementationPath: this.implementationPath,
      nextStep: this.nextStep,
    };
  }
}

function hasConfiguredEnvValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectProviderTextFragments(content, fragments = []) {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.length > 0) {
      fragments.push(trimmed);
    }
    return fragments;
  }

  if (Array.isArray(content)) {
    content.forEach((part) => collectProviderTextFragments(part, fragments));
    return fragments;
  }

  if (!content || typeof content !== 'object') {
    return fragments;
  }

  if (typeof content.text === 'string') {
    const trimmed = content.text.trim();
    if (trimmed.length > 0) {
      fragments.push(trimmed);
    }
  } else if (content.text && typeof content.text === 'object') {
    collectProviderTextFragments(content.text.value, fragments);
    collectProviderTextFragments(content.text.content, fragments);
  }

  if (typeof content.content === 'string') {
    const trimmed = content.content.trim();
    if (trimmed.length > 0) {
      fragments.push(trimmed);
    }
  } else if (Array.isArray(content.content)) {
    content.content.forEach((part) => collectProviderTextFragments(part, fragments));
  }

  if (Array.isArray(content.parts)) {
    content.parts.forEach((part) => collectProviderTextFragments(part, fragments));
  }

  if (typeof content.value === 'string') {
    const trimmed = content.value.trim();
    if (trimmed.length > 0) {
      fragments.push(trimmed);
    }
  }

  return fragments;
}

export function extractProviderTextContent(content) {
  const text = collectProviderTextFragments(content)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 0 ? text : null;
}

export function resolveOpenAICompatibleResponseMessage(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const choiceMessage = choice?.message && typeof choice.message === 'object' ? choice.message : null;
  if (choiceMessage) {
    return choiceMessage;
  }

  const outputItems = Array.isArray(response.output) ? response.output : [];
  const outputMessage = outputItems.find((item) => item && typeof item === 'object' && item.type === 'message');
  if (outputMessage && typeof outputMessage === 'object') {
    return {
      role: typeof outputMessage.role === 'string' && outputMessage.role.length > 0 ? outputMessage.role : 'assistant',
      content: outputMessage.content,
      tool_calls: outputMessage.tool_calls,
    };
  }

  return {};
}

export function resolveOpenAICompatibleToolCalls(response = {}) {
  const choice = Array.isArray(response.choices) ? response.choices[0] ?? {} : {};
  const choiceMessage = choice?.message && typeof choice.message === 'object' ? choice.message : {};
  if (Array.isArray(choiceMessage.tool_calls) && choiceMessage.tool_calls.length > 0) {
    return choiceMessage.tool_calls;
  }

  const outputItems = Array.isArray(response.output) ? response.output : [];
  return outputItems
    .filter((item) => item && typeof item === 'object' && item.type === 'function_call')
    .map((item) => ({
      id: typeof item.call_id === 'string' && item.call_id.length > 0
        ? item.call_id
        : (typeof item.id === 'string' && item.id.length > 0 ? item.id : null),
      type: 'function',
      function: {
        name: typeof item.name === 'string' && item.name.length > 0 ? item.name : null,
        arguments: item.arguments,
      },
    }));
}

export function normalizeOpenAICompatibleUsage(usage = {}) {
  const promptTokens = Number.isFinite(usage?.prompt_tokens)
    ? usage.prompt_tokens
    : (Number.isFinite(usage?.input_tokens) ? usage.input_tokens : 0);
  const completionTokens = Number.isFinite(usage?.completion_tokens)
    ? usage.completion_tokens
    : (Number.isFinite(usage?.output_tokens) ? usage.output_tokens : 0);
  const totalTokens = Number.isFinite(usage?.total_tokens)
    ? usage.total_tokens
    : (promptTokens > 0 || completionTokens > 0 ? promptTokens + completionTokens : 0);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

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
    this.models = models;
    this.features = features;
    this.defaultModel = defaultModel;
    this.authEnvVar = authEnvVar;
    this.modalities = modalities;
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
      models: this.models,
      features: this.features,
      defaultModel: this.defaultModel,
      authEnvVar: this.authEnvVar,
      modalities: this.modalities,
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

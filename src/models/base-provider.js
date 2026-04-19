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
    return this.requiredEnvVars().filter((envVar) => !environment?.[envVar]);
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

export function extractProviderTextContent(content) {
  if (typeof content === 'string' && content.length > 0) {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const text = content
    .map((part) => {
      if (!part || typeof part !== 'object') {
        return null;
      }

      if (typeof part.text === 'string' && part.text.trim().length > 0) {
        return part.text.trim();
      }

      if (typeof part.content === 'string' && part.content.trim().length > 0) {
        return part.content.trim();
      }

      return null;
    })
    .filter(Boolean)
    .join(' ')
    .trim();

  return text.length > 0 ? text : null;
}

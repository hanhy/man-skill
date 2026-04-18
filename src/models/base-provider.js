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

  missingEnvVars(environment = process.env) {
    if (!this.authEnvVar) {
      return [];
    }

    return environment?.[this.authEnvVar] ? [] : [this.authEnvVar];
  }

  isConfigured(environment = process.env) {
    return this.authEnvVar ? this.missingEnvVars(environment).length === 0 : false;
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

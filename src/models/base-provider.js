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

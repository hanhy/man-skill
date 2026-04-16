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
  } = {}) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.models = models;
    this.features = features;
    this.defaultModel = defaultModel;
    this.authEnvVar = authEnvVar;
    this.modalities = modalities;
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
    };
  }
}

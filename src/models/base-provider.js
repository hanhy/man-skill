export class BaseProvider {
  constructor({ id, name, status = 'planned', models = [], features = [] } = {}) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.models = models;
    this.features = features;
  }

  summary() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      models: this.models,
      features: this.features,
    };
  }
}

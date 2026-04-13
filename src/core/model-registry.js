export class ModelRegistry {
  constructor(providers = []) {
    this.providers = providers;
  }

  register(provider) {
    this.providers.push(provider);
  }

  summary() {
    return {
      providerCount: this.providers.length,
      providers: this.providers,
    };
  }
}

export class BaseChannel {
  constructor({
    id,
    name,
    transport = 'chat',
    direction = ['inbound', 'outbound'],
    status = 'planned',
    capabilities = [],
    auth = null,
    deliveryModes = [],
    inboundPath = null,
    outboundMode = null,
    implementationPath = null,
    nextStep = null,
  } = {}) {
    this.id = id;
    this.name = name;
    this.transport = transport;
    this.direction = direction;
    this.status = status;
    this.capabilities = capabilities;
    this.auth = auth;
    this.deliveryModes = deliveryModes;
    this.inboundPath = inboundPath;
    this.outboundMode = outboundMode;
    this.implementationPath = implementationPath;
    this.nextStep = nextStep;
  }

  requiredEnvVars() {
    return Array.isArray(this.auth?.envVars) ? [...this.auth.envVars] : [];
  }

  missingEnvVars(environment = process.env) {
    return this.requiredEnvVars().filter((envVar) => !environment?.[envVar]);
  }

  isConfigured(environment = process.env) {
    const envVars = this.requiredEnvVars();
    return envVars.length > 0 && this.missingEnvVars(environment).length === 0;
  }

  supportsCapability(capability) {
    return typeof capability === 'string' && this.capabilities.includes(capability);
  }

  summary() {
    return {
      id: this.id,
      name: this.name,
      transport: this.transport,
      direction: this.direction,
      status: this.status,
      capabilities: this.capabilities,
      auth: this.auth,
      deliveryModes: this.deliveryModes,
      inboundPath: this.inboundPath,
      outboundMode: this.outboundMode,
      implementationPath: this.implementationPath,
      nextStep: this.nextStep,
    };
  }
}

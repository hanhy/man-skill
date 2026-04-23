function cloneStringArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function cloneChannelAuth(auth) {
  if (!auth || typeof auth !== 'object') {
    return null;
  }

  return {
    ...auth,
    envVars: cloneStringArray(auth.envVars),
  };
}

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
    this.direction = cloneStringArray(direction);
    this.status = status;
    this.capabilities = cloneStringArray(capabilities);
    this.auth = cloneChannelAuth(auth);
    this.deliveryModes = cloneStringArray(deliveryModes);
    this.inboundPath = inboundPath;
    this.outboundMode = outboundMode;
    this.implementationPath = implementationPath;
    this.nextStep = nextStep;
  }

  requiredEnvVars() {
    return Array.isArray(this.auth?.envVars) ? [...this.auth.envVars] : [];
  }

  missingEnvVars(environment = process.env) {
    return this.requiredEnvVars().filter((envVar) => !hasConfiguredEnvValue(environment?.[envVar]));
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
      direction: cloneStringArray(this.direction),
      status: this.status,
      capabilities: cloneStringArray(this.capabilities),
      auth: cloneChannelAuth(this.auth),
      deliveryModes: cloneStringArray(this.deliveryModes),
      inboundPath: this.inboundPath,
      outboundMode: this.outboundMode,
      implementationPath: this.implementationPath,
      nextStep: this.nextStep,
    };
  }
}

function hasConfiguredEnvValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

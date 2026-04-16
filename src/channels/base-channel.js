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
    this.implementationPath = implementationPath;
    this.nextStep = nextStep;
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
      implementationPath: this.implementationPath,
      nextStep: this.nextStep,
    };
  }
}

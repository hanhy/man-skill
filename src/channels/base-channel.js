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

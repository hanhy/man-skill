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
  } = {}) {
    this.id = id;
    this.name = name;
    this.transport = transport;
    this.direction = direction;
    this.status = status;
    this.capabilities = capabilities;
    this.auth = auth;
    this.deliveryModes = deliveryModes;
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
    };
  }
}

import { BaseRegistry } from './base-registry.js';

const DEFAULT_CHANNELS = [
  {
    id: 'slack',
    name: 'Slack',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
  },
  {
    id: 'feishu',
    name: 'Feishu',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
  },
];

export class ChannelRegistry extends BaseRegistry {
  constructor(channels = DEFAULT_CHANNELS) {
    super(channels);
  }

  normalize(channel) {
    if (typeof channel === 'string') {
      return {
        id: channel,
        name: channel,
        transport: 'chat',
        direction: ['inbound'],
        status: 'unknown',
      };
    }

    return {
      transport: 'chat',
      direction: ['inbound'],
      status: 'unknown',
      ...channel,
    };
  }

  summary() {
    return {
      channelCount: this.count(),
      channels: this.list(),
    };
  }
}

import { BaseRegistry } from './base-registry.js';

function collectAuthEnvVars(channels) {
  return [...new Set(channels.flatMap((channel) => channel.auth?.envVars ?? []))].sort((left, right) => left.localeCompare(right));
}

const DEFAULT_CHANNELS = [
  {
    id: 'slack',
    name: 'Slack',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
    capabilities: ['threads', 'mentions', 'bot-token'],
    auth: {
      type: 'bot-token',
      envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
    },
    deliveryModes: ['events-api', 'web-api'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
    capabilities: ['bot-token', 'webhook', 'polling'],
    auth: {
      type: 'bot-token',
      envVars: ['TELEGRAM_BOT_TOKEN'],
    },
    deliveryModes: ['polling', 'webhook'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
    capabilities: ['session', 'group-chat', 'business-api'],
    auth: {
      type: 'access-token',
      envVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    },
    deliveryModes: ['cloud-api', 'session-bridge'],
  },
  {
    id: 'feishu',
    name: 'Feishu',
    transport: 'chat',
    direction: ['inbound', 'outbound'],
    status: 'planned',
    capabilities: ['tenant-app', 'docs', 'bot'],
    auth: {
      type: 'tenant-app',
      envVars: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'],
    },
    deliveryModes: ['event-subscription', 'webhook'],
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
        capabilities: [],
        auth: null,
        deliveryModes: [],
      };
    }

    return {
      transport: 'chat',
      direction: ['inbound'],
      status: 'unknown',
      capabilities: [],
      auth: null,
      deliveryModes: [],
      ...channel,
    };
  }

  summary() {
    const channels = this.list();
    return {
      channelCount: this.count(),
      activeCount: channels.filter((channel) => channel.status === 'active').length,
      plannedCount: channels.filter((channel) => channel.status === 'planned').length,
      candidateCount: channels.filter((channel) => channel.status === 'candidate').length,
      authEnvVars: collectAuthEnvVars(channels),
      channels,
    };
  }
}

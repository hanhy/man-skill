import { BaseRegistry } from './base-registry.js';

export interface ChannelAuthRecord {
  type: string;
  envVars: string[];
}

export interface ChannelRecord {
  id: string;
  name: string;
  transport: string;
  direction: string[];
  status: string;
  capabilities: string[];
  auth: ChannelAuthRecord | null;
  deliveryModes: string[];
  inboundPath?: string | null;
  outboundMode?: string | null;
  implementationPath?: string | null;
  nextStep?: string | null;
  [key: string]: unknown;
}

function mergeStringLists(...lists: Array<string[] | undefined>): string[] {
  return [...new Set(lists.flatMap((list) => (Array.isArray(list) ? list : [])))];
}

function collectAuthEnvVars(channels: ChannelRecord[]): string[] {
  return [...new Set(channels.flatMap((channel) => channel.auth?.envVars ?? []))].sort((left, right) => left.localeCompare(right));
}

function mergeChannelAuth(
  defaultAuth: ChannelAuthRecord | null | undefined,
  overrideAuth: ChannelAuthRecord | null | undefined,
): ChannelAuthRecord | null {
  if (overrideAuth === null) {
    return null;
  }

  if (!defaultAuth && !overrideAuth) {
    return null;
  }

  return {
    type: overrideAuth?.type ?? defaultAuth?.type ?? 'unknown',
    envVars: mergeStringLists(defaultAuth?.envVars, overrideAuth?.envVars),
  };
}

const DEFAULT_CHANNELS: ChannelRecord[] = [
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
    inboundPath: '/hooks/slack/events',
    outboundMode: 'thread-reply',
    implementationPath: 'src/channels/slack.js',
    nextStep: 'implement inbound event handling and outbound thread replies',
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
    inboundPath: '/hooks/telegram',
    outboundMode: 'chat-send',
    implementationPath: 'src/channels/telegram.js',
    nextStep: 'wire bot webhook intake and outbound chat sends',
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
    inboundPath: '/hooks/whatsapp',
    outboundMode: 'session-send',
    implementationPath: 'src/channels/whatsapp.js',
    nextStep: 'map business-api webhooks and outbound message delivery',
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
    inboundPath: '/hooks/feishu/events',
    outboundMode: 'bot-message',
    implementationPath: 'src/channels/feishu.js',
    nextStep: 'hook tenant-app event subscriptions into inbound delivery flow',
  },
];

const DEFAULT_CHANNELS_BY_ID = new Map(DEFAULT_CHANNELS.map((channel) => [channel.id, channel]));

export class ChannelRegistry extends BaseRegistry<string | ChannelRecord> {
  constructor(channels: Array<string | ChannelRecord> = DEFAULT_CHANNELS) {
    super(channels);
  }

  normalize(channel: string | ChannelRecord): ChannelRecord {
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
        inboundPath: null,
        outboundMode: null,
        implementationPath: null,
        nextStep: null,
      };
    }

    const defaultChannel = typeof channel.id === 'string' ? DEFAULT_CHANNELS_BY_ID.get(channel.id) : undefined;
    const normalizedChannel = {
      transport: 'chat',
      direction: ['inbound'],
      status: 'unknown',
      capabilities: [],
      auth: null,
      deliveryModes: [],
      inboundPath: null,
      outboundMode: null,
      implementationPath: null,
      nextStep: null,
      ...defaultChannel,
      ...channel,
    };

    return {
      ...normalizedChannel,
      direction: mergeStringLists(defaultChannel?.direction, channel.direction),
      capabilities: mergeStringLists(defaultChannel?.capabilities, channel.capabilities),
      deliveryModes: mergeStringLists(defaultChannel?.deliveryModes, channel.deliveryModes),
      auth: mergeChannelAuth(defaultChannel?.auth, channel.auth),
    };
  }

  summary(): { channelCount: number; activeCount: number; plannedCount: number; candidateCount: number; authEnvVars: string[]; channels: ChannelRecord[] } {
    const channels = this.list() as ChannelRecord[];
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

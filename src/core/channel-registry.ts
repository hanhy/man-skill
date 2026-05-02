import { DEFAULT_CHANNEL_SCAFFOLDS, DEFAULT_CHANNEL_SCAFFOLDS_BY_ID } from '../channels/scaffolds.js';
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

const DEFAULT_CHANNELS: ChannelRecord[] = DEFAULT_CHANNEL_SCAFFOLDS.map((channel) => ({
  ...channel,
  direction: [...channel.direction],
  capabilities: [...channel.capabilities],
  auth: channel.auth
    ? {
        ...channel.auth,
        envVars: [...channel.auth.envVars],
      }
    : null,
  deliveryModes: [...channel.deliveryModes],
}));

export class ChannelRegistry extends BaseRegistry<string | ChannelRecord> {
  constructor(channels: Array<string | ChannelRecord> = DEFAULT_CHANNELS) {
    super(channels);
  }

  normalize(channel: string | ChannelRecord): ChannelRecord {
    if (typeof channel === 'string') {
      const defaultChannel = DEFAULT_CHANNEL_SCAFFOLDS_BY_ID.get(channel);
      if (defaultChannel) {
        return {
          ...defaultChannel,
          direction: [...defaultChannel.direction],
          capabilities: [...defaultChannel.capabilities],
          auth: defaultChannel.auth
            ? {
                ...defaultChannel.auth,
                envVars: [...defaultChannel.auth.envVars],
              }
            : null,
          deliveryModes: [...defaultChannel.deliveryModes],
        };
      }

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

    const defaultChannel = typeof channel.id === 'string' ? DEFAULT_CHANNEL_SCAFFOLDS_BY_ID.get(channel.id) : undefined;
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

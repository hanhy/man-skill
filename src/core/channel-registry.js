import { BaseRegistry } from './base-registry.js';
import { DEFAULT_CHANNEL_SCAFFOLDS, DEFAULT_CHANNEL_SCAFFOLDS_BY_ID } from '../channels/scaffolds.js';

function mergeStringLists(...lists) {
  return [...new Set(lists.flatMap((list) => (Array.isArray(list) ? list : [])))];
}

function collectAuthEnvVars(channels) {
  return [...new Set(channels.flatMap((channel) => channel.auth?.envVars ?? []))].sort((left, right) => left.localeCompare(right));
}

function mergeChannelAuth(defaultAuth, overrideAuth) {
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

const DEFAULT_CHANNELS = DEFAULT_CHANNEL_SCAFFOLDS;
const DEFAULT_CHANNELS_BY_ID = DEFAULT_CHANNEL_SCAFFOLDS_BY_ID;

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

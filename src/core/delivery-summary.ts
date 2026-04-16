type DeliveryManifestSummary = {
  path?: string;
  status?: string;
};

type ChannelSummaryRecord = {
  id?: string;
  name?: string;
  status?: string;
  deliveryModes?: string[];
  auth?: {
    envVars?: string[];
  } | null;
};

type ChannelsSummary = {
  channels?: ChannelSummaryRecord[];
  manifest?: DeliveryManifestSummary;
} | null;

type ProviderSummaryRecord = {
  id?: string;
  name?: string;
  status?: string;
  defaultModel?: string | null;
  authEnvVar?: string | null;
  modalities?: string[];
};

type ModelsSummary = {
  providers?: ProviderSummaryRecord[];
  manifest?: DeliveryManifestSummary;
} | null;

export type DeliveryChannelQueueItem = {
  id: string | null;
  name: string | null;
  status: string;
  authEnvVars: string[];
  deliveryModes: string[];
  manifestPath: string;
  setupHint: string;
};

export type DeliveryProviderQueueItem = {
  id: string | null;
  name: string | null;
  status: string;
  defaultModel: string | null;
  authEnvVar: string | null;
  modalities: string[];
  manifestPath: string;
  setupHint: string;
};

export type DeliverySummary = {
  pendingChannelCount: number;
  pendingProviderCount: number;
  channelManifestPath: string;
  providerManifestPath: string;
  channelQueue: DeliveryChannelQueueItem[];
  providerQueue: DeliveryProviderQueueItem[];
};

function buildChannelSetupHint(record: ChannelSummaryRecord): string {
  const envVars = (record.auth?.envVars ?? []).filter(Boolean);
  if (envVars.length > 0) {
    return `set ${envVars.join(', ')}`;
  }

  return 'define channel credentials';
}

function buildProviderSetupHint(record: ProviderSummaryRecord): string {
  if (record.authEnvVar && record.defaultModel) {
    return `set ${record.authEnvVar} for ${record.defaultModel}`;
  }

  if (record.authEnvVar) {
    return `set ${record.authEnvVar}`;
  }

  if (record.defaultModel) {
    return `choose auth for ${record.defaultModel}`;
  }

  return 'choose auth and default model';
}

export function buildDeliverySummary(channels: ChannelsSummary = null, models: ModelsSummary = null): DeliverySummary {
  const channelManifestPath = channels?.manifest?.path ?? 'manifests/channels.json';
  const providerManifestPath = models?.manifest?.path ?? 'manifests/providers.json';
  const channelQueue = (channels?.channels ?? [])
    .filter((channel) => channel?.status !== 'active')
    .map((channel) => ({
      id: channel.id ?? null,
      name: channel.name ?? channel.id ?? null,
      status: channel.status ?? 'unknown',
      authEnvVars: (channel.auth?.envVars ?? []).filter(Boolean),
      deliveryModes: (channel.deliveryModes ?? []).filter(Boolean),
      manifestPath: channelManifestPath,
      setupHint: buildChannelSetupHint(channel),
    }));
  const providerQueue = (models?.providers ?? [])
    .filter((provider) => provider?.status !== 'active')
    .map((provider) => ({
      id: provider.id ?? null,
      name: provider.name ?? provider.id ?? null,
      status: provider.status ?? 'unknown',
      defaultModel: provider.defaultModel ?? null,
      authEnvVar: provider.authEnvVar ?? null,
      modalities: (provider.modalities ?? []).filter(Boolean),
      manifestPath: providerManifestPath,
      setupHint: buildProviderSetupHint(provider),
    }));

  return {
    pendingChannelCount: channelQueue.length,
    pendingProviderCount: providerQueue.length,
    channelManifestPath,
    providerManifestPath,
    channelQueue,
    providerQueue,
  };
}

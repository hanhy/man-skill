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
  configured: boolean;
  missingEnvVars: string[];
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
  configured: boolean;
  missingEnvVars: string[];
  manifestPath: string;
  setupHint: string;
};

export type DeliverySummary = {
  pendingChannelCount: number;
  pendingProviderCount: number;
  configuredChannelCount: number;
  configuredProviderCount: number;
  missingChannelEnvVars: string[];
  missingProviderEnvVars: string[];
  requiredEnvVars: string[];
  channelManifestPath: string;
  providerManifestPath: string;
  envTemplatePath: string | null;
  envTemplatePresent: boolean;
  envTemplateCommand: string | null;
  channelQueue: DeliveryChannelQueueItem[];
  providerQueue: DeliveryProviderQueueItem[];
};

function collectMissingEnvVars(envVars: string[], environment: NodeJS.ProcessEnv): string[] {
  return envVars.filter((envVar) => !environment[envVar]);
}

function buildChannelSetupHint(record: ChannelSummaryRecord, environment: NodeJS.ProcessEnv): string {
  const envVars = (record.auth?.envVars ?? []).filter(Boolean);
  const missingEnvVars = collectMissingEnvVars(envVars, environment);
  if (envVars.length === 0) {
    return 'define channel credentials';
  }

  if (missingEnvVars.length === 0) {
    return 'credentials present';
  }

  return `set ${missingEnvVars.join(', ')}`;
}

function buildProviderSetupHint(record: ProviderSummaryRecord, environment: NodeJS.ProcessEnv): string {
  const missingEnvVars = record.authEnvVar ? collectMissingEnvVars([record.authEnvVar], environment) : [];
  const authConfigured = missingEnvVars.length === 0 && Boolean(record.authEnvVar);

  if (authConfigured && record.defaultModel) {
    return `auth configured for ${record.defaultModel}`;
  }

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

export function buildDeliverySummary(
  channels: ChannelsSummary = null,
  models: ModelsSummary = null,
  environment: NodeJS.ProcessEnv = process.env,
): DeliverySummary {
  const channelManifestPath = channels?.manifest?.path ?? 'manifests/channels.json';
  const providerManifestPath = models?.manifest?.path ?? 'manifests/providers.json';
  const channelQueue = (channels?.channels ?? [])
    .filter((channel) => channel?.status !== 'active')
    .map((channel) => {
      const authEnvVars = (channel.auth?.envVars ?? []).filter(Boolean);
      const missingEnvVars = collectMissingEnvVars(authEnvVars, environment);
      return {
        id: channel.id ?? null,
        name: channel.name ?? channel.id ?? null,
        status: channel.status ?? 'unknown',
        authEnvVars,
        deliveryModes: (channel.deliveryModes ?? []).filter(Boolean),
        configured: authEnvVars.length > 0 && missingEnvVars.length === 0,
        missingEnvVars,
        manifestPath: channelManifestPath,
        setupHint: buildChannelSetupHint(channel, environment),
      };
    });
  const providerQueue = (models?.providers ?? [])
    .filter((provider) => provider?.status !== 'active')
    .map((provider) => {
      const missingEnvVars = provider.authEnvVar ? collectMissingEnvVars([provider.authEnvVar], environment) : [];
      return {
        id: provider.id ?? null,
        name: provider.name ?? provider.id ?? null,
        status: provider.status ?? 'unknown',
        defaultModel: provider.defaultModel ?? null,
        authEnvVar: provider.authEnvVar ?? null,
        modalities: (provider.modalities ?? []).filter(Boolean),
        configured: Boolean(provider.authEnvVar) && missingEnvVars.length === 0,
        missingEnvVars,
        manifestPath: providerManifestPath,
        setupHint: buildProviderSetupHint(provider, environment),
      };
    });

  const requiredEnvVars = [
    ...(channels?.channels ?? []).flatMap((channel) => (channel.auth?.envVars ?? []).filter(Boolean)),
    ...(models?.providers ?? []).flatMap((provider) => (provider.authEnvVar ? [provider.authEnvVar] : [])),
  ].filter(Boolean);

  return {
    pendingChannelCount: channelQueue.length,
    pendingProviderCount: providerQueue.length,
    configuredChannelCount: channelQueue.filter((channel) => channel.configured).length,
    configuredProviderCount: providerQueue.filter((provider) => provider.configured).length,
    missingChannelEnvVars: [...new Set(channelQueue.flatMap((channel) => channel.missingEnvVars))].sort((left, right) => left.localeCompare(right)),
    missingProviderEnvVars: [...new Set(providerQueue.flatMap((provider) => provider.missingEnvVars))].sort((left, right) => left.localeCompare(right)),
    requiredEnvVars: [...new Set(requiredEnvVars)].sort((left, right) => left.localeCompare(right)),
    channelManifestPath,
    providerManifestPath,
    envTemplatePath: null,
    envTemplatePresent: false,
    envTemplateCommand: null,
    channelQueue,
    providerQueue,
  };
}

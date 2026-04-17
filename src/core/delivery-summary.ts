import fs from 'node:fs';
import path from 'node:path';

type DeliveryManifestSummary = {
  path?: string;
  status?: string;
};

type ChannelSummaryRecord = {
  id?: string;
  name?: string;
  status?: string;
  deliveryModes?: string[];
  implementationPath?: string | null;
  nextStep?: string | null;
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
  implementationPath?: string | null;
  nextStep?: string | null;
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
  implementationPath: string | null;
  implementationPresent: boolean;
  implementationScaffoldPath: string | null;
  configured: boolean;
  missingEnvVars: string[];
  manifestPath: string;
  manifestPresent: boolean;
  manifestScaffoldPath: string | null;
  setupHint: string;
  nextStep: string | null;
};

export type DeliveryProviderQueueItem = {
  id: string | null;
  name: string | null;
  status: string;
  defaultModel: string | null;
  authEnvVar: string | null;
  modalities: string[];
  implementationPath: string | null;
  implementationPresent: boolean;
  implementationScaffoldPath: string | null;
  configured: boolean;
  missingEnvVars: string[];
  manifestPath: string;
  manifestPresent: boolean;
  manifestScaffoldPath: string | null;
  setupHint: string;
  nextStep: string | null;
};

export type DeliverySummary = {
  pendingChannelCount: number;
  pendingProviderCount: number;
  configuredChannelCount: number;
  configuredProviderCount: number;
  readyChannelScaffoldCount: number;
  readyProviderScaffoldCount: number;
  missingChannelScaffoldCount: number;
  missingProviderScaffoldCount: number;
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

type DeliverySummaryOptions = {
  rootDir?: string | null;
};

function collectMissingEnvVars(envVars: string[], environment: NodeJS.ProcessEnv): string[] {
  return envVars.filter((envVar) => !environment[envVar]);
}

function normalizeRepoRelativePath(relativePath: string | null | undefined, rootDir?: string | null): string | null {
  if (!relativePath || !rootDir) {
    return null;
  }

  const resolvedRootDir = path.resolve(rootDir);
  const resolvedTargetPath = path.resolve(rootDir, relativePath);
  const normalizedRelativePath = path.relative(resolvedRootDir, resolvedTargetPath);

  if (normalizedRelativePath.startsWith('..') || path.isAbsolute(normalizedRelativePath)) {
    return null;
  }

  return normalizedRelativePath.split(path.sep).join('/');
}

function isRepoRelativePathPresent(relativePath: string | null | undefined, rootDir?: string | null): boolean {
  const normalizedPath = normalizeRepoRelativePath(relativePath, rootDir);
  if (!normalizedPath || !rootDir) {
    return false;
  }

  return fs.existsSync(path.resolve(rootDir, normalizedPath));
}

function isImplementationPresent(implementationPath: string | null | undefined, rootDir?: string | null): boolean {
  return isRepoRelativePathPresent(implementationPath, rootDir);
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
  options: DeliverySummaryOptions = {},
): DeliverySummary {
  const rootDir = options.rootDir ?? null;
  const channelManifestPath = channels?.manifest?.path ?? 'manifests/channels.json';
  const providerManifestPath = models?.manifest?.path ?? 'manifests/providers.json';
  const allChannelRecords = channels?.channels ?? [];
  const allProviderRecords = models?.providers ?? [];
  const channelQueue = (channels?.channels ?? [])
    .filter((channel) => channel?.status !== 'active')
    .map((channel) => {
      const authEnvVars = (channel.auth?.envVars ?? []).filter(Boolean);
      const missingEnvVars = collectMissingEnvVars(authEnvVars, environment);
      const implementationPath = channel.implementationPath ?? null;
      const manifestPresent = isRepoRelativePathPresent(channelManifestPath, rootDir);
      const implementationScaffoldPath = normalizeRepoRelativePath(implementationPath, rootDir);
      const manifestScaffoldPath = normalizeRepoRelativePath(channelManifestPath, rootDir);
      return {
        id: channel.id ?? null,
        name: channel.name ?? channel.id ?? null,
        status: channel.status ?? 'unknown',
        authEnvVars,
        deliveryModes: (channel.deliveryModes ?? []).filter(Boolean),
        implementationPath,
        implementationPresent: isImplementationPresent(implementationPath, rootDir),
        implementationScaffoldPath,
        configured: authEnvVars.length > 0 && missingEnvVars.length === 0,
        missingEnvVars,
        manifestPath: channelManifestPath,
        manifestPresent,
        manifestScaffoldPath,
        setupHint: buildChannelSetupHint(channel, environment),
        nextStep: typeof channel.nextStep === 'string' && channel.nextStep.trim().length > 0 ? channel.nextStep.trim() : null,
      };
    });
  const providerQueue = (models?.providers ?? [])
    .filter((provider) => provider?.status !== 'active')
    .map((provider) => {
      const missingEnvVars = provider.authEnvVar ? collectMissingEnvVars([provider.authEnvVar], environment) : [];
      const implementationPath = provider.implementationPath ?? null;
      const manifestPresent = isRepoRelativePathPresent(providerManifestPath, rootDir);
      const implementationScaffoldPath = normalizeRepoRelativePath(implementationPath, rootDir);
      const manifestScaffoldPath = normalizeRepoRelativePath(providerManifestPath, rootDir);
      return {
        id: provider.id ?? null,
        name: provider.name ?? provider.id ?? null,
        status: provider.status ?? 'unknown',
        defaultModel: provider.defaultModel ?? null,
        authEnvVar: provider.authEnvVar ?? null,
        modalities: (provider.modalities ?? []).filter(Boolean),
        implementationPath,
        implementationPresent: isImplementationPresent(implementationPath, rootDir),
        implementationScaffoldPath,
        configured: Boolean(provider.authEnvVar) && missingEnvVars.length === 0,
        missingEnvVars,
        manifestPath: providerManifestPath,
        manifestPresent,
        manifestScaffoldPath,
        setupHint: buildProviderSetupHint(provider, environment),
        nextStep: typeof provider.nextStep === 'string' && provider.nextStep.trim().length > 0 ? provider.nextStep.trim() : null,
      };
    });

  const requiredEnvVars = [
    ...(channels?.channels ?? []).flatMap((channel) => (channel.auth?.envVars ?? []).filter(Boolean)),
    ...(models?.providers ?? []).flatMap((provider) => (provider.authEnvVar ? [provider.authEnvVar] : [])),
  ].filter(Boolean);
  const channelScaffoldCoverage = allChannelRecords.map((channel) => isImplementationPresent(channel.implementationPath ?? null, rootDir));
  const providerScaffoldCoverage = allProviderRecords.map((provider) => isImplementationPresent(provider.implementationPath ?? null, rootDir));

  return {
    pendingChannelCount: channelQueue.length,
    pendingProviderCount: providerQueue.length,
    configuredChannelCount: channelQueue.filter((channel) => channel.configured).length,
    configuredProviderCount: providerQueue.filter((provider) => provider.configured).length,
    readyChannelScaffoldCount: channelScaffoldCoverage.filter(Boolean).length,
    readyProviderScaffoldCount: providerScaffoldCoverage.filter(Boolean).length,
    missingChannelScaffoldCount: channelScaffoldCoverage.filter((present) => !present).length,
    missingProviderScaffoldCount: providerScaffoldCoverage.filter((present) => !present).length,
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

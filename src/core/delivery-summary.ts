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
  capabilities?: string[];
  deliveryModes?: string[];
  inboundPath?: string | null;
  outboundMode?: string | null;
  implementationPath?: string | null;
  nextStep?: string | null;
  auth?: {
    type?: string;
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
  models?: string[];
  features?: string[];
  modalities?: string[];
  implementationPath?: string | null;
  nextStep?: string | null;
};

type ModelsSummary = {
  providers?: ProviderSummaryRecord[];
  manifest?: DeliveryManifestSummary;
} | null;

type DeliveryQueueHelperCommands = {
  bootstrapEnv: string | null;
  populateEnv: string | null;
  scaffoldManifest: string | null;
  scaffoldImplementation: string | null;
};

export type DeliveryChannelQueueItem = {
  id: string | null;
  name: string | null;
  status: string;
  authType: string | null;
  authEnvVars: string[];
  capabilities: string[];
  deliveryModes: string[];
  inboundPath: string | null;
  outboundMode: string | null;
  implementationPath: string | null;
  implementationPresent: boolean;
  implementationReady: boolean;
  implementationStatus: 'missing' | 'scaffold' | 'ready';
  implementationScaffoldPath: string | null;
  configured: boolean;
  missingEnvVars: string[];
  manifestPath: string;
  manifestPresent: boolean;
  manifestScaffoldPath: string | null;
  setupHint: string;
  nextStep: string | null;
  helperCommands: DeliveryQueueHelperCommands;
};

export type DeliveryProviderQueueItem = {
  id: string | null;
  name: string | null;
  status: string;
  defaultModel: string | null;
  authEnvVar: string | null;
  models: string[];
  features: string[];
  modalities: string[];
  implementationPath: string | null;
  implementationPresent: boolean;
  implementationReady: boolean;
  implementationStatus: 'missing' | 'scaffold' | 'ready';
  implementationScaffoldPath: string | null;
  configured: boolean;
  missingEnvVars: string[];
  manifestPath: string;
  manifestPresent: boolean;
  manifestScaffoldPath: string | null;
  setupHint: string;
  nextStep: string | null;
  helperCommands: DeliveryQueueHelperCommands;
};

export type DeliverySummary = {
  pendingChannelCount: number;
  pendingProviderCount: number;
  configuredChannelCount: number;
  configuredProviderCount: number;
  authBlockedChannelCount: number;
  authBlockedProviderCount: number;
  readyChannelScaffoldCount: number;
  readyProviderScaffoldCount: number;
  readyChannelImplementationCount: number;
  readyProviderImplementationCount: number;
  scaffoldOnlyChannelCount: number;
  scaffoldOnlyProviderCount: number;
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
  envTemplateVarNames: string[];
  envTemplateMissingRequiredVars: string[];
  helperCommands: {
    bootstrapEnv: string | null;
    populateEnvTemplate: string | null;
    populateDeliveryEnv: string | null;
    populateChannelEnv: string | null;
    populateProviderEnv: string | null;
    scaffoldChannelManifest: string | null;
    scaffoldProviderManifest: string | null;
    scaffoldChannelImplementation: string | null;
    scaffoldChannelImplementationBundle: string | null;
    scaffoldProviderImplementation: string | null;
    scaffoldProviderImplementationBundle: string | null;
  };
  channelQueue: DeliveryChannelQueueItem[];
  providerQueue: DeliveryProviderQueueItem[];
};

type DeliverySummaryOptions = {
  rootDir?: string | null;
  channelRolloutOrder?: readonly string[];
  providerRolloutOrder?: readonly string[];
};

function uniqueStringsPreservingOrder(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    if (typeof value !== 'string' || value.length === 0 || seen.has(value)) {
      return;
    }

    seen.add(value);
    result.push(value);
  });
  return result;
}

export function orderStringsByPreferredSequence(
  values: Array<string | null | undefined>,
  preferredOrder: readonly string[] = [],
): string[] {
  const normalizedValues = uniqueStringsPreservingOrder(values);
  if (normalizedValues.length === 0) {
    return [];
  }

  const preferred = uniqueStringsPreservingOrder(preferredOrder as string[]);
  if (preferred.length === 0) {
    return normalizedValues;
  }

  const valueSet = new Set(normalizedValues);
  const orderedPreferred = preferred.filter((value) => valueSet.has(value));
  const orderedExtras = normalizedValues.filter((value) => !preferred.includes(value));
  return [...orderedPreferred, ...orderedExtras];
}

function collectMissingEnvVars(envVars: string[], environment: NodeJS.ProcessEnv): string[] {
  return envVars.filter((envVar) => !hasConfiguredEnvValue(environment[envVar]));
}

function hasConfiguredEnvValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
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

function detectImplementationStatus(implementationPath: string | null | undefined, rootDir?: string | null): {
  present: boolean;
  ready: boolean;
  status: 'missing' | 'scaffold' | 'ready';
} {
  const normalizedPath = normalizeRepoRelativePath(implementationPath, rootDir);
  if (!normalizedPath || !rootDir) {
    return { present: false, ready: false, status: 'missing' };
  }

  const resolvedPath = path.resolve(rootDir, normalizedPath);
  if (!fs.existsSync(resolvedPath)) {
    return { present: false, ready: false, status: 'missing' };
  }

  try {
    if (!fs.statSync(resolvedPath).isFile()) {
      return { present: false, ready: false, status: 'missing' };
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const normalizedContent = content.replace(/\r\n/g, '\n').trim();
    const isFactoryOnlyScaffold = /^import\s+\{\s*Base(?:Channel|Provider)\s*\}\s+from\s+['"][^'"]+['"];\s*export\s+const\s+\w+Scaffold\s*=\s*\{[\s\S]*?\};\s*export\s+function\s+create\w+\s*\(\s*overrides\s*=\s*\{\s*\}\s*\)\s*\{\s*return\s+new\s+Base(?:Channel|Provider)\s*\(\s*\{\s*\.\.\.\w+Scaffold\s*,\s*\.\.\.overrides\s*\}\s*\);\s*\}\s*$/u.test(normalizedContent);
    const hasRuntimeSurface = /\b(?:export\s+default\s+)?(?:async\s+)?function\b|\bclass\b|=>|module\.exports|exports\./u.test(content);
    const isScaffoldOnly = isFactoryOnlyScaffold || (!hasRuntimeSurface && (
      /Scaffold\s*=\s*\{/u.test(content)
      || /export\s+const\s+(?:channelId|providerId)\s*=\s*/u.test(content)
    ));

    return {
      present: true,
      ready: !isScaffoldOnly,
      status: isScaffoldOnly ? 'scaffold' : 'ready',
    };
  } catch {
    return { present: false, ready: false, status: 'missing' };
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildRelativeFileTouchCommand(relativePath: string | null | undefined): string | null {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    return null;
  }

  const normalizedPath = relativePath.split(path.sep).join('/');
  const directory = path.posix.dirname(normalizedPath);
  if (!directory || directory === '.') {
    return `touch ${shellSingleQuote(normalizedPath)}`;
  }

  return `mkdir -p ${shellSingleQuote(directory)} && touch ${shellSingleQuote(normalizedPath)}`;
}

function buildCommandBundle(commands: Array<string | null | undefined>): string | null {
  const normalizedCommands = commands.filter((command): command is string => typeof command === 'string' && command.length > 0);
  if (normalizedCommands.length === 0) {
    return null;
  }

  if (normalizedCommands.length === 1) {
    return normalizedCommands[0];
  }

  return normalizedCommands.map((command) => `(${command})`).join(' && ');
}

export function buildPopulateEnvCommand(envVars: string[], envFilePath = '.env'): string | null {
  const normalizedEnvVars = Array.from(new Set(
    envVars.filter((envVar): envVar is string => typeof envVar === 'string' && envVar.length > 0),
  ));
  if (normalizedEnvVars.length === 0) {
    return null;
  }

  const quotedEnvVars = normalizedEnvVars.map((envVar) => shellSingleQuote(envVar)).join(' ');
  const quotedEnvFilePath = shellSingleQuote(envFilePath);
  return `touch ${quotedEnvFilePath} && for key in ${quotedEnvVars}; do grep -Eq "^(export[[:space:]]+)?\${key}=" ${quotedEnvFilePath} || printf '%s=\\n' "$key" >> ${quotedEnvFilePath}; done`;
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

export const CHANNEL_ROLLOUT_ORDER = ['feishu', 'telegram', 'whatsapp', 'slack'] as const;
export const PROVIDER_ROLLOUT_ORDER = ['openai', 'anthropic', 'kimi', 'minimax', 'glm', 'qwen'] as const;

function compareRolloutOrder(
  leftId: string | null | undefined,
  rightId: string | null | undefined,
  rolloutOrder: readonly string[],
) {
  const leftIndex = typeof leftId === 'string' ? rolloutOrder.indexOf(leftId) : -1;
  const rightIndex = typeof rightId === 'string' ? rolloutOrder.indexOf(rightId) : -1;

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
  }

  return (leftId ?? '').localeCompare(rightId ?? '');
}

function collectOrderedChannelEnvVars(records: ChannelSummaryRecord[] = [], rolloutOrder: readonly string[] = CHANNEL_ROLLOUT_ORDER): string[] {
  return uniqueStringsPreservingOrder(
    [...records]
      .sort((left, right) => compareRolloutOrder(left?.id, right?.id, rolloutOrder))
      .flatMap((record) => (record?.auth?.envVars ?? []).filter(Boolean)),
  );
}

function collectOrderedProviderEnvVars(records: ProviderSummaryRecord[] = [], rolloutOrder: readonly string[] = PROVIDER_ROLLOUT_ORDER): string[] {
  return uniqueStringsPreservingOrder(
    [...records]
      .sort((left, right) => compareRolloutOrder(left?.id, right?.id, rolloutOrder))
      .flatMap((record) => record?.authEnvVar ? [record.authEnvVar] : []),
  );
}

export function buildDeliverySummary(
  channels: ChannelsSummary = null,
  models: ModelsSummary = null,
  environment: NodeJS.ProcessEnv = process.env,
  options: DeliverySummaryOptions = {},
): DeliverySummary {
  const rootDir = options.rootDir ?? null;
  const channelRolloutOrder = orderStringsByPreferredSequence(CHANNEL_ROLLOUT_ORDER as unknown as string[], options.channelRolloutOrder ?? CHANNEL_ROLLOUT_ORDER);
  const providerRolloutOrder = orderStringsByPreferredSequence(PROVIDER_ROLLOUT_ORDER as unknown as string[], options.providerRolloutOrder ?? PROVIDER_ROLLOUT_ORDER);
  const channelManifestPath = channels?.manifest?.path ?? 'manifests/channels.json';
  const providerManifestPath = models?.manifest?.path ?? 'manifests/providers.json';
  const envTemplatePath = normalizeRepoRelativePath('.env.example', rootDir);
  const envTemplatePresent = isRepoRelativePathPresent(envTemplatePath, rootDir);
  const envTemplateCommand = envTemplatePresent && envTemplatePath ? `cp ${envTemplatePath} .env` : null;
  const allChannelRecords = channels?.channels ?? [];
  const allProviderRecords = models?.providers ?? [];
  const allChannelQueueRecords = (channels?.channels ?? [])
    .map((channel) => {
      const authEnvVars = (channel.auth?.envVars ?? []).filter(Boolean);
      const missingEnvVars = collectMissingEnvVars(authEnvVars, environment);
      const implementationPath = channel.implementationPath ?? null;
      const manifestPresent = isRepoRelativePathPresent(channelManifestPath, rootDir);
      const implementationScaffoldPath = normalizeRepoRelativePath(implementationPath, rootDir);
      const manifestScaffoldPath = normalizeRepoRelativePath(channelManifestPath, rootDir);
      const implementationState = detectImplementationStatus(implementationPath, rootDir);
      return {
        id: channel.id ?? null,
        name: channel.name ?? channel.id ?? null,
        status: channel.status ?? 'unknown',
        authType: channel.auth?.type ?? null,
        authEnvVars,
        capabilities: (channel.capabilities ?? []).filter(Boolean),
        deliveryModes: (channel.deliveryModes ?? []).filter(Boolean),
        inboundPath: typeof channel.inboundPath === 'string' && channel.inboundPath.trim().length > 0 ? channel.inboundPath.trim() : null,
        outboundMode: typeof channel.outboundMode === 'string' && channel.outboundMode.trim().length > 0 ? channel.outboundMode.trim() : null,
        implementationPath,
        implementationPresent: implementationState.present,
        implementationReady: implementationState.ready,
        implementationStatus: implementationState.status,
        implementationScaffoldPath,
        configured: authEnvVars.length > 0 && missingEnvVars.length === 0,
        missingEnvVars,
        manifestPath: channelManifestPath,
        manifestPresent,
        manifestScaffoldPath,
        setupHint: buildChannelSetupHint(channel, environment),
        nextStep: implementationState.ready
          ? null
          : (typeof channel.nextStep === 'string' && channel.nextStep.trim().length > 0 ? channel.nextStep.trim() : null),
        helperCommands: {
          bootstrapEnv: missingEnvVars.length > 0 ? envTemplateCommand : null,
          populateEnv: buildPopulateEnvCommand(missingEnvVars),
          scaffoldManifest: manifestPresent === false ? buildRelativeFileTouchCommand(manifestScaffoldPath) : null,
          scaffoldImplementation: implementationState.present === false ? buildRelativeFileTouchCommand(implementationScaffoldPath) : null,
        },
      };
    })
    .sort((left, right) => compareRolloutOrder(left.id, right.id, channelRolloutOrder));
  const channelQueue = allChannelQueueRecords
    .filter((channel) => channel?.status !== 'active' || channel.missingEnvVars.length > 0);
  const allProviderQueueRecords = (models?.providers ?? [])
    .map((provider) => {
      const missingEnvVars = provider.authEnvVar ? collectMissingEnvVars([provider.authEnvVar], environment) : [];
      const implementationPath = provider.implementationPath ?? null;
      const manifestPresent = isRepoRelativePathPresent(providerManifestPath, rootDir);
      const implementationScaffoldPath = normalizeRepoRelativePath(implementationPath, rootDir);
      const manifestScaffoldPath = normalizeRepoRelativePath(providerManifestPath, rootDir);
      const implementationState = detectImplementationStatus(implementationPath, rootDir);
      return {
        id: provider.id ?? null,
        name: provider.name ?? provider.id ?? null,
        status: provider.status ?? 'unknown',
        defaultModel: provider.defaultModel ?? null,
        authEnvVar: provider.authEnvVar ?? null,
        models: (provider.models ?? []).filter(Boolean),
        features: (provider.features ?? []).filter(Boolean),
        modalities: (provider.modalities ?? []).filter(Boolean),
        implementationPath,
        implementationPresent: implementationState.present,
        implementationReady: implementationState.ready,
        implementationStatus: implementationState.status,
        implementationScaffoldPath,
        configured: Boolean(provider.authEnvVar) && missingEnvVars.length === 0,
        missingEnvVars,
        manifestPath: providerManifestPath,
        manifestPresent,
        manifestScaffoldPath,
        setupHint: buildProviderSetupHint(provider, environment),
        nextStep: implementationState.ready
          ? null
          : (typeof provider.nextStep === 'string' && provider.nextStep.trim().length > 0 ? provider.nextStep.trim() : null),
        helperCommands: {
          bootstrapEnv: missingEnvVars.length > 0 ? envTemplateCommand : null,
          populateEnv: buildPopulateEnvCommand(missingEnvVars),
          scaffoldManifest: manifestPresent === false ? buildRelativeFileTouchCommand(manifestScaffoldPath) : null,
          scaffoldImplementation: implementationState.present === false ? buildRelativeFileTouchCommand(implementationScaffoldPath) : null,
        },
      };
    })
    .sort((left, right) => compareRolloutOrder(left.id, right.id, providerRolloutOrder));
  const providerQueue = allProviderQueueRecords
    .filter((provider) => provider?.status !== 'active' || provider.missingEnvVars.length > 0);

  const orderedChannelEnvVars = collectOrderedChannelEnvVars(allChannelRecords, channelRolloutOrder);
  const orderedProviderEnvVars = collectOrderedProviderEnvVars(allProviderRecords, providerRolloutOrder);
  const requiredEnvVars = [...orderedChannelEnvVars, ...orderedProviderEnvVars];
  const channelScaffoldCoverage = allChannelRecords.map((channel) => isImplementationPresent(channel.implementationPath ?? null, rootDir));
  const providerScaffoldCoverage = allProviderRecords.map((provider) => isImplementationPresent(provider.implementationPath ?? null, rootDir));
  const firstChannelMissingManifest = channelQueue.find((channel) => channel.manifestPresent === false) ?? null;
  const firstProviderMissingManifest = providerQueue.find((provider) => provider.manifestPresent === false) ?? null;
  const firstChannelMissingImplementation = channelQueue.find((channel) => channel.implementationPresent === false) ?? null;
  const firstProviderMissingImplementation = providerQueue.find((provider) => provider.implementationPresent === false) ?? null;
  const channelImplementationBundle = buildCommandBundle(
    channelQueue
      .filter((channel) => channel.implementationPresent === false)
      .map((channel) => buildRelativeFileTouchCommand(channel.implementationScaffoldPath)),
  );
  const providerImplementationBundle = buildCommandBundle(
    providerQueue
      .filter((provider) => provider.implementationPresent === false)
      .map((provider) => buildRelativeFileTouchCommand(provider.implementationScaffoldPath)),
  );

  return {
    pendingChannelCount: channelQueue.length,
    pendingProviderCount: providerQueue.length,
    configuredChannelCount: allChannelQueueRecords.filter((channel) => channel.configured).length,
    configuredProviderCount: allProviderQueueRecords.filter((provider) => provider.configured).length,
    authBlockedChannelCount: channelQueue.filter((channel) => channel.missingEnvVars.length > 0).length,
    authBlockedProviderCount: providerQueue.filter((provider) => provider.missingEnvVars.length > 0).length,
    readyChannelScaffoldCount: channelScaffoldCoverage.filter(Boolean).length,
    readyProviderScaffoldCount: providerScaffoldCoverage.filter(Boolean).length,
    readyChannelImplementationCount: allChannelQueueRecords.filter((channel) => channel.implementationReady).length,
    readyProviderImplementationCount: allProviderQueueRecords.filter((provider) => provider.implementationReady).length,
    scaffoldOnlyChannelCount: channelQueue.filter((channel) => channel.implementationStatus === 'scaffold').length,
    scaffoldOnlyProviderCount: providerQueue.filter((provider) => provider.implementationStatus === 'scaffold').length,
    missingChannelScaffoldCount: channelScaffoldCoverage.filter((present) => !present).length,
    missingProviderScaffoldCount: providerScaffoldCoverage.filter((present) => !present).length,
    missingChannelEnvVars: orderStringsByPreferredSequence(channelQueue.flatMap((channel) => channel.missingEnvVars), orderedChannelEnvVars),
    missingProviderEnvVars: orderStringsByPreferredSequence(providerQueue.flatMap((provider) => provider.missingEnvVars), orderedProviderEnvVars),
    requiredEnvVars,
    channelManifestPath,
    providerManifestPath,
    envTemplatePath,
    envTemplatePresent,
    envTemplateCommand,
    envTemplateVarNames: [],
    envTemplateMissingRequiredVars: [],
    helperCommands: {
      bootstrapEnv: null,
      populateEnvTemplate: null,
      populateDeliveryEnv: buildPopulateEnvCommand([
        ...channelQueue.flatMap((channel) => channel.missingEnvVars),
        ...providerQueue.flatMap((provider) => provider.missingEnvVars),
      ]),
      populateChannelEnv: buildPopulateEnvCommand(channelQueue.flatMap((channel) => channel.missingEnvVars)),
      populateProviderEnv: buildPopulateEnvCommand(providerQueue.flatMap((provider) => provider.missingEnvVars)),
      scaffoldChannelManifest: firstChannelMissingManifest
        ? buildRelativeFileTouchCommand(firstChannelMissingManifest.manifestScaffoldPath)
        : null,
      scaffoldProviderManifest: firstProviderMissingManifest
        ? buildRelativeFileTouchCommand(firstProviderMissingManifest.manifestScaffoldPath)
        : null,
      scaffoldChannelImplementation: firstChannelMissingImplementation
        ? buildRelativeFileTouchCommand(firstChannelMissingImplementation.implementationScaffoldPath)
        : null,
      scaffoldChannelImplementationBundle: channelImplementationBundle,
      scaffoldProviderImplementation: firstProviderMissingImplementation
        ? buildRelativeFileTouchCommand(firstProviderMissingImplementation.implementationScaffoldPath)
        : null,
      scaffoldProviderImplementationBundle: providerImplementationBundle,
    },
    channelQueue,
    providerQueue,
  };
}

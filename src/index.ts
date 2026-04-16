import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentProfile } from './core/agent-profile.ts';
import { MemoryStore } from './core/memory-store.ts';
import { SkillRegistry } from './core/skill-registry.ts';
import { VoiceProfile } from './core/voice-profile.ts';
import { ChannelRegistry } from './core/channel-registry.ts';
import { ModelRegistry } from './core/model-registry.ts';
import { FileSystemLoader } from './core/fs-loader.js';
import { buildFoundationRollup } from './core/foundation-rollup.js';
import { buildCoreFoundationSummary } from './core/foundation-core.ts';
import { PromptAssembler } from './core/prompt-assembler.ts';
import { MaterialIngestion } from './core/material-ingestion.js';
import { ManifestLoader } from './core/manifest-loader.js';
import { WorkLoop } from './runtime/work-loop.js';

type OptionValue = string | boolean | undefined;
type ParsedOptions = Record<string, OptionValue>;

export interface ParsedArgs {
  command?: string;
  subcommand?: string;
  options: ParsedOptions;
}

interface DraftRefreshResult {
  memoryDraftPath?: string | null;
  voiceDraftPath?: string | null;
  soulDraftPath?: string | null;
  skillsDraftPath?: string | null;
  [key: string]: unknown;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, subcommand, ...rest] = argv;
  const options: ParsedOptions = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = rest[index + 1];
    if (!nextToken || nextToken.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = nextToken;
    index += 1;
  }

  return { command, subcommand, options };
}

export function relativizeDraftPaths(rootDir: string, result: DraftRefreshResult): DraftRefreshResult {
  return {
    ...result,
    memoryDraftPath: typeof result.memoryDraftPath === 'string' ? path.relative(rootDir, result.memoryDraftPath) : null,
    voiceDraftPath: typeof result.voiceDraftPath === 'string' ? path.relative(rootDir, result.voiceDraftPath) : null,
    soulDraftPath: typeof result.soulDraftPath === 'string' ? path.relative(rootDir, result.soulDraftPath) : null,
    skillsDraftPath: typeof result.skillsDraftPath === 'string' ? path.relative(rootDir, result.skillsDraftPath) : null,
  };
}

export function runImportCommand(rootDir: string, subcommand: string | undefined, options: ParsedOptions) {
  const ingestion = new MaterialIngestion(rootDir);

  if (subcommand === 'manifest') {
    const result = ingestion.importManifest({ manifestFile: typeof options.file === 'string' ? options.file : undefined });
    if (!options['refresh-foundation']) {
      return result;
    }

    return {
      ...result,
      foundationRefresh: {
        profileCount: result.profileIds.length,
        results: result.profileIds.map((personId: string) =>
          relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })),
        ),
      },
    };
  }

  const personId = typeof options.person === 'string' ? options.person : undefined;
  if (!personId) {
    throw new Error('Missing required --person argument');
  }

  if (subcommand === 'text') {
    const result = ingestion.importTextDocument({
      personId,
      sourceFile: typeof options.file === 'string' ? options.file : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'message') {
    const result = ingestion.importMessage({
      personId,
      text: typeof options.text === 'string' ? options.text : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'talk') {
    const result = ingestion.importTalkSnippet({
      personId,
      text: typeof options.text === 'string' ? options.text : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'screenshot') {
    const result = ingestion.importScreenshotSource({
      personId,
      sourceFile: typeof options.file === 'string' ? options.file : undefined,
      notes: typeof options.notes === 'string' ? options.notes : null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  throw new Error(`Unsupported import type: ${subcommand}`);
}

export function runUpdateCommand(rootDir: string, subcommand: string | undefined, options: ParsedOptions) {
  const ingestion = new MaterialIngestion(rootDir);
  const personId = typeof options.person === 'string' ? options.person : undefined;

  if (subcommand === 'profile') {
    if (!personId) {
      throw new Error('Missing required --person argument');
    }

    const result = ingestion.updateProfile({
      personId,
      displayName: typeof options['display-name'] === 'string' ? options['display-name'] : undefined,
      summary: typeof options.summary === 'string' ? options.summary : undefined,
    });

    return options['refresh-foundation']
      ? {
          ...result,
          foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId: result.personId })),
        }
      : result;
  }

  if (subcommand === 'foundation' && options.all) {
    const result = ingestion.refreshAllFoundationDrafts();
    return {
      ...result,
      results: result.results.map((entry: DraftRefreshResult) => relativizeDraftPaths(rootDir, entry)),
    };
  }

  if (subcommand === 'foundation' && options.stale) {
    const result = ingestion.refreshStaleFoundationDrafts();
    return {
      ...result,
      results: result.results.map((entry: DraftRefreshResult) => relativizeDraftPaths(rootDir, entry)),
    };
  }

  if (!personId) {
    throw new Error('Missing required --person argument');
  }

  if (subcommand === 'foundation') {
    return relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId }));
  }

  throw new Error(`Unsupported update type: ${subcommand}`);
}

export function buildSummary(rootDir: string) {
  const loader = new FileSystemLoader(rootDir);
  const manifestLoader = new ManifestLoader(rootDir);
  const soulDocument = loader.loadSoul();
  const voiceDocument = loader.loadVoice();
  const memoryIndex = loader.loadMemoryIndex();
  const skillInventory = loader.loadSkillInventory();
  const skillNames = skillInventory.names;
  const channelManifest = manifestLoader.loadChannelManifest();
  const providerManifest = manifestLoader.loadProviderManifest();

  const voice = new VoiceProfile({
    tone: 'human',
    style: 'person-specific',
    constraints: ['stay faithful to learned voice'],
    signatures: ['consistent persona', 'compact but vivid phrasing'],
    languageHints: ['preserve bilingual or multilingual behavior when present'],
  });

  const profile = new AgentProfile({
    name: 'ManSkill',
    soul: 'A configurable personality core for imitating a specific person from text.',
    identity: {
      role: 'person-like AI agent',
      architecture: 'memory + skills + soul + voice',
    },
    goals: ['imitate a specific person faithfully', 'stay practical and extensible'],
    voice: voice.summary(),
  });

  const memory = new MemoryStore({
    shortTerm: memoryIndex.daily,
    longTerm: memoryIndex.longTerm,
  });
  const skills = new SkillRegistry(skillNames);
  const channels = new ChannelRegistry();
  if (Array.isArray(channelManifest)) {
    channelManifest.forEach((channel: unknown) => channels.register(channel as any));
  }

  const models = new ModelRegistry();
  if (Array.isArray(providerManifest)) {
    providerManifest.forEach((provider: unknown) => models.register(provider as any));
  }
  const workLoop = new WorkLoop({
    intervalMinutes: 10,
    objectives: [
      'strengthen the core structure',
      'add channel adapters',
      'add model providers',
      'report progress in small increments',
    ],
  } as any);
  const profiles = loader.loadProfilesIndex() as any;
  const foundation = buildFoundationRollup(profiles) as any;
  const coreFoundation = buildCoreFoundationSummary({
    soulDocument,
    voiceDocument,
    memoryIndex,
    skillNames,
    skillInventory,
  });
  const prompt = new PromptAssembler({
    profile: profile.summary(),
    soul: soulDocument,
    voice: {
      ...voice.summary(),
      document: voiceDocument,
    },
    memory: memoryIndex,
    skills: skills.summary(),
    profiles,
    foundationRollup: foundation,
    foundationCore: coreFoundation,
    channels: channels.summary(),
    models: models.summary(),
  } as any);

  return {
    profile: profile.summary(),
    memory: memory.summary(),
    skills: skills.summary(),
    voice: voice.summary(),
    foundation: {
      ...foundation,
      core: coreFoundation,
    },
    channels: channels.summary(),
    models: models.summary(),
    profiles,
    workLoop: workLoop.summary(),
    promptPreview: prompt.buildPreview(1200),
  };
}

export function main(argv: string[] = process.argv.slice(2), rootDir: string = process.cwd()): void {
  const { command, subcommand, options } = parseArgs(argv);

  if (command === 'import') {
    const result = runImportCommand(rootDir, subcommand, options);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  if (command === 'update') {
    const result = runUpdateCommand(rootDir, subcommand, options);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  console.log(JSON.stringify(buildSummary(rootDir), null, 2));
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  main();
}

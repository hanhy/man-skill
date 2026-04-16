import path from 'node:path';
import { AgentProfile } from './core/agent-profile.js';
import { MemoryStore } from './core/memory-store.js';
import { SkillRegistry } from './core/skill-registry.js';
import { VoiceProfile } from './core/voice-profile.js';
import { ChannelRegistry } from './core/channel-registry.js';
import { ModelRegistry } from './core/model-registry.js';
import { FileSystemLoader } from './core/fs-loader.js';
import { PromptAssembler } from './core/prompt-assembler.js';
import { MaterialIngestion } from './core/material-ingestion.js';
import { createDefaultChannels } from './channels/index.js';
import { createDefaultProviders } from './models/index.js';
import { WorkLoop } from './runtime/work-loop.js';

function parseArgs(argv) {
  const [command, subcommand, ...rest] = argv;
  const options = {};

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

function relativizeDraftPaths(rootDir, result) {
  return {
    ...result,
    memoryDraftPath: result.memoryDraftPath ? path.relative(rootDir, result.memoryDraftPath) : null,
    voiceDraftPath: result.voiceDraftPath ? path.relative(rootDir, result.voiceDraftPath) : null,
    soulDraftPath: result.soulDraftPath ? path.relative(rootDir, result.soulDraftPath) : null,
    skillsDraftPath: result.skillsDraftPath ? path.relative(rootDir, result.skillsDraftPath) : null,
  };
}

function runImportCommand(rootDir, subcommand, options) {
  const ingestion = new MaterialIngestion(rootDir);

  if (subcommand === 'manifest') {
    const result = ingestion.importManifest({ manifestFile: options.file });
    if (!options['refresh-foundation']) {
      return result;
    }

    return {
      ...result,
      foundationRefresh: {
        profileCount: result.profileIds.length,
        results: result.profileIds.map((personId) =>
          relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId }))),
      },
    };
  }

  const personId = options.person;

  if (!personId) {
    throw new Error('Missing required --person argument');
  }

  if (subcommand === 'text') {
    const result = ingestion.importTextDocument({
      personId,
      sourceFile: options.file,
      notes: options.notes ?? null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'message') {
    const result = ingestion.importMessage({
      personId,
      text: options.text,
      notes: options.notes ?? null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'talk') {
    const result = ingestion.importTalkSnippet({
      personId,
      text: options.text,
      notes: options.notes ?? null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  if (subcommand === 'screenshot') {
    const result = ingestion.importScreenshotSource({
      personId,
      sourceFile: options.file,
      notes: options.notes ?? null,
    });

    return options['refresh-foundation']
      ? { ...result, foundationRefresh: relativizeDraftPaths(rootDir, ingestion.refreshFoundationDrafts({ personId })) }
      : result;
  }

  throw new Error(`Unsupported import type: ${subcommand}`);
}

function runUpdateCommand(rootDir, subcommand, options) {
  const ingestion = new MaterialIngestion(rootDir);
  const personId = options.person;

  if (subcommand === 'foundation' && options.all) {
    const result = ingestion.refreshAllFoundationDrafts();
    return {
      ...result,
      results: result.results.map((entry) => relativizeDraftPaths(rootDir, entry)),
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

function buildSummary(rootDir) {
  const loader = new FileSystemLoader(rootDir);
  const soulDocument = loader.loadSoul();
  const voiceDocument = loader.loadVoice();
  const memoryIndex = loader.loadMemoryIndex();
  const skillNames = loader.loadSkills();

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
  const channels = new ChannelRegistry(createDefaultChannels().map((channel) => channel.summary()));
  const models = new ModelRegistry(createDefaultProviders().map((provider) => provider.summary()));
  const workLoop = new WorkLoop({
    intervalMinutes: 10,
    objectives: [
      'strengthen the core structure',
      'add channel adapters',
      'add model providers',
      'report progress in small increments',
    ],
  });
  const profiles = loader.loadProfilesIndex();
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
    channels: channels.summary(),
    models: models.summary(),
  });

  return {
    profile: profile.summary(),
    memory: memory.summary(),
    skills: skills.summary(),
    voice: voice.summary(),
    channels: channels.summary(),
    models: models.summary(),
    profiles,
    workLoop: workLoop.summary(),
    promptPreview: prompt.buildSystemPrompt().slice(0, 400),
  };
}

const rootDir = process.cwd();
const { command, subcommand, options } = parseArgs(process.argv.slice(2));

if (command === 'import') {
  const result = runImportCommand(rootDir, subcommand, options);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} else if (command === 'update') {
  const result = runUpdateCommand(rootDir, subcommand, options);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} else {
  console.log(JSON.stringify(buildSummary(rootDir), null, 2));
}

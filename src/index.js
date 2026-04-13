import { AgentProfile } from './core/agent-profile.js';
import { MemoryStore } from './core/memory-store.js';
import { SkillRegistry } from './core/skill-registry.js';
import { VoiceProfile } from './core/voice-profile.js';
import { ChannelRegistry } from './core/channel-registry.js';
import { ModelRegistry } from './core/model-registry.js';
import { FileSystemLoader } from './core/fs-loader.js';
import { PromptAssembler } from './core/prompt-assembler.js';

const loader = new FileSystemLoader(process.cwd());
const soulDocument = loader.loadSoul();
const voiceDocument = loader.loadVoice();
const memoryIndex = loader.loadMemoryIndex();
const skillNames = loader.loadSkills();

const profile = new AgentProfile({
  name: 'ManSkill',
  soul: 'A configurable personality core for imitating a specific person from text.',
  identity: {
    role: 'person-like AI agent',
  },
  goals: ['imitate a specific person faithfully', 'stay practical and extensible'],
});

const memory = new MemoryStore({
  shortTerm: memoryIndex.daily,
  longTerm: memoryIndex.longTerm,
});
const skills = new SkillRegistry(skillNames);
const voice = new VoiceProfile({
  tone: 'human',
  style: 'person-specific',
  constraints: ['stay faithful to learned voice'],
});
const channels = new ChannelRegistry();
const models = new ModelRegistry();
const prompt = new PromptAssembler({
  profile: profile.summary(),
  soul: soulDocument,
  voice: voiceDocument,
  memory: memoryIndex,
  skills: skillNames,
});

console.log(
  JSON.stringify(
    {
      profile: profile.summary(),
      memory: memory.summary(),
      skills: skills.summary(),
      voice: voice.summary(),
      channels: channels.summary(),
      models: models.summary(),
      promptPreview: prompt.buildSystemPrompt().slice(0, 400),
    },
    null,
    2,
  ),
);

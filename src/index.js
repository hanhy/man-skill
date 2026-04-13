import { AgentProfile } from './core/agent-profile.js';
import { MemoryStore } from './core/memory-store.js';
import { SkillRegistry } from './core/skill-registry.js';
import { VoiceProfile } from './core/voice-profile.js';
import { ChannelRegistry } from './core/channel-registry.js';
import { ModelRegistry } from './core/model-registry.js';

const profile = new AgentProfile({
  name: 'ManSkill',
  soul: 'A configurable personality core for imitating a specific person from text.',
  identity: {
    role: 'person-like AI agent',
  },
  goals: ['imitate a specific person faithfully', 'stay practical and extensible'],
});

const memory = new MemoryStore({
  shortTerm: ['recent conversation state'],
  longTerm: ['stable user preferences and identity traits'],
});
const skills = new SkillRegistry(['memory', 'skills', 'soul']);
const voice = new VoiceProfile({
  tone: 'human',
  style: 'person-specific',
  constraints: ['stay faithful to learned voice'],
});
const channels = new ChannelRegistry();
const models = new ModelRegistry();

console.log(
  JSON.stringify(
    {
      profile: profile.summary(),
      memory: memory.summary(),
      skills: skills.summary(),
      voice: voice.summary(),
      channels: channels.summary(),
      models: models.summary(),
    },
    null,
    2,
  ),
);

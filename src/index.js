import { AgentProfile } from './core/agent-profile.js';
import { MemoryStore } from './core/memory-store.js';
import { SkillRegistry } from './core/skill-registry.js';
import { VoiceProfile } from './core/voice-profile.js';

const profile = new AgentProfile({
  name: 'ManSkill',
  soul: 'A configurable personality core for imitating a specific person from text.',
});

const memory = new MemoryStore();
const skills = new SkillRegistry();
const voice = new VoiceProfile();

console.log(
  JSON.stringify(
    {
      profile: profile.summary(),
      memory: memory.summary(),
      skills: skills.summary(),
      voice: voice.summary(),
    },
    null,
    2,
  ),
);

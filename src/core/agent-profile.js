export class AgentProfile {
  constructor({ name, soul, identity = {}, goals = [], voice = {} } = {}) {
    this.name = name;
    this.soul = soul;
    this.identity = identity;
    this.goals = goals;
    this.voice = voice;
  }

  summary() {
    const identityKeys = Object.keys(this.identity).sort((left, right) => left.localeCompare(right));
    const foundationLayers = ['memory', 'skills', 'soul', 'voice'];

    return {
      name: this.name,
      soul: this.soul,
      identity: this.identity,
      identityKeys,
      goals: this.goals,
      goalCount: this.goals.length,
      hasSoul: typeof this.soul === 'string' && this.soul.trim().length > 0,
      hasVoice: Boolean(this.voice) && (typeof this.voice !== 'object' || Object.keys(this.voice).length > 0),
      foundationLayers,
      voice: this.voice,
    };
  }
}

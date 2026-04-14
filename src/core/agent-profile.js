export class AgentProfile {
  constructor({ name, soul, identity = {}, goals = [], voice = {} } = {}) {
    this.name = name;
    this.soul = soul;
    this.identity = identity;
    this.goals = goals;
    this.voice = voice;
  }

  summary() {
    return {
      name: this.name,
      soul: this.soul,
      identity: this.identity,
      goals: this.goals,
      voice: this.voice,
    };
  }
}

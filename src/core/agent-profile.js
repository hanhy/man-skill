export class AgentProfile {
  constructor({ name, soul, identity = {}, goals = [] } = {}) {
    this.name = name;
    this.soul = soul;
    this.identity = identity;
    this.goals = goals;
  }

  summary() {
    return {
      name: this.name,
      soul: this.soul,
      identity: this.identity,
      goals: this.goals,
    };
  }
}

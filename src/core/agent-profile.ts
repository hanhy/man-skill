export interface AgentProfileSummary {
  name: string | undefined;
  soul: string | undefined;
  identity: Record<string, unknown>;
  goals: string[];
  voice: unknown;
}

export interface AgentProfileOptions {
  name?: string;
  soul?: string;
  identity?: Record<string, unknown>;
  goals?: string[];
  voice?: unknown;
}

export class AgentProfile {
  name: string | undefined;
  soul: string | undefined;
  identity: Record<string, unknown>;
  goals: string[];
  voice: unknown;

  constructor({ name, soul, identity = {}, goals = [], voice = {} }: AgentProfileOptions = {}) {
    this.name = name;
    this.soul = soul;
    this.identity = identity;
    this.goals = goals;
    this.voice = voice;
  }

  summary(): AgentProfileSummary {
    return {
      name: this.name,
      soul: this.soul,
      identity: this.identity,
      goals: this.goals,
      voice: this.voice,
    };
  }
}

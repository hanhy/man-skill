export interface AgentProfileSummary {
  name: string | undefined;
  soul: string | undefined;
  identity: Record<string, unknown>;
  identityKeys: string[];
  goals: string[];
  goalCount: number;
  hasSoul: boolean;
  hasVoice: boolean;
  foundationLayers: string[];
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
      hasVoice: Boolean(this.voice) && (typeof this.voice !== 'object' || Object.keys(this.voice as Record<string, unknown>).length > 0),
      foundationLayers,
      voice: this.voice,
    };
  }
}

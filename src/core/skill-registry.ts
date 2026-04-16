import { BaseRegistry } from './base-registry.js';

export interface SkillRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export class SkillRegistry extends BaseRegistry<string | SkillRecord> {
  normalize(skill: string | SkillRecord): SkillRecord {
    if (typeof skill === 'string') {
      return {
        id: skill,
        name: skill,
        description: null,
        status: 'discovered',
      };
    }

    return {
      ...skill,
      description: skill.description ?? null,
      status: skill.status ?? 'custom',
    };
  }

  summary(): { skillCount: number; skills: SkillRecord[] } {
    return {
      skillCount: this.count(),
      skills: this.list() as SkillRecord[],
    };
  }
}

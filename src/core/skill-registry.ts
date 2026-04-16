import { BaseRegistry } from './base-registry.js';

export interface SkillRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export interface SkillRegistrySummary {
  skillCount: number;
  discoveredCount: number;
  customCount: number;
  statusCounts: Record<string, number>;
  skills: SkillRecord[];
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

  summary(): SkillRegistrySummary {
    const skills = this.list() as SkillRecord[];
    const statusCounts = skills.reduce<Record<string, number>>((counts, skill) => {
      const status = skill.status ?? 'unknown';
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});

    return {
      skillCount: this.count(),
      discoveredCount: statusCounts.discovered ?? 0,
      customCount: statusCounts.custom ?? 0,
      statusCounts,
      skills,
    };
  }
}

import { BaseRegistry } from './base-registry.js';

export class SkillRegistry extends BaseRegistry {
  normalize(skill) {
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
      ...(skill.foundationStatus === undefined ? {} : { foundationStatus: skill.foundationStatus ?? null }),
    };
  }

  summary() {
    const skills = this.list();
    const statusCounts = skills.reduce((counts, skill) => {
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

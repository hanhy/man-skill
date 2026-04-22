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
    const unsortedCategoryCounts = skills.reduce((counts, skill) => {
      const skillId = typeof skill.id === 'string' ? skill.id : skill.name;
      const normalizedSkillId = typeof skillId === 'string' ? skillId.trim() : '';
      const category = normalizedSkillId && normalizedSkillId.includes('/')
        ? normalizedSkillId.split('/')[0]
        : 'root';
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});
    const categoryCounts = Object.fromEntries(
      Object.entries(unsortedCategoryCounts).sort(([left], [right]) => {
        if (left === right) {
          return 0;
        }

        if (left === 'root') {
          return 1;
        }

        if (right === 'root') {
          return -1;
        }

        return left.localeCompare(right);
      }),
    );
    const skillIds = skills.map((skill) => (typeof skill.id === 'string' && skill.id.length > 0 ? skill.id : skill.name));
    const hasGroupedCategories = skillIds.some((skillId) => typeof skillId === 'string' && skillId.includes('/'));

    return {
      skillCount: this.count(),
      discoveredCount: statusCounts.discovered ?? 0,
      customCount: statusCounts.custom ?? 0,
      statusCounts,
      ...(hasGroupedCategories ? { categoryCounts } : {}),
      skills,
    };
  }
}

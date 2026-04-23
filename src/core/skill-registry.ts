import { BaseRegistry } from './base-registry.js';

export interface SkillRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  foundationStatus?: string | null;
}

export interface SkillRegistrySummary {
  skillCount: number;
  discoveredCount: number;
  customCount: number;
  statusCounts: Record<string, number>;
  foundationStatusCounts?: Record<string, number>;
  categoryCounts?: Record<string, number>;
  skills: SkillRecord[];
}

function getSkillCategory(skillId: string): string {
  const normalizedSkillId = typeof skillId === 'string' ? skillId.trim() : '';
  if (!normalizedSkillId) {
    return 'root';
  }

  const [category] = normalizedSkillId.split('/');
  return normalizedSkillId.includes('/') && category ? category : 'root';
}

function compareSkillCategory(left: string, right: string): number {
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
}

function hasGroupedSkillCategories(skillIds: string[]): boolean {
  return skillIds.some((skillId) => typeof skillId === 'string' && skillId.includes('/'));
}

function compareFoundationStatus(left: string, right: string): number {
  const order = ['ready', 'thin', 'missing'];
  const leftIndex = order.indexOf(left);
  const rightIndex = order.indexOf(right);
  if (leftIndex >= 0 || rightIndex >= 0) {
    if (leftIndex < 0) {
      return 1;
    }
    if (rightIndex < 0) {
      return -1;
    }
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right);
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
      ...(skill.foundationStatus === undefined ? {} : { foundationStatus: skill.foundationStatus ?? null }),
    };
  }

  summary(): SkillRegistrySummary {
    const skills = this.list() as SkillRecord[];
    const statusCounts = skills.reduce<Record<string, number>>((counts, skill) => {
      const status = skill.status ?? 'unknown';
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});
    const foundationStatusCounts = Object.fromEntries(
      Object.entries(skills.reduce<Record<string, number>>((counts, skill) => {
        const foundationStatus = typeof skill.foundationStatus === 'string' && skill.foundationStatus.trim().length > 0
          ? skill.foundationStatus.trim()
          : null;
        if (!foundationStatus) {
          return counts;
        }

        counts[foundationStatus] = (counts[foundationStatus] ?? 0) + 1;
        return counts;
      }, {})).sort(([left], [right]) => compareFoundationStatus(left, right)),
    );
    const unsortedCategoryCounts = skills.reduce<Record<string, number>>((counts, skill) => {
      const skillCategory = getSkillCategory(typeof skill.id === 'string' ? skill.id : skill.name);
      counts[skillCategory] = (counts[skillCategory] ?? 0) + 1;
      return counts;
    }, {});
    const categoryCounts = Object.fromEntries(
      Object.entries(unsortedCategoryCounts).sort(([left], [right]) => compareSkillCategory(left, right)),
    );
    const skillIds = skills.map((skill) => (typeof skill.id === 'string' && skill.id.length > 0 ? skill.id : skill.name));

    return {
      skillCount: this.count(),
      discoveredCount: statusCounts.discovered ?? 0,
      customCount: statusCounts.custom ?? 0,
      statusCounts,
      ...(Object.keys(foundationStatusCounts).length > 0 ? { foundationStatusCounts } : {}),
      ...(hasGroupedSkillCategories(skillIds) ? { categoryCounts } : {}),
      skills,
    };
  }
}

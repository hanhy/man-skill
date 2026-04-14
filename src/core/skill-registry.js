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
      description: null,
      status: 'custom',
      ...skill,
    };
  }

  summary() {
    return {
      skillCount: this.count(),
      skills: this.list(),
    };
  }
}

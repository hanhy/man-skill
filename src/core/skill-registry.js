export class SkillRegistry {
  constructor(skills = []) {
    this.skills = skills;
  }

  register(skill) {
    this.skills.push(skill);
  }

  summary() {
    return {
      skillCount: this.skills.length,
      skills: this.skills,
    };
  }
}

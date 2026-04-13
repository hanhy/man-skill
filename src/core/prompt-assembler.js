export class PromptAssembler {
  constructor({ profile, soul, voice, memory, skills } = {}) {
    this.profile = profile;
    this.soul = soul;
    this.voice = voice;
    this.memory = memory;
    this.skills = skills;
  }

  buildSystemPrompt() {
    return [
      `Name: ${this.profile.name}`,
      `Soul: ${this.profile.soul}`,
      '',
      'Voice:',
      this.voice,
      '',
      'Memory:',
      JSON.stringify(this.memory, null, 2),
      '',
      'Skills:',
      Array.isArray(this.skills) ? this.skills.join(', ') : '',
      '',
      'Instructions:',
      this.soul,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

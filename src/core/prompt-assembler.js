export class PromptAssembler {
  constructor({ profile, soul, voice, memory, skills, channels, models } = {}) {
    this.profile = profile;
    this.soul = soul;
    this.voice = voice;
    this.memory = memory;
    this.skills = skills;
    this.channels = channels;
    this.models = models;
  }

  buildSystemPrompt() {
    return [
      `Name: ${this.profile.name}`,
      `Soul summary: ${this.profile.soul}`,
      '',
      'Identity:',
      JSON.stringify(this.profile.identity, null, 2),
      '',
      'Voice profile:',
      JSON.stringify(this.voice, null, 2),
      '',
      'Voice document:',
      this.voice?.document,
      '',
      'Memory:',
      JSON.stringify(this.memory, null, 2),
      '',
      'Skills:',
      JSON.stringify(this.skills, null, 2),
      '',
      'Channels:',
      JSON.stringify(this.channels, null, 2),
      '',
      'Models:',
      JSON.stringify(this.models, null, 2),
      '',
      'Soul instructions:',
      this.soul,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

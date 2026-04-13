export class VoiceProfile {
  constructor({ tone = 'clear', style = 'adaptive', constraints = [] } = {}) {
    this.tone = tone;
    this.style = style;
    this.constraints = constraints;
  }

  summary() {
    return {
      tone: this.tone,
      style: this.style,
      constraints: this.constraints,
    };
  }
}

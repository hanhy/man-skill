export class VoiceProfile {
  constructor({ tone = 'clear', style = 'adaptive', constraints = [], signatures = [], languageHints = [] } = {}) {
    this.tone = tone;
    this.style = style;
    this.constraints = constraints;
    this.signatures = signatures;
    this.languageHints = languageHints;
  }

  summary() {
    return {
      tone: this.tone,
      style: this.style,
      constraints: this.constraints,
      signatures: this.signatures,
      languageHints: this.languageHints,
    };
  }
}

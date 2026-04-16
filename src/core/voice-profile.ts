export interface VoiceProfileSummary {
  tone: string;
  style: string;
  constraints: string[];
  signatures: string[];
  languageHints: string[];
}

export interface VoiceProfileOptions {
  tone?: string;
  style?: string;
  constraints?: string[];
  signatures?: string[];
  languageHints?: string[];
}

export class VoiceProfile {
  tone: string;
  style: string;
  constraints: string[];
  signatures: string[];
  languageHints: string[];

  constructor({ tone = 'clear', style = 'adaptive', constraints = [], signatures = [], languageHints = [] }: VoiceProfileOptions = {}) {
    this.tone = tone;
    this.style = style;
    this.constraints = constraints;
    this.signatures = signatures;
    this.languageHints = languageHints;
  }

  summary(): VoiceProfileSummary {
    return {
      tone: this.tone,
      style: this.style,
      constraints: this.constraints,
      signatures: this.signatures,
      languageHints: this.languageHints,
    };
  }
}

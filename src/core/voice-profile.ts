export interface VoiceProfileSummary {
  tone: string;
  style: string;
  constraints: string[];
  signatures: string[];
  languageHints: string[];
  constraintCount: number;
  signatureCount: number;
  languageHintCount: number;
  hasGuidance: boolean;
}

export interface VoiceProfileOptions {
  tone?: string;
  style?: string;
  constraints?: string[];
  signatures?: string[];
  languageHints?: string[];
}

type VoiceSection = 'tone' | 'signature-moves' | 'avoid' | 'language-hints' | null;

function normalizeDocument(document: unknown) {
  return typeof document === 'string' ? document : '';
}

function cleanVoiceLine(value: string) {
  return value
    .trim()
    .replace(/^[-*]\s+/, '')
    .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
    .trim();
}

function findExcerpt(document: unknown) {
  return normalizeDocument(document)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#') && line !== '---') ?? null;
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

  static fromDocument(document = '') {
    const normalizedDocument = normalizeDocument(document);
    const excerpt = findExcerpt(normalizedDocument);
    const voice = new VoiceProfile({
      tone: excerpt ?? 'clear',
      style: excerpt ? 'documented' : 'adaptive',
    });
    let currentSection: VoiceSection = null;

    normalizedDocument.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      if (line.startsWith('## ')) {
        const heading = line.slice(3).trim().toLowerCase();
        if (heading === 'tone') {
          currentSection = 'tone';
          return;
        }
        if (heading === 'signature moves') {
          currentSection = 'signature-moves';
          return;
        }
        if (heading === 'avoid') {
          currentSection = 'avoid';
          return;
        }
        if (heading === 'language hints') {
          currentSection = 'language-hints';
          return;
        }

        currentSection = null;
        return;
      }

      if (line.startsWith('#')) {
        return;
      }

      const cleaned = cleanVoiceLine(line);
      if (!cleaned || cleaned === '---') {
        return;
      }

      if (currentSection === 'tone') {
        voice.tone = cleaned;
        voice.style = 'documented';
      } else if (currentSection === 'signature-moves') {
        voice.signatures.push(cleaned);
      } else if (currentSection === 'avoid') {
        voice.constraints.push(cleaned);
      } else if (currentSection === 'language-hints') {
        voice.languageHints.push(cleaned);
      }
    });

    return voice;
  }

  summary(): VoiceProfileSummary {
    return {
      tone: this.tone,
      style: this.style,
      constraints: this.constraints,
      signatures: this.signatures,
      languageHints: this.languageHints,
      constraintCount: this.constraints.length,
      signatureCount: this.signatures.length,
      languageHintCount: this.languageHints.length,
      hasGuidance: this.constraints.length > 0 || this.signatures.length > 0 || this.languageHints.length > 0,
    };
  }
}

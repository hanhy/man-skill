import { collectVisibleDocumentLines, findDocumentExcerpt, normalizeDocument } from './document-excerpt.ts';

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

type VoiceSection = 'tone' | 'signature-moves' | 'avoid' | 'language-hints' | 'voice-should-capture' | 'voice-should-not-capture' | 'current-default' | null;

function normalizeHeadingText(value: string) {
  return value
    .trim()
    .replace(/\s+#+\s*$/, '')
    .trim()
    .toLowerCase();
}

function cleanVoiceLine(value: string) {
  return value
    .trim()
    .replace(/^(?:[-*]|\d+\.)\s+/, '')
    .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
    .trim();
}

function looksLikeLanguageHint(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes('language')
    || normalized.includes('bilingual')
    || normalized.includes('multilingual')
    || normalized.includes('中文')
    || normalized.includes('english');
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function isListSection(section: VoiceSection) {
  return section === 'signature-moves'
    || section === 'avoid'
    || section === 'language-hints'
    || section === 'voice-should-capture'
    || section === 'voice-should-not-capture'
    || section === 'current-default';
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
    const excerpt = findDocumentExcerpt(normalizedDocument);
    const voice = new VoiceProfile({
      tone: excerpt ?? 'clear',
      style: excerpt ? 'documented' : 'adaptive',
    });
    let currentSection: VoiceSection = null;
    let currentSectionHasContent = false;

    collectVisibleDocumentLines(normalizedDocument).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      if (line.startsWith('## ')) {
        const heading = normalizeHeadingText(line.slice(3));
        if (heading === 'tone') {
          currentSection = 'tone';
          currentSectionHasContent = false;
          return;
        }
        if (heading === 'signature moves') {
          currentSection = 'signature-moves';
          currentSectionHasContent = false;
          return;
        }
        if (heading === 'avoid') {
          currentSection = 'avoid';
          currentSectionHasContent = false;
          return;
        }
        if (heading === 'language hints') {
          currentSection = 'language-hints';
          currentSectionHasContent = false;
          return;
        }
        if (heading === 'voice should capture') {
          currentSection = 'voice-should-capture';
          currentSectionHasContent = false;
          return;
        }
        if (heading === 'voice should not capture') {
          currentSection = 'voice-should-not-capture';
          currentSectionHasContent = false;
          return;
        }
        if (heading === 'current default for manskill') {
          currentSection = 'current-default';
          currentSectionHasContent = false;
          return;
        }

        currentSection = null;
        currentSectionHasContent = false;
        return;
      }

      if (line.startsWith('#')) {
        currentSection = null;
        currentSectionHasContent = false;
        return;
      }

      if (isListSection(currentSection) && !/^(?:[-*]|\d+\.)\s+/.test(line) && currentSectionHasContent) {
        currentSection = null;
        currentSectionHasContent = false;
        return;
      }

      const cleaned = cleanVoiceLine(line);
      if (!cleaned || cleaned === '---') {
        return;
      }

      if (currentSection === 'tone') {
        voice.tone = cleaned;
        voice.style = 'documented';
        currentSectionHasContent = true;
      } else if (currentSection === 'signature-moves') {
        pushUnique(voice.signatures, cleaned);
        currentSectionHasContent = true;
      } else if (currentSection === 'avoid') {
        pushUnique(voice.constraints, cleaned);
        currentSectionHasContent = true;
      } else if (currentSection === 'language-hints') {
        pushUnique(voice.languageHints, cleaned);
        currentSectionHasContent = true;
      } else if (currentSection === 'voice-should-capture') {
        pushUnique(voice.signatures, cleaned);
        currentSectionHasContent = true;
      } else if (currentSection === 'voice-should-not-capture') {
        pushUnique(voice.constraints, cleaned);
        currentSectionHasContent = true;
      } else if (currentSection === 'current-default') {
        if (looksLikeLanguageHint(cleaned)) {
          pushUnique(voice.languageHints, cleaned);
        } else {
          pushUnique(voice.signatures, cleaned);
        }
        currentSectionHasContent = true;
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

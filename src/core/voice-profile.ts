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

const VOICE_STARTER_GUIDANCE_LINES = new Set([
  'Describe the target cadence, directness, and emotional texture here.',
  'Capture recurring phrasing, structure, or rhetorical habits here.',
  'List wording, hedges, or habits that break the voice.',
  'Note bilingual, dialect, or code-switching habits worth preserving.',
]);

function normalizeHeadingText(value: string) {
  return value
    .trim()
    .replace(/\s+#+\s*$/, '')
    .trim()
    .toLowerCase();
}

function parseStructuredHeading(line: string): { level: number; text: string } | null {
  const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    text: normalizeHeadingText(match[2]),
  };
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

function isStarterVoiceGuidance(value: string) {
  return VOICE_STARTER_GUIDANCE_LINES.has(value);
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
  hasToneGuidance: boolean;

  constructor({ tone = 'clear', style = 'adaptive', constraints = [], signatures = [], languageHints = [] }: VoiceProfileOptions = {}) {
    this.tone = tone;
    this.style = style;
    this.constraints = constraints;
    this.signatures = signatures;
    this.languageHints = languageHints;
    this.hasToneGuidance = style === 'documented' && tone.trim().length > 0;
  }

  static fromDocument(document = '') {
    const normalizedDocument = normalizeDocument(document);
    const excerpt = findDocumentExcerpt(normalizedDocument);
    const normalizedExcerpt = excerpt ? cleanVoiceLine(excerpt) : null;
    const hasExcerptToneGuidance = normalizedExcerpt !== null && !isStarterVoiceGuidance(normalizedExcerpt);
    const defaultTone = hasExcerptToneGuidance ? normalizedExcerpt : 'clear';
    const voice = new VoiceProfile({
      tone: defaultTone,
      style: hasExcerptToneGuidance ? 'documented' : 'adaptive',
    });
    let currentSection: VoiceSection = null;
    let currentSectionHasContent = false;

    collectVisibleDocumentLines(normalizedDocument).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const heading = parseStructuredHeading(line);
      if (heading) {
        if (heading.level < 2) {
          currentSection = null;
          currentSectionHasContent = false;
          return;
        }

        if (heading.text === 'tone') {
          currentSection = 'tone';
          currentSectionHasContent = false;
          return;
        }
        if (heading.text === 'signature moves') {
          currentSection = 'signature-moves';
          currentSectionHasContent = false;
          return;
        }
        if (heading.text === 'avoid') {
          currentSection = 'avoid';
          currentSectionHasContent = false;
          return;
        }
        if (heading.text === 'language hints') {
          currentSection = 'language-hints';
          currentSectionHasContent = false;
          return;
        }
        if (heading.text === 'voice should capture') {
          currentSection = 'voice-should-capture';
          currentSectionHasContent = false;
          return;
        }
        if (heading.text === 'voice should not capture') {
          currentSection = 'voice-should-not-capture';
          currentSectionHasContent = false;
          return;
        }
        if (heading.text === 'current default for manskill') {
          currentSection = 'current-default';
          currentSectionHasContent = false;
          return;
        }

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
      if (!cleaned || cleaned === '---' || isStarterVoiceGuidance(cleaned)) {
        return;
      }

      if (currentSection === 'tone') {
        voice.tone = cleaned;
        voice.style = 'documented';
        voice.hasToneGuidance = true;
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

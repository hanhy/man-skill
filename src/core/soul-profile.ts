import { findDocumentExcerpt, normalizeDocument } from './document-excerpt.ts';

export interface SoulProfileSummary {
  excerpt: string | null;
  coreTruths: string[];
  boundaries: string[];
  vibe: string[];
  continuity: string[];
  coreTruthCount: number;
  boundaryCount: number;
  vibeLineCount: number;
  continuityCount: number;
  sectionCount: number;
  hasGuidance: boolean;
}

export interface SoulProfileOptions {
  excerpt?: string | null;
  coreTruths?: string[];
  boundaries?: string[];
  vibe?: string[];
  continuity?: string[];
}

type SoulSection = 'core-truths' | 'boundaries' | 'vibe' | 'continuity' | null;

function mapSoulHeadingToSection(heading: string): SoulSection {
  switch (heading) {
    case 'core truths':
    case 'core values':
      return 'core-truths';
    case 'boundaries':
      return 'boundaries';
    case 'vibe':
      return 'vibe';
    case 'continuity':
    case 'decision rules':
      return 'continuity';
    default:
      return null;
  }
}

function cleanSoulLine(value: string) {
  return value
    .trim()
    .replace(/^[-*]\s+/, '')
    .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
    .trim();
}

export class SoulProfile {
  excerpt: string | null;
  coreTruths: string[];
  boundaries: string[];
  vibe: string[];
  continuity: string[];

  constructor({ excerpt = null, coreTruths = [], boundaries = [], vibe = [], continuity = [] }: SoulProfileOptions = {}) {
    this.excerpt = excerpt;
    this.coreTruths = coreTruths;
    this.boundaries = boundaries;
    this.vibe = vibe;
    this.continuity = continuity;
  }

  static fromDocument(document = '') {
    const normalizedDocument = normalizeDocument(document);
    const soul = new SoulProfile({ excerpt: findDocumentExcerpt(normalizedDocument) });
    let currentSection: SoulSection = null;

    normalizedDocument.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      if (line.startsWith('## ')) {
        const heading = line.slice(3).trim().toLowerCase();
        currentSection = mapSoulHeadingToSection(heading);
        return;
      }

      if (line.startsWith('#')) {
        return;
      }

      const cleaned = cleanSoulLine(line);
      if (!cleaned || cleaned === '---') {
        return;
      }

      if (currentSection === 'core-truths') {
        soul.coreTruths.push(cleaned);
      } else if (currentSection === 'boundaries') {
        soul.boundaries.push(cleaned);
      } else if (currentSection === 'vibe') {
        soul.vibe.push(cleaned);
      } else if (currentSection === 'continuity') {
        soul.continuity.push(cleaned);
      }
    });

    return soul;
  }

  summary(): SoulProfileSummary {
    const sectionCount = [
      this.coreTruths.length > 0,
      this.boundaries.length > 0,
      this.vibe.length > 0,
      this.continuity.length > 0,
    ].filter(Boolean).length;

    return {
      excerpt: this.excerpt,
      coreTruths: this.coreTruths,
      boundaries: this.boundaries,
      vibe: this.vibe,
      continuity: this.continuity,
      coreTruthCount: this.coreTruths.length,
      boundaryCount: this.boundaries.length,
      vibeLineCount: this.vibe.length,
      continuityCount: this.continuity.length,
      sectionCount,
      hasGuidance:
        typeof this.excerpt === 'string' && this.excerpt.length > 0
        || this.coreTruths.length > 0
        || this.boundaries.length > 0
        || this.vibe.length > 0
        || this.continuity.length > 0,
    };
  }
}

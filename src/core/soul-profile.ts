import { collectVisibleDocumentLines, findDocumentExcerpt, normalizeAdmonitionLine, normalizeDocument } from './document-excerpt.ts';

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

const SOUL_STARTER_GUIDANCE_LINES = new Set([
  'Describe the durable values and goals that should survive across tasks.',
  'Capture what the agent should protect or refuse to compromise.',
  'Describe the emotional texture or posture the agent should project.',
  'Note the principles to use when tradeoffs appear.',
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

const LIST_MARKER_PATTERN = /^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;

function cleanSoulLine(value: string) {
  return normalizeAdmonitionLine(
    value
      .trim()
      .replace(LIST_MARKER_PATTERN, '')
      .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
      .trim(),
  ).trim();
}

function isStarterSoulGuidance(value: string) {
  return SOUL_STARTER_GUIDANCE_LINES.has(value);
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
    const excerpt = findDocumentExcerpt(normalizedDocument);
    const normalizedExcerpt = excerpt ? cleanSoulLine(excerpt) : null;
    const soul = new SoulProfile({ excerpt: normalizedExcerpt && !isStarterSoulGuidance(normalizedExcerpt) ? normalizedExcerpt : null });
    let currentSection: SoulSection = null;

    collectVisibleDocumentLines(normalizedDocument).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const heading = parseStructuredHeading(line);
      if (heading) {
        currentSection = heading.level >= 2 ? mapSoulHeadingToSection(heading.text) : null;
        return;
      }

      const cleaned = cleanSoulLine(line);
      if (!cleaned || cleaned === '---' || isStarterSoulGuidance(cleaned)) {
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

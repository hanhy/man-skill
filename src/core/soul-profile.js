function mapSoulHeadingToSection(heading) {
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

function cleanSoulLine(value) {
  return value
    .trim()
    .replace(/^[-*]\s+/, '')
    .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
    .trim();
}

function normalizeDocument(document) {
  return typeof document === 'string' ? document : '';
}

function findExcerpt(document) {
  return (
    normalizeDocument(document)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('#') && line !== '---') ?? null
  );
}

export class SoulProfile {
  constructor({ excerpt = null, coreTruths = [], boundaries = [], vibe = [], continuity = [] } = {}) {
    this.excerpt = excerpt;
    this.coreTruths = coreTruths;
    this.boundaries = boundaries;
    this.vibe = vibe;
    this.continuity = continuity;
  }

  static fromDocument(document = '') {
    const normalizedDocument = normalizeDocument(document);
    const soul = new SoulProfile({ excerpt: findExcerpt(normalizedDocument) });
    let currentSection = null;

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

  summary() {
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
        (typeof this.excerpt === 'string' && this.excerpt.length > 0)
        || this.coreTruths.length > 0
        || this.boundaries.length > 0
        || this.vibe.length > 0
        || this.continuity.length > 0,
    };
  }
}

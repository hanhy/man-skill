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
        if (heading === 'core truths') {
          currentSection = 'core-truths';
          return;
        }
        if (heading === 'boundaries') {
          currentSection = 'boundaries';
          return;
        }
        if (heading === 'vibe') {
          currentSection = 'vibe';
          return;
        }
        if (heading === 'continuity') {
          currentSection = 'continuity';
          return;
        }

        currentSection = null;
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

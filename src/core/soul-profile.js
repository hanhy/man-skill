const SOUL_STARTER_GUIDANCE_LINES = new Set([
  'Describe the durable values and goals that should survive across tasks.',
  'Capture what the agent should protect or refuse to compromise.',
  'Describe the emotional texture or posture the agent should project.',
  'Note the principles to use when tradeoffs appear.',
]);

const LIST_MARKER_PATTERN = /^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;

function normalizeDocument(document) {
  if (typeof document !== 'string') {
    return '';
  }

  return document.charCodeAt(0) === 0xFEFF ? document.slice(1) : document;
}

function normalizeHeadingText(value) {
  return value
    .trim()
    .replace(/\s+#+\s*$/, '')
    .trim()
    .toLowerCase();
}

function parseStructuredHeading(line) {
  const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    text: normalizeHeadingText(match[2]),
  };
}

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

function lineStartsIndentedCodeBlock(line) {
  return /^(?:\t| {4,})\S?/.test(line);
}

function stripLeadingBlockquotePrefix(line) {
  const leadingWhitespaceMatch = line.match(/^(\s*)/);
  const leadingWhitespace = leadingWhitespaceMatch?.[1] ?? '';
  let normalizedLine = line.slice(leadingWhitespace.length);

  if (!normalizedLine.startsWith('>')) {
    return line;
  }

  while (normalizedLine.startsWith('>')) {
    normalizedLine = normalizedLine.slice(1);
    if (normalizedLine.startsWith(' ')) {
      normalizedLine = normalizedLine.slice(1);
    }
  }

  return normalizedLine;
}

function filterOutsideMarkdownFences(lines) {
  const visibleLines = [];
  let activeFenceMarker = null;
  let activeFenceLength = 0;
  let insideHtmlComment = false;
  let insideIndentedCodeBlock = false;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    const openingFenceMatch = trimmedLine.match(/^((`{3,})|(~{3,})).*$/);
    if (!activeFenceMarker) {
      if (openingFenceMatch) {
        const fence = openingFenceMatch[1];
        activeFenceMarker = fence[0];
        activeFenceLength = fence.length;
        continue;
      }
    } else {
      const fenceMarker = activeFenceMarker === '`' ? '`' : '~';
      const closingFencePattern = new RegExp(`^${fenceMarker}{${activeFenceLength},}\\s*$`);
      if (closingFencePattern.test(trimmedLine)) {
        activeFenceMarker = null;
        activeFenceLength = 0;
      }
      continue;
    }

    let visibleLine = rawLine;

    if (insideHtmlComment) {
      const commentEnd = visibleLine.indexOf('-->');
      if (commentEnd < 0) {
        continue;
      }

      visibleLine = visibleLine.slice(commentEnd + 3);
      insideHtmlComment = false;
    }

    while (true) {
      const commentStart = visibleLine.indexOf('<!--');
      if (commentStart < 0) {
        break;
      }

      const commentEnd = visibleLine.indexOf('-->', commentStart + 4);
      if (commentEnd >= 0) {
        visibleLine = `${visibleLine.slice(0, commentStart)}${visibleLine.slice(commentEnd + 3)}`;
        continue;
      }

      visibleLine = visibleLine.slice(0, commentStart);
      insideHtmlComment = true;
      break;
    }

    const normalizedLine = visibleLine;
    const rawLineWasBlank = rawLine.trim().length === 0;
    const becameEmptyAfterFiltering = normalizedLine.trim().length === 0 && !rawLineWasBlank;
    if (becameEmptyAfterFiltering) {
      continue;
    }

    const isBlankLine = normalizedLine.trim().length === 0;
    const isIndentedCodeLine = lineStartsIndentedCodeBlock(normalizedLine);
    const previousVisibleLine = visibleLines.at(-1) ?? '';
    const canStartIndentedCodeBlock = visibleLines.length === 0 || previousVisibleLine.trim().length === 0;

    if (insideIndentedCodeBlock) {
      if (isBlankLine || isIndentedCodeLine) {
        continue;
      }

      insideIndentedCodeBlock = false;
    }

    if (canStartIndentedCodeBlock && isIndentedCodeLine) {
      insideIndentedCodeBlock = true;
      continue;
    }

    visibleLines.push(normalizedLine);
  }

  return visibleLines;
}

function normalizeSetextHeadings(lines) {
  const normalizedLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index] ?? '';
    const nextLine = lines[index + 1] ?? '';
    const trimmedCurrentLine = currentLine.trim();
    const setextMatch = nextLine.trim().match(/^(=+|-+)$/);

    if (
      setextMatch
      && trimmedCurrentLine.length > 0
      && !trimmedCurrentLine.startsWith('#')
    ) {
      const level = setextMatch[1].startsWith('=') ? '#' : '##';
      normalizedLines.push(`${level} ${trimmedCurrentLine}`);
      index += 1;
      continue;
    }

    normalizedLines.push(currentLine);
  }

  return normalizedLines;
}

function collectVisibleDocumentLines(document) {
  const normalizedDocument = normalizeDocument(document);
  return normalizeSetextHeadings(
    filterOutsideMarkdownFences(
      normalizedDocument
        .split(/\r?\n/)
        .map((line) => stripLeadingBlockquotePrefix(line)),
    ),
  );
}

function normalizeAdmonitionLine(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^\[!([A-Z][A-Z0-9-]*)\](?:\s+(.*))?$/);
  if (!match) {
    return line;
  }

  const trailingContent = match[2]?.trim() ?? '';
  return trailingContent.length > 0 ? trailingContent : '';
}

function isFrontmatterBoundaryLine(line) {
  return /^(?:---|\.\.\.)\s*$/.test(line.trim());
}

function extractFrontmatterDescription(document) {
  const normalizedDocument = normalizeDocument(document);
  if (!normalizedDocument.startsWith('---')) {
    return null;
  }

  const lines = normalizedDocument.split(/\r?\n/);
  const closingIndex = lines.slice(1).findIndex((line) => isFrontmatterBoundaryLine(line));
  if (closingIndex < 0) {
    return null;
  }

  const frontmatterLines = lines.slice(1, closingIndex + 1);
  for (let index = 0; index < frontmatterLines.length; index += 1) {
    const line = frontmatterLines[index];
    const match = line.match(/^description\s*:\s*(.*)$/i);
    if (!match) {
      continue;
    }

    const rawValue = match[1].trim();
    if (/^[>|][0-9+-]*$/.test(rawValue)) {
      const blockLines = [];
      for (let nestedIndex = index + 1; nestedIndex < frontmatterLines.length; nestedIndex += 1) {
        const nestedLine = frontmatterLines[nestedIndex];
        if (nestedLine.trim().length > 0 && !/^\s/.test(nestedLine)) {
          break;
        }

        blockLines.push(nestedLine.trim());
      }

      const description = blockLines.join('\n').trim();
      return description.length > 0 ? description : null;
    }

    const trimmed = rawValue.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      const unwrapped = trimmed.slice(1, -1).trim();
      return unwrapped.length > 0 ? unwrapped : null;
    }

    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function findExcerpt(document) {
  const frontmatterDescription = extractFrontmatterDescription(document);
  if (typeof frontmatterDescription === 'string' && frontmatterDescription.length > 0) {
    return frontmatterDescription;
  }

  return (
    collectVisibleDocumentLines(document)
      .map((line) => normalizeAdmonitionLine(line.trim()).trim())
      .find((line) => line.length > 0 && !line.startsWith('#') && line !== '---') ?? null
  );
}

function cleanSoulLine(value) {
  return normalizeAdmonitionLine(
    value
      .trim()
      .replace(LIST_MARKER_PATTERN, '')
      .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
      .trim(),
  ).trim();
}

function pushUnique(target, value) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function appendToLast(target, value) {
  if (target.length === 0) {
    pushUnique(target, value);
    return;
  }

  target[target.length - 1] = `${target[target.length - 1]} ${value}`.trim();
}

function isStarterSoulGuidance(value) {
  return SOUL_STARTER_GUIDANCE_LINES.has(value);
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
    const excerpt = findExcerpt(normalizedDocument);
    const normalizedExcerpt = excerpt ? cleanSoulLine(excerpt) : null;
    const soul = new SoulProfile({ excerpt: normalizedExcerpt && !isStarterSoulGuidance(normalizedExcerpt) ? normalizedExcerpt : null });
    let currentSection = null;
    let currentSectionHasContent = false;

    collectVisibleDocumentLines(normalizedDocument).forEach((rawLine) => {
      const line = rawLine.trim();
      const lineIsIndentedContinuation = rawLine.length > 0 && /^[ \t]+/.test(rawLine) && !LIST_MARKER_PATTERN.test(line);
      if (!line) {
        return;
      }

      const heading = parseStructuredHeading(line);
      if (heading) {
        currentSection = heading.level >= 2 ? mapSoulHeadingToSection(heading.text) : null;
        currentSectionHasContent = false;
        return;
      }

      const cleaned = cleanSoulLine(line);
      if (!cleaned || cleaned === '---' || isStarterSoulGuidance(cleaned)) {
        return;
      }

      const appendSectionLine = (target) => {
        if (currentSectionHasContent && lineIsIndentedContinuation) {
          appendToLast(target, cleaned);
        } else {
          pushUnique(target, cleaned);
        }
        currentSectionHasContent = true;
      };

      if (currentSection === 'core-truths') {
        appendSectionLine(soul.coreTruths);
      } else if (currentSection === 'boundaries') {
        appendSectionLine(soul.boundaries);
      } else if (currentSection === 'vibe') {
        appendSectionLine(soul.vibe);
      } else if (currentSection === 'continuity') {
        appendSectionLine(soul.continuity);
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

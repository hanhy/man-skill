const VOICE_STARTER_GUIDANCE_LINES = new Set([
  'Describe the target cadence, directness, and emotional texture here.',
  'Capture recurring phrasing, structure, or rhetorical habits here.',
  'List wording, hedges, or habits that break the voice.',
  'Note bilingual, dialect, or code-switching habits worth preserving.',
]);

const LIST_MARKER_PATTERN = /^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;
const LANGUAGE_HINT_PATTERN = /\b(?:language|languages|bilingual|multilingual|dialect|code-switch(?:ing)?|english|spanish|arabic|mandarin|cantonese|french|german|japanese|korean|hindi|urdu|russian|portuguese|italian)\b/u;

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

function cleanVoiceLine(value) {
  return normalizeAdmonitionLine(
    value
      .trim()
      .replace(LIST_MARKER_PATTERN, '')
      .replace(/^\*\*(.+?)\*\*\s*/, '$1 ')
      .trim(),
  ).trim();
}

function looksLikeLanguageHint(value) {
  const normalized = value.toLowerCase();
  return LANGUAGE_HINT_PATTERN.test(normalized)
    || normalized.includes('中文');
}

function isCurrentDefaultHeading(value) {
  return value === 'current default for manskill' || /^current default for .+$/.test(value);
}

function pushUnique(target, value) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function isStarterVoiceGuidance(value) {
  return VOICE_STARTER_GUIDANCE_LINES.has(value);
}

function isListSection(section) {
  return section === 'signature-moves'
    || section === 'avoid'
    || section === 'language-hints'
    || section === 'voice-should-capture'
    || section === 'voice-should-not-capture'
    || section === 'current-default';
}

export class VoiceProfile {
  constructor({ tone = 'clear', style = 'adaptive', constraints = [], signatures = [], languageHints = [] } = {}) {
    this.tone = tone;
    this.style = style;
    this.constraints = constraints;
    this.signatures = signatures;
    this.languageHints = languageHints;
    this.hasToneGuidance = style === 'documented' && tone.trim().length > 0;
  }

  static fromDocument(document = '') {
    const normalizedDocument = normalizeDocument(document);
    const excerpt = findExcerpt(normalizedDocument);
    const normalizedExcerpt = excerpt ? cleanVoiceLine(excerpt) : null;
    const frontmatterDescription = extractFrontmatterDescription(normalizedDocument);
    const normalizedFrontmatterDescription = frontmatterDescription ? cleanVoiceLine(frontmatterDescription) : null;
    const voice = new VoiceProfile();
    let currentSection = null;
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
        if (isCurrentDefaultHeading(heading.text)) {
          currentSection = 'current-default';
          currentSectionHasContent = false;
          return;
        }

        currentSection = null;
        currentSectionHasContent = false;
        return;
      }

      if (isListSection(currentSection) && !LIST_MARKER_PATTERN.test(line) && currentSectionHasContent) {
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

    const hasExcerptToneGuidance = normalizedExcerpt !== null
      && !isStarterVoiceGuidance(normalizedExcerpt)
      && (
        normalizedFrontmatterDescription === normalizedExcerpt
        || !looksLikeLanguageHint(normalizedExcerpt)
      );
    if (!voice.hasToneGuidance && hasExcerptToneGuidance) {
      voice.tone = normalizedExcerpt;
      voice.style = 'documented';
      voice.hasToneGuidance = true;
    }

    return voice;
  }

  summary() {
    return {
      tone: this.tone,
      style: this.style,
      constraints: this.constraints,
      signatures: this.signatures,
      languageHints: this.languageHints,
      constraintCount: this.constraints.length,
      signatureCount: this.signatures.length,
      languageHintCount: this.languageHints.length,
      hasGuidance: this.hasToneGuidance || this.constraints.length > 0 || this.signatures.length > 0 || this.languageHints.length > 0,
    };
  }
}

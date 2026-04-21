function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function normalizeDocument(document: unknown): string {
  return typeof document === 'string' ? document : '';
}

export function extractFrontmatterDescription(document: unknown): string | null {
  const normalizedDocument = normalizeDocument(document);
  if (!normalizedDocument.startsWith('---')) {
    return null;
  }

  const lines = normalizedDocument.split(/\r?\n/);
  const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
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
      const blockLines: string[] = [];
      for (let nestedIndex = index + 1; nestedIndex < frontmatterLines.length; nestedIndex += 1) {
        const nestedLine = frontmatterLines[nestedIndex];
        if (nestedLine.trim().length > 0 && !/^\s/.test(nestedLine)) {
          break;
        }

        blockLines.push(nestedLine.trim());
      }

      const description = blockLines.join('\n').trim();
      return isNonEmptyString(description) ? description : null;
    }

    const description = stripWrappingQuotes(rawValue);
    return isNonEmptyString(description) ? description : null;
  }

  return null;
}

function filterOutsideMarkdownFences(lines: string[]): string[] {
  const visibleLines: string[] = [];
  let activeFenceMarker: '`' | '~' | null = null;
  let activeFenceLength = 0;
  let insideHtmlComment = false;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    const openingFenceMatch = trimmedLine.match(/^((`{3,})|(~{3,})).*$/);
    if (!activeFenceMarker) {
      if (openingFenceMatch) {
        const fence = openingFenceMatch[1];
        activeFenceMarker = fence[0] as '`' | '~';
        activeFenceLength = fence.length;
        continue;
      }
    } else {
      const closingFencePattern = new RegExp(`^${activeFenceMarker === '`' ? '`' : '~'}{${activeFenceLength},}\\s*$`);
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

    visibleLines.push(visibleLine);
  }

  return visibleLines;
}

function normalizeSetextHeadings(lines: string[]): string[] {
  const normalizedLines: string[] = [];

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

function stripLeadingBlockquotePrefix(line: string): string {
  return line.replace(/^\s*(?:>\s*)+/, '');
}

export function normalizeAdmonitionLine(line: string): string {
  const trimmed = line.trim();
  const match = trimmed.match(/^\[!([A-Z][A-Z0-9-]*)\](?:\s+(.*))?$/);
  if (!match) {
    return line;
  }

  const trailingContent = match[2]?.trim() ?? '';
  return trailingContent.length > 0 ? trailingContent : '';
}

function isMeaningfulExcerptLine(line: string): boolean {
  return line.length > 0 && !line.startsWith('#') && line !== '---';
}

export function collectVisibleDocumentLines(document: unknown): string[] {
  const normalizedDocument = normalizeDocument(document);
  return normalizeSetextHeadings(
    filterOutsideMarkdownFences(
      normalizedDocument
        .split(/\r?\n/)
        .map((line) => stripLeadingBlockquotePrefix(line)),
    ),
  );
}

export function findDocumentExcerpt(document: unknown): string | null {
  const normalizedDocument = normalizeDocument(document);
  const frontmatterDescription = extractFrontmatterDescription(normalizedDocument);
  if (isNonEmptyString(frontmatterDescription)) {
    return frontmatterDescription;
  }

  const lines = normalizedDocument.split(/\r?\n/);
  const body = normalizedDocument.startsWith('---')
    ? (() => {
        const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
        return closingIndex >= 0 ? lines.slice(closingIndex + 2).join('\n') : normalizedDocument;
      })()
    : normalizedDocument;

  return collectVisibleDocumentLines(body)
    .map((line) => normalizeAdmonitionLine(line.trim()))
    .find((line) => isMeaningfulExcerptLine(line)) ?? null;
}

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

export function findDocumentExcerpt(document: unknown): string | null {
  const normalizedDocument = normalizeDocument(document);
  const frontmatterDescription = extractFrontmatterDescription(normalizedDocument);
  if (isNonEmptyString(frontmatterDescription)) {
    return frontmatterDescription;
  }

  const lines = normalizedDocument.split(/\r?\n/);
  const bodyLines = normalizedDocument.startsWith('---')
    ? (() => {
        const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
        return closingIndex >= 0 ? lines.slice(closingIndex + 2) : lines;
      })()
    : lines;

  return bodyLines
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#') && line !== '---') ?? null;
}

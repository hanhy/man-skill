import test from 'node:test';
import assert from 'node:assert/strict';

import { collectVisibleDocumentLines, findDocumentExcerpt } from '../src/core/document-excerpt.ts';

test('findDocumentExcerpt skips standalone admonition labels before prose guidance', () => {
  const excerpt = findDocumentExcerpt([
    '# Voice',
    '',
    '> [!NOTE]',
    '> Warm and grounded.',
    '',
    '## Signature moves',
    '- Use crisp examples.',
  ].join('\n'));

  assert.equal(excerpt, 'Warm and grounded.');
});

test('findDocumentExcerpt strips admonition labels that share a line with prose guidance', () => {
  const excerpt = findDocumentExcerpt([
    '# Soul',
    '',
    '[!TIP] Stay faithful to the source material.',
    '',
    '## Boundaries',
    '- Do not bluff certainty.',
  ].join('\n'));

  assert.equal(excerpt, 'Stay faithful to the source material.');
});

test('collectVisibleDocumentLines preserves admonition lines for downstream structured parsing', () => {
  const lines = collectVisibleDocumentLines([
    '# Voice',
    '',
    '> [!NOTE]',
    '> Warm and grounded.',
    '',
    '> ## Tone',
    '> Keep replies direct.',
  ].join('\n'));

  assert.deepEqual(lines, [
    '# Voice',
    '',
    '[!NOTE]',
    'Warm and grounded.',
    '',
    '## Tone',
    'Keep replies direct.',
  ]);
});

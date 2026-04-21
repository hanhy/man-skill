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


test('collectVisibleDocumentLines and findDocumentExcerpt ignore indented code blocks', () => {
  const document = [
    '# Skills',
    '',
    '    ## What lives here',
    '    - Template heading that should stay hidden.',
    '    ## Layout',
    '    - Template heading that should stay hidden too.',
    '',
    'Keep reusable operator workflows discoverable outside indented samples.',
  ].join('\n');

  assert.deepEqual(collectVisibleDocumentLines(document), [
    '# Skills',
    '',
    'Keep reusable operator workflows discoverable outside indented samples.',
  ]);
  assert.equal(findDocumentExcerpt(document), 'Keep reusable operator workflows discoverable outside indented samples.');
});


test('collectVisibleDocumentLines keeps tab-indented code blocks hidden until real prose resumes', () => {
  const document = [
    '# Voice',
    '',
    '\t## Tone',
    '\t- Template heading that should stay hidden.',
    '',
    '\t## Signature moves',
    '\t- Template heading that should stay hidden too.',
    '',
    'Keep replies direct once visible prose resumes.',
  ].join('\n');

  assert.deepEqual(collectVisibleDocumentLines(document), [
    '# Voice',
    '',
    'Keep replies direct once visible prose resumes.',
  ]);
  assert.equal(findDocumentExcerpt(document), 'Keep replies direct once visible prose resumes.');
});

test('collectVisibleDocumentLines keeps blockquoted indented code blocks hidden until visible prose resumes', () => {
  const document = [
    '# Voice',
    '',
    '>     ## Tone',
    '>     - Template heading that should stay hidden.',
    '',
    '> Visible prose resumes after the hidden sample block.',
  ].join('\n');

  assert.deepEqual(collectVisibleDocumentLines(document), [
    '# Voice',
    '',
    'Visible prose resumes after the hidden sample block.',
  ]);
  assert.equal(findDocumentExcerpt(document), 'Visible prose resumes after the hidden sample block.');
});

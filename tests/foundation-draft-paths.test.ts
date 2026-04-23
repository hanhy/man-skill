import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFoundationDraftPaths, collectFoundationDraftPaths } from '../src/core/foundation-draft-paths.ts';

test('buildFoundationDraftPaths trims profile ids, draft file paths, and missing draft names before building refresh paths', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: ' jane-doe ',
      draftFiles: {
        memory: ' profiles/jane-doe/memory/long-term/foundation.json ',
        skills: '   ',
      },
      missingDrafts: [' voice ', ' soul ', '', 'memory'],
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('collectFoundationDraftPaths trims and dedupes shared refresh paths across profiles', () => {
  assert.deepEqual(
    collectFoundationDraftPaths([
      {
        profileId: ' jane-doe ',
        draftFiles: {
          memory: ' profiles/jane-doe/memory/long-term/foundation.json ',
        },
        missingDrafts: [' voice '],
      },
      {
        profileId: 'jane-doe',
        draftFiles: {
          memory: 'profiles/jane-doe/memory/long-term/foundation.json',
        },
        missingDrafts: ['voice'],
      },
    ]),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

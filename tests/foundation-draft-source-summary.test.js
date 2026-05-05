import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeFoundationDraftSources } from '../src/core/foundation-draft-source-summary.ts';

test('summarizeFoundationDraftSources keeps source-count provenance in canonical memory/skills/soul/voice order', () => {
  const profile = {
    foundationDraftSummaries: {
      voice: {
        sourceCount: 2,
        materialTypes: { talk: 1, message: 1 },
        latestMaterialSourcePath: 'profiles/jane-doe/imports/voice-note.txt',
      },
      memory: {
        sourceCount: 2,
        entryCount: 1,
        materialTypes: { talk: 1, message: 1 },
        latestMaterialSourcePath: './profiles/jane-doe/imports/call-notes.txt',
      },
      soul: {
        sourceCount: 1,
        materialTypes: { talk: 1 },
        latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
      },
      skills: {
        sourceCount: 1,
        materialTypes: { talk: 1 },
        latestMaterialSourcePath: 'profiles/jane-doe/imports/call-notes.txt',
      },
    },
  };

  assert.equal(
    summarizeFoundationDraftSources(profile),
    'memory 2 sources (message:1, talk:1), 1 entry, latest @ profiles/jane-doe/imports/call-notes.txt | skills 1 source (talk:1), latest @ profiles/jane-doe/imports/call-notes.txt | soul 1 source (talk:1), latest @ profiles/jane-doe/imports/call-notes.txt | voice 2 sources (message:1, talk:1), latest @ profiles/jane-doe/imports/voice-note.txt',
  );
});

test('summarizeFoundationDraftSources falls back to normalized draft paths when counts are unavailable', () => {
  const profile = {
    foundationDraftSummaries: {
      memory: {
        path: './profiles/jane-doe/memory/long-term/foundation.json',
        entryCount: 1,
        latestMaterialSourcePath: '.\\profiles\\jane-doe\\imports\\call-notes.txt',
      },
      skills: {
        path: 'profiles/jane-doe/skills/README.md',
      },
      voice: {
        path: 'profiles/jane-doe/voice/README.md',
        materialTypes: { message: 1 },
        latestMaterialSourcePath: 'profiles/jane-doe/imports/voice-note.txt',
      },
    },
  };

  assert.equal(
    summarizeFoundationDraftSources(profile),
    'memory @ profiles/jane-doe/memory/long-term/foundation.json (1 entry, latest @ profiles/jane-doe/imports/call-notes.txt) | skills @ profiles/jane-doe/skills/README.md | voice @ profiles/jane-doe/voice/README.md (types message:1, latest @ profiles/jane-doe/imports/voice-note.txt)',
  );
});

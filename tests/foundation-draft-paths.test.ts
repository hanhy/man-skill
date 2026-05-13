import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFoundationDraftPaths, collectFoundationDraftPaths, normalizeDraftPath } from '../src/core/foundation-draft-paths.ts';

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

test('buildFoundationDraftPaths backfills canonical draft targets when partial explicit metadata only points at a subset of canonical files under repeated keys', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: ' profiles\\jane-doe\\memory\\long-term\\foundation.json ',
        skills: 'profiles/jane-doe/soul/README.md',
        soul: ' profiles\\jane-doe\\soul\\README.md ',
      },
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('buildFoundationDraftPaths collapses redundant relative separators before deduping refresh targets', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: ' ./profiles//jane-doe/memory//long-term///foundation.json ',
        skills: '.\\profiles\\jane-doe\\skills\\README.md',
        soul: 'profiles/jane-doe//skills/README.md',
      },
      missingDrafts: [' voice '],
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('buildFoundationDraftPaths removes interior dot segments before deduping explicit and scaffold targets', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: 'profiles/./jane-doe/memory/./long-term/foundation.json',
        skills: './profiles/jane-doe/skills/README.md',
        soul: 'profiles/jane-doe/./skills/README.md',
      },
      missingDrafts: ['voice'],
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('buildFoundationDraftPaths collapses interior parent-directory segments before deduping refresh targets', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: 'profiles/jane-doe/memory/tmp/../long-term/foundation.json',
        skills: './profiles/jane-doe/skills/drafts/../README.md',
        soul: 'profiles/jane-doe/voice/../skills/README.md',
      },
      missingDrafts: ['voice'],
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('buildFoundationDraftPaths falls back to canonical missing foundation targets when stale metadata only records a partial explicit draft set', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: 'profiles/jane-doe/memory/long-term/foundation.json',
      },
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('buildFoundationDraftPaths backfills canonical targets when stale metadata only records multiple explicit draft files', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: 'profiles/jane-doe/memory/long-term/foundation.json',
        soul: 'profiles/jane-doe/soul/README.md',
      },
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
      'profiles/jane-doe/soul/README.md',
      'profiles/jane-doe/voice/README.md',
    ],
  );
});

test('normalizeDraftPath rejects absolute and repo-escaping paths instead of misreporting them as repo-relative', () => {
  assert.equal(normalizeDraftPath('/tmp/foundation.json'), null);
  assert.equal(normalizeDraftPath('C:\\drafts\\voice\\README.md'), null);
  assert.equal(normalizeDraftPath('\\\\server\\share\\skills\\README.md'), null);
  assert.equal(normalizeDraftPath('../profiles/jane-doe/voice/README.md'), null);
  assert.equal(normalizeDraftPath('profiles/jane-doe/../voice/README.md'), 'profiles/voice/README.md');
});

test('buildFoundationDraftPaths ignores absolute and repo-escaping stale draft metadata and falls back to canonical refresh targets', () => {
  assert.deepEqual(
    buildFoundationDraftPaths({
      profileId: 'jane-doe',
      draftFiles: {
        memory: '/tmp/foundation.json',
        skills: 'C:\\drafts\\skills\\README.md',
        soul: '../profiles/jane-doe/soul/README.md',
        voice: '\\\\server\\share\\voice\\README.md',
      },
    }),
    [
      'profiles/jane-doe/memory/long-term/foundation.json',
      'profiles/jane-doe/skills/README.md',
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

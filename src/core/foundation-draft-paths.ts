const FOUNDATION_DRAFT_KEYS = ['memory', 'skills', 'soul', 'voice'] as const;

type FoundationDraftKey = (typeof FOUNDATION_DRAFT_KEYS)[number];

type FoundationDraftFiles = Partial<Record<string, string | null | undefined>> | null | undefined;

type FoundationDraftPathOptions = {
  profileId?: string | null;
  draftFiles?: FoundationDraftFiles;
  missingDrafts?: string[] | null;
};

function normalizeProfileId(profileId: string | null | undefined): string | null {
  if (typeof profileId !== 'string') {
    return null;
  }

  const trimmed = profileId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeDraftPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const segments = value
    .trim()
    .replaceAll('\\', '/')
    .replace(/^(?:\.\/)+/, '')
    .replace(/\/+/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');

  const normalizedSegments = segments.reduce<string[]>((accumulator, segment) => {
    if (segment !== '..') {
      accumulator.push(segment);
      return accumulator;
    }

    const previousSegment = accumulator[accumulator.length - 1];
    if (previousSegment && previousSegment !== '..') {
      accumulator.pop();
      return accumulator;
    }

    accumulator.push(segment);
    return accumulator;
  }, []);

  const normalized = normalizedSegments.join('/');
  return normalized.length > 0 ? normalized : null;
}

function buildFoundationDraftPathMap(profileId: string): Record<FoundationDraftKey, string> {
  return {
    memory: `profiles/${profileId}/memory/long-term/foundation.json`,
    skills: `profiles/${profileId}/skills/README.md`,
    soul: `profiles/${profileId}/soul/README.md`,
    voice: `profiles/${profileId}/voice/README.md`,
  };
}

function normalizeMissingDraftSet(missingDrafts: string[] | null | undefined): Set<FoundationDraftKey> {
  return new Set(
    Array.isArray(missingDrafts)
      ? missingDrafts
        .map((value) => typeof value === 'string' ? value.trim() : value)
        .filter((value): value is FoundationDraftKey => FOUNDATION_DRAFT_KEYS.includes(value as FoundationDraftKey))
      : [],
  );
}

export function buildFoundationDraftPaths({
  profileId,
  draftFiles,
  missingDrafts,
}: FoundationDraftPathOptions): string[] {
  const normalizedProfileId = normalizeProfileId(profileId);
  if (!normalizedProfileId) {
    return [];
  }

  const canonicalPaths = buildFoundationDraftPathMap(normalizedProfileId);
  const missingDraftSet = normalizeMissingDraftSet(missingDrafts);
  const explicitPathKeys = new Set<FoundationDraftKey>();
  const orderedPaths = Array.from(new Set(
    FOUNDATION_DRAFT_KEYS
      .map((draftKey) => {
        const explicitPath = normalizeDraftPath(draftFiles?.[draftKey]);
        if (explicitPath) {
          explicitPathKeys.add(draftKey);
          return explicitPath;
        }

        return missingDraftSet.has(draftKey) ? canonicalPaths[draftKey] : null;
      })
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  ));

  const canonicalPathSet = new Set(Object.values(canonicalPaths));
  const hasOnlyCanonicalExplicitPaths = Array.from(explicitPathKeys).every((draftKey) => {
    const explicitPath = normalizeDraftPath(draftFiles?.[draftKey]);
    return explicitPath ? canonicalPathSet.has(explicitPath) : false;
  });

  if (missingDraftSet.size === 0 && hasOnlyCanonicalExplicitPaths && explicitPathKeys.size > 0 && explicitPathKeys.size < FOUNDATION_DRAFT_KEYS.length) {
    return FOUNDATION_DRAFT_KEYS.map((draftKey) => canonicalPaths[draftKey]);
  }

  return orderedPaths.length > 0
    ? orderedPaths
    : FOUNDATION_DRAFT_KEYS.map((draftKey) => canonicalPaths[draftKey]);
}

export function collectFoundationDraftPaths(profiles: FoundationDraftPathOptions[]): string[] {
  return Array.from(new Set(
    profiles.flatMap((profile) => buildFoundationDraftPaths(profile)),
  ));
}

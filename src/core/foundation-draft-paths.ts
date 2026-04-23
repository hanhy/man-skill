const FOUNDATION_DRAFT_KEYS = ['memory', 'skills', 'soul', 'voice'] as const;

type FoundationDraftKey = (typeof FOUNDATION_DRAFT_KEYS)[number];

type FoundationDraftFiles = Partial<Record<string, string | null | undefined>> | null | undefined;

type FoundationDraftPathOptions = {
  profileId?: string | null;
  draftFiles?: FoundationDraftFiles;
  missingDrafts?: string[] | null;
};

function normalizeProfileId(profileId: string | null | undefined): string | null {
  return typeof profileId === 'string' && profileId.length > 0 ? profileId : null;
}

function normalizeDraftPath(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
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
      ? missingDrafts.filter((value): value is FoundationDraftKey => FOUNDATION_DRAFT_KEYS.includes(value as FoundationDraftKey))
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
  const orderedPaths = FOUNDATION_DRAFT_KEYS
    .map((draftKey) => {
      const explicitPath = normalizeDraftPath(draftFiles?.[draftKey]);
      if (explicitPath) {
        return explicitPath;
      }

      return missingDraftSet.has(draftKey) ? canonicalPaths[draftKey] : null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  return orderedPaths.length > 0
    ? orderedPaths
    : FOUNDATION_DRAFT_KEYS.map((draftKey) => canonicalPaths[draftKey]);
}

export function collectFoundationDraftPaths(profiles: FoundationDraftPathOptions[]): string[] {
  return Array.from(new Set(
    profiles.flatMap((profile) => buildFoundationDraftPaths(profile)),
  ));
}

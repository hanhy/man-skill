export function buildFallbackDisplayName(profileId) {
  if (typeof profileId !== 'string' || profileId.trim().length === 0) {
    return null;
  }

  const normalized = profileId.trim();
  const parts = normalized
    .split(/[-_\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => /^[a-z0-9]+$/i.test(part)
      ? `${part.charAt(0).toUpperCase()}${part.slice(1)}`
      : part);

  const fallbackDisplayName = parts.join(' ').trim();
  return fallbackDisplayName.length > 0 && fallbackDisplayName !== normalized
    ? fallbackDisplayName
    : null;
}

export function buildProfileLabel(profileId, displayName) {
  const normalizedProfileId = typeof profileId === 'string' && profileId.trim().length > 0
    ? profileId.trim()
    : 'unknown-profile';
  const normalizedDisplayName = typeof displayName === 'string' && displayName.trim().length > 0
    ? displayName.trim()
    : buildFallbackDisplayName(normalizedProfileId);

  return normalizedDisplayName && normalizedDisplayName !== normalizedProfileId
    ? `${normalizedDisplayName} (${normalizedProfileId})`
    : (normalizedDisplayName ?? normalizedProfileId);
}

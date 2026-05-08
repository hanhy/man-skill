import { normalizeDraftPath } from './foundation-draft-paths.ts';

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeMaterialTypes(materialTypes: unknown): Record<string, number> | null {
  if (!materialTypes || typeof materialTypes !== 'object' || Array.isArray(materialTypes)) {
    return null;
  }

  const entries = Object.entries(materialTypes)
    .filter(([key, value]) => normalizeOptionalString(key) && Number.isFinite(value) && Number(value) > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key.trim(), Number(value)] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function formatMaterialTypes(materialTypes: Record<string, number> | null): string | null {
  if (!materialTypes) {
    return null;
  }

  const entries = Object.entries(materialTypes)
    .filter(([key, value]) => typeof key === 'string' && key.length > 0 && Number.isFinite(value) && Number(value) > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return entries.length > 0
    ? entries.map(([key, value]) => `${key}:${value}`).join(', ')
    : null;
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function summarizeFoundationDraftSources(profile: any): string | null {
  const draftKinds = [
    { key: 'memory', summary: profile?.foundationDraftSummaries?.memory },
    { key: 'skills', summary: profile?.foundationDraftSummaries?.skills },
    { key: 'soul', summary: profile?.foundationDraftSummaries?.soul },
    { key: 'voice', summary: profile?.foundationDraftSummaries?.voice },
  ] as const;

  const sourceSummaries = draftKinds
    .map(({ key, summary }) => {
      if (!summary) {
        return null;
      }

      const summaryPath = normalizeDraftPath(normalizeOptionalString(summary.path));
      const latestMaterialSourcePath = normalizeDraftPath(normalizeOptionalString(summary.latestMaterialSourcePath));
      const sourceCount = Number(summary.sourceCount ?? 0);
      const entryCount = key === 'memory' ? Number(summary.entryCount ?? 0) : 0;
      const materialTypes = formatMaterialTypes(normalizeMaterialTypes(summary.materialTypes));

      if (!summaryPath && !latestMaterialSourcePath && sourceCount <= 0 && entryCount <= 0 && !materialTypes) {
        return null;
      }

      const sourceLabel = sourceCount > 0 ? formatCountLabel(sourceCount, 'source') : null;
      const entryLabel = entryCount > 0 ? formatCountLabel(entryCount, 'entry', 'entries') : null;
      const latestSourceLabel = latestMaterialSourcePath ? `latest @ ${latestMaterialSourcePath}` : null;
      const typeLabel = !sourceLabel && materialTypes ? `types ${materialTypes}` : null;
      const sourceDetailLabel = sourceLabel ? `${sourceLabel}${materialTypes ? ` (${materialTypes})` : ''}` : null;
      const fallbackDetails = [
        typeLabel,
        entryLabel,
        latestSourceLabel,
      ].filter((value): value is string => typeof value === 'string' && value.length > 0);
      const parts = [
        sourceDetailLabel,
        typeLabel,
        entryLabel,
        latestSourceLabel,
      ].filter((value): value is string => typeof value === 'string' && value.length > 0);

      if (!sourceLabel && summaryPath) {
        return fallbackDetails.length > 0 ? `${key} @ ${summaryPath} (${fallbackDetails.join(', ')})` : `${key} @ ${summaryPath}`;
      }

      return parts.length > 0 ? `${key} ${parts.join(', ')}` : null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  return sourceSummaries.length > 0 ? sourceSummaries.join(' | ') : null;
}

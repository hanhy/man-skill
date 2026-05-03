import { normalizeDraftPath } from '../core/foundation-draft-paths.ts';

export type WorkPriority = {
  id: string;
  label: string;
  status: 'queued' | 'blocked' | 'ready';
  summary: string;
  nextAction: string | null;
  command: string | null;
  latestMaterialAt?: string | null;
  latestMaterialId?: string | null;
  latestMaterialSourcePath?: string | null;
  refreshReasons?: string[];
  missingDrafts?: string[];
  rootThinReadySections?: string[];
  rootThinMissingSections?: string[];
  rootThinReadySectionCount?: number;
  rootThinTotalSectionCount?: number;
  rootHeadingAliases?: string[];
  candidateSignalSummary?: string | null;
  draftSourcesSummary?: string | null;
  draftGapSummary?: string | null;
  fallbackCommand?: string | null;
  refreshIntakeCommand?: string | null;
  updateProfileCommand?: string | null;
  updateProfileAndRefreshCommand?: string | null;
  editPath?: string | null;
  editPaths?: string[];
  manifestInspectCommand?: string | null;
  manifestImportCommand?: string | null;
  intakeManifestEntryTemplateTypes?: string[];
  intakeManifestEntryTemplateDetails?: Array<{ type: string; source: 'file' | 'text'; path: string | null; preview: string | null }>;
  intakeManifestEntryTemplateCount?: number;
  intakeManifestEntryTemplateRoot?: string | null;
  recommendedProfileSlices?: Array<{
    personId: string | null;
    label: string | null;
    latestMaterialAt: string | null;
    latestMaterialId: string | null;
    latestMaterialSourcePath: string | null;
    candidateSignalSummary?: string | null;
    draftSourcesSummary?: string | null;
    refreshReasons?: string[];
    missingDrafts?: string[];
    draftGapSummary?: string | null;
    fallbackCommand: string | null;
    refreshIntakeCommand: string | null;
    updateProfileCommand: string | null;
    updateProfileAndRefreshCommand: string | null;
    editPath: string | null;
    editPaths: string[];
    manifestInspectCommand: string | null;
    manifestImportCommand: string | null;
    intakeManifestEntryTemplateTypes: string[];
    intakeManifestEntryTemplateDetails: Array<{ type: string; source: 'file' | 'text'; path: string | null; preview: string | null }>;
    intakeManifestEntryTemplateCount: number;
    intakeManifestEntryTemplateRoot: string | null;
    inspectCommand: string | null;
    followUpCommand: string | null;
    paths: string[];
  }>;
  inspectCommand?: string | null;
  followUpCommand?: string | null;
  paths: string[];
}

export interface WorkLoopSummary {
  intervalMinutes: number;
  objectiveCount: number;
  objectives: string[];
  priorityCount: number;
  readyPriorityCount: number;
  queuedPriorityCount: number;
  blockedPriorityCount: number;
  leadingPriority: WorkPriority | null;
  currentPriority: WorkPriority | null;
  runnablePriority: WorkPriority | null;
  actionableReadyPriority: WorkPriority | null;
  recommendedPriority: WorkPriority | null;
  priorities: WorkPriority[];
}

export interface WorkLoopOptions {
  intervalMinutes?: number;
  objectives?: string[];
  priorities?: WorkPriority[];
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePathArray(values: string[] | null | undefined): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  return Array.from(new Set(
    values
      .map((value) => normalizeDraftPath(value))
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  ));
}

function normalizeStringArray(values: string[] | null | undefined): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  return Array.from(new Set(
    values
      .map((value) => normalizeOptionalString(value))
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  ));
}

function normalizeStarterTemplateDetails(
  details: Array<{ type: string; source: 'file' | 'text'; path: string | null; preview: string | null }> | null | undefined,
): Array<{ type: string; source: 'file' | 'text'; path: string | null; preview: string | null }> | undefined {
  if (!Array.isArray(details)) {
    return undefined;
  }

  return details.map((detail) => ({
    ...detail,
    path: normalizeDraftPath(detail?.path),
    preview: normalizeOptionalString(detail?.preview) ?? null,
  }));
}

function normalizeDraftSourcesSummary(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/@\s+([^,|)]+?)(?=\s*(?:,|\(|\||\)|$))/g, (_match, rawPath: string) => {
    const normalizedPath = normalizeDraftPath(rawPath);
    return normalizedPath ? `@ ${normalizedPath}` : `@ ${rawPath.trim()}`;
  });
}

function normalizeRecommendedProfileSlices(priority: WorkPriority): WorkPriority['recommendedProfileSlices'] {
  if (!Array.isArray(priority.recommendedProfileSlices)) {
    return undefined;
  }

  return priority.recommendedProfileSlices.map((slice) => {
    const latestMaterialAt = normalizeOptionalString(slice?.latestMaterialAt) ?? null;
    const latestMaterialId = normalizeOptionalString(slice?.latestMaterialId) ?? null;
    const latestMaterialSourcePath = normalizeDraftPath(slice?.latestMaterialSourcePath) ?? null;
    const candidateSignalSummary = normalizeOptionalString(slice?.candidateSignalSummary) ?? null;
    const draftSourcesSummary = normalizeDraftSourcesSummary(slice?.draftSourcesSummary);
    const refreshReasons = normalizeStringArray(slice?.refreshReasons) ?? [];
    const missingDrafts = normalizeStringArray(slice?.missingDrafts) ?? [];
    const draftGapSummary = normalizeOptionalString(slice?.draftGapSummary) ?? null;
    const fallbackCommand = normalizeOptionalString(slice?.fallbackCommand) ?? null;
    const refreshIntakeCommand = normalizeOptionalString(slice?.refreshIntakeCommand) ?? null;
    const updateProfileCommand = normalizeOptionalString(slice?.updateProfileCommand) ?? null;
    const updateProfileAndRefreshCommand = normalizeOptionalString(slice?.updateProfileAndRefreshCommand) ?? null;
    const editPath = normalizeDraftPath(slice?.editPath) ?? null;
    const editPaths = normalizePathArray(slice?.editPaths) ?? [];
    const manifestInspectCommand = normalizeOptionalString(slice?.manifestInspectCommand) ?? null;
    const manifestImportCommand = normalizeOptionalString(slice?.manifestImportCommand) ?? null;
    const intakeManifestEntryTemplateTypes = normalizeStringArray(slice?.intakeManifestEntryTemplateTypes) ?? [];
    const intakeManifestEntryTemplateDetails = normalizeStarterTemplateDetails(slice?.intakeManifestEntryTemplateDetails) ?? [];
    const intakeManifestEntryTemplateRoot = normalizeDraftPath(slice?.intakeManifestEntryTemplateRoot) ?? null;
    const inspectCommand = normalizeOptionalString(slice?.inspectCommand) ?? null;
    const followUpCommand = normalizeOptionalString(slice?.followUpCommand) ?? null;
    const paths = normalizePathArray(slice?.paths) ?? [];

    return {
      ...slice,
      personId: normalizeOptionalString(slice?.personId) ?? null,
      label: normalizeOptionalString(slice?.label) ?? null,
      latestMaterialAt,
      latestMaterialId,
      latestMaterialSourcePath,
      candidateSignalSummary,
      draftSourcesSummary,
      refreshReasons,
      missingDrafts,
      draftGapSummary,
      fallbackCommand,
      refreshIntakeCommand,
      updateProfileCommand,
      updateProfileAndRefreshCommand,
      editPath,
      editPaths,
      manifestInspectCommand,
      manifestImportCommand,
      intakeManifestEntryTemplateTypes,
      intakeManifestEntryTemplateDetails,
      intakeManifestEntryTemplateRoot,
      inspectCommand,
      followUpCommand,
      paths,
    };
  });
}

function normalizePriority(priority: WorkPriority): WorkPriority {
  const latestMaterialAt = normalizeOptionalString(priority.latestMaterialAt);
  const latestMaterialId = normalizeOptionalString(priority.latestMaterialId);
  const latestMaterialSourcePath = normalizeDraftPath(priority.latestMaterialSourcePath);
  const refreshReasons = normalizeStringArray(priority.refreshReasons);
  const missingDrafts = normalizeStringArray(priority.missingDrafts);
  const rootThinReadySections = normalizeStringArray(priority.rootThinReadySections);
  const rootThinMissingSections = normalizeStringArray(priority.rootThinMissingSections);
  const rootHeadingAliases = normalizeStringArray(priority.rootHeadingAliases);
  const candidateSignalSummary = normalizeOptionalString(priority.candidateSignalSummary);
  const draftSourcesSummary = normalizeDraftSourcesSummary(priority.draftSourcesSummary);
  const draftGapSummary = normalizeOptionalString(priority.draftGapSummary);
  const fallbackCommand = normalizeOptionalString(priority.fallbackCommand);
  const refreshIntakeCommand = normalizeOptionalString(priority.refreshIntakeCommand);
  const updateProfileCommand = normalizeOptionalString(priority.updateProfileCommand);
  const updateProfileAndRefreshCommand = normalizeOptionalString(priority.updateProfileAndRefreshCommand);
  const editPath = normalizeDraftPath(priority.editPath);
  const editPaths = normalizePathArray(priority.editPaths);
  const manifestInspectCommand = normalizeOptionalString(priority.manifestInspectCommand);
  const manifestImportCommand = normalizeOptionalString(priority.manifestImportCommand);
  const intakeManifestEntryTemplateTypes = normalizeStringArray(priority.intakeManifestEntryTemplateTypes);
  const intakeManifestEntryTemplateDetails = normalizeStarterTemplateDetails(priority.intakeManifestEntryTemplateDetails);
  const intakeManifestEntryTemplateRoot = normalizeDraftPath(priority.intakeManifestEntryTemplateRoot);
  const inspectCommand = normalizeOptionalString(priority.inspectCommand);
  const followUpCommand = normalizeOptionalString(priority.followUpCommand);
  const recommendedProfileSlices = normalizeRecommendedProfileSlices(priority);
  const paths = normalizePathArray(priority.paths) ?? [];

  return {
    ...priority,
    ...(latestMaterialAt ? { latestMaterialAt } : {}),
    ...(!latestMaterialAt && priority.latestMaterialAt !== undefined ? { latestMaterialAt: null } : {}),
    ...(latestMaterialId ? { latestMaterialId } : {}),
    ...(!latestMaterialId && priority.latestMaterialId !== undefined ? { latestMaterialId: null } : {}),
    ...(latestMaterialSourcePath ? { latestMaterialSourcePath } : {}),
    ...(!latestMaterialSourcePath && priority.latestMaterialSourcePath !== undefined ? { latestMaterialSourcePath: null } : {}),
    ...(refreshReasons ? { refreshReasons } : {}),
    ...(missingDrafts ? { missingDrafts } : {}),
    ...(rootThinReadySections ? { rootThinReadySections } : {}),
    ...(rootThinMissingSections ? { rootThinMissingSections } : {}),
    ...(rootHeadingAliases ? { rootHeadingAliases } : {}),
    ...(candidateSignalSummary ? { candidateSignalSummary } : {}),
    ...(!candidateSignalSummary && priority.candidateSignalSummary !== undefined ? { candidateSignalSummary: null } : {}),
    ...(draftSourcesSummary ? { draftSourcesSummary } : {}),
    ...(!draftSourcesSummary && priority.draftSourcesSummary !== undefined ? { draftSourcesSummary: null } : {}),
    ...(draftGapSummary ? { draftGapSummary } : {}),
    ...(!draftGapSummary && priority.draftGapSummary !== undefined ? { draftGapSummary: null } : {}),
    ...(fallbackCommand ? { fallbackCommand } : {}),
    ...(!fallbackCommand && priority.fallbackCommand !== undefined ? { fallbackCommand: null } : {}),
    ...(refreshIntakeCommand ? { refreshIntakeCommand } : {}),
    ...(!refreshIntakeCommand && priority.refreshIntakeCommand !== undefined ? { refreshIntakeCommand: null } : {}),
    ...(updateProfileCommand ? { updateProfileCommand } : {}),
    ...(!updateProfileCommand && priority.updateProfileCommand !== undefined ? { updateProfileCommand: null } : {}),
    ...(updateProfileAndRefreshCommand ? { updateProfileAndRefreshCommand } : {}),
    ...(!updateProfileAndRefreshCommand && priority.updateProfileAndRefreshCommand !== undefined ? { updateProfileAndRefreshCommand: null } : {}),
    ...(editPath ? { editPath } : {}),
    ...(!editPath && priority.editPath !== undefined ? { editPath: null } : {}),
    ...(editPaths ? { editPaths } : {}),
    ...(manifestInspectCommand ? { manifestInspectCommand } : {}),
    ...(!manifestInspectCommand && priority.manifestInspectCommand !== undefined ? { manifestInspectCommand: null } : {}),
    ...(manifestImportCommand ? { manifestImportCommand } : {}),
    ...(!manifestImportCommand && priority.manifestImportCommand !== undefined ? { manifestImportCommand: null } : {}),
    ...(intakeManifestEntryTemplateTypes ? { intakeManifestEntryTemplateTypes } : {}),
    ...(intakeManifestEntryTemplateDetails ? { intakeManifestEntryTemplateDetails } : {}),
    ...(intakeManifestEntryTemplateRoot ? { intakeManifestEntryTemplateRoot } : {}),
    ...(!intakeManifestEntryTemplateRoot && priority.intakeManifestEntryTemplateRoot !== undefined ? { intakeManifestEntryTemplateRoot: null } : {}),
    ...(inspectCommand ? { inspectCommand } : {}),
    ...(!inspectCommand && priority.inspectCommand !== undefined ? { inspectCommand: null } : {}),
    ...(followUpCommand ? { followUpCommand } : {}),
    ...(!followUpCommand && priority.followUpCommand !== undefined ? { followUpCommand: null } : {}),
    ...(recommendedProfileSlices ? { recommendedProfileSlices } : {}),
    paths,
  };
}

function hasActionablePrioritySurface(priority: WorkPriority): boolean {
  return Boolean(
    priority.nextAction
      || priority.command
      || priority.fallbackCommand
      || priority.refreshIntakeCommand
      || priority.updateProfileCommand
      || priority.updateProfileAndRefreshCommand
      || priority.editPath
      || priority.editPaths?.length
      || priority.manifestInspectCommand
      || priority.manifestImportCommand
      || priority.inspectCommand
      || priority.followUpCommand,
  );
}

function isActionableReadyPriority(priority: WorkPriority): boolean {
  return priority.status === 'ready' && hasActionablePrioritySurface(priority);
}

function isRunnablePriority(priority: WorkPriority): boolean {
  return Boolean(priority.command);
}

export class WorkLoop {
  intervalMinutes: number;
  objectives: string[];
  priorities: WorkPriority[];

  constructor({ intervalMinutes = 10, objectives = [], priorities = [] }: WorkLoopOptions = {}) {
    this.intervalMinutes = intervalMinutes;
    this.objectives = objectives;
    this.priorities = priorities;
  }

  summary(): WorkLoopSummary {
    const priorities = this.priorities.map((priority) => normalizePriority(priority));
    const readyPriorityCount = priorities.filter((priority) => priority.status === 'ready').length;
    const queuedPriorityCount = priorities.filter((priority) => priority.status === 'queued').length;
    const blockedPriorityCount = priorities.filter((priority) => priority.status === 'blocked').length;
    const leadingPriority = priorities[0] ?? null;
    const currentPriority = priorities.find((priority) => priority.status !== 'ready') ?? leadingPriority;
    const runnablePriority = priorities.find((priority) => isRunnablePriority(priority)) ?? null;
    const actionableReadyPriority = priorities.find((priority) => isActionableReadyPriority(priority)) ?? null;
    const recommendedPriority = priorities.find((priority) => priority.status !== 'ready' || isActionableReadyPriority(priority))
      ?? leadingPriority;

    return {
      intervalMinutes: this.intervalMinutes,
      objectiveCount: this.objectives.length,
      objectives: this.objectives,
      priorityCount: priorities.length,
      readyPriorityCount,
      queuedPriorityCount,
      blockedPriorityCount,
      leadingPriority,
      currentPriority,
      runnablePriority,
      actionableReadyPriority,
      recommendedPriority,
      priorities,
    };
  }
}

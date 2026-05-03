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

function normalizePriority(priority: WorkPriority): WorkPriority {
  const latestMaterialAt = normalizeOptionalString(priority.latestMaterialAt);
  const latestMaterialId = normalizeOptionalString(priority.latestMaterialId);
  const latestMaterialSourcePath = normalizeDraftPath(priority.latestMaterialSourcePath);

  return {
    ...priority,
    ...(latestMaterialAt ? { latestMaterialAt } : {}),
    ...(!latestMaterialAt && priority.latestMaterialAt !== undefined ? { latestMaterialAt: null } : {}),
    ...(latestMaterialId ? { latestMaterialId } : {}),
    ...(!latestMaterialId && priority.latestMaterialId !== undefined ? { latestMaterialId: null } : {}),
    ...(latestMaterialSourcePath ? { latestMaterialSourcePath } : {}),
    ...(!latestMaterialSourcePath && priority.latestMaterialSourcePath !== undefined ? { latestMaterialSourcePath: null } : {}),
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

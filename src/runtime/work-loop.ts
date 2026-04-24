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
  candidateSignalSummary?: string | null;
  draftGapSummary?: string | null;
  fallbackCommand?: string | null;
  refreshIntakeCommand?: string | null;
  editPath?: string | null;
  editPaths?: string[];
  manifestInspectCommand?: string | null;
  manifestImportCommand?: string | null;
  intakeManifestEntryTemplateTypes?: string[];
  intakeManifestEntryTemplateCount?: number;
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

function hasActionablePrioritySurface(priority: WorkPriority): boolean {
  return Boolean(
    priority.nextAction
      || priority.command
      || priority.fallbackCommand
      || priority.refreshIntakeCommand
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
    const readyPriorityCount = this.priorities.filter((priority) => priority.status === 'ready').length;
    const queuedPriorityCount = this.priorities.filter((priority) => priority.status === 'queued').length;
    const blockedPriorityCount = this.priorities.filter((priority) => priority.status === 'blocked').length;
    const leadingPriority = this.priorities[0] ?? null;
    const currentPriority = this.priorities.find((priority) => priority.status !== 'ready') ?? leadingPriority;
    const runnablePriority = this.priorities.find((priority) => isRunnablePriority(priority)) ?? null;
    const actionableReadyPriority = this.priorities.find((priority) => isActionableReadyPriority(priority)) ?? null;
    const recommendedPriority = this.priorities.find((priority) => priority.status !== 'ready' || isActionableReadyPriority(priority))
      ?? leadingPriority;

    return {
      intervalMinutes: this.intervalMinutes,
      objectiveCount: this.objectives.length,
      objectives: this.objectives,
      priorityCount: this.priorities.length,
      readyPriorityCount,
      queuedPriorityCount,
      blockedPriorityCount,
      leadingPriority,
      currentPriority,
      runnablePriority,
      actionableReadyPriority,
      recommendedPriority,
      priorities: this.priorities,
    };
  }
}

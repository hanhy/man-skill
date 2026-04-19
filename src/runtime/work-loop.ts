export interface WorkPriority {
  id: string;
  label: string;
  status: 'ready' | 'queued' | 'blocked';
  summary: string;
  nextAction: string | null;
  command: string | null;
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
  priorities: WorkPriority[];
}

export interface WorkLoopOptions {
  intervalMinutes?: number;
  objectives?: string[];
  priorities?: WorkPriority[];
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
      priorities: this.priorities,
    };
  }
}

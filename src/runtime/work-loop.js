export class WorkLoop {
  constructor({ intervalMinutes = 10, objectives = [] } = {}) {
    this.intervalMinutes = intervalMinutes;
    this.objectives = objectives;
  }

  summary() {
    return {
      intervalMinutes: this.intervalMinutes,
      objectiveCount: this.objectives.length,
      objectives: this.objectives,
    };
  }
}

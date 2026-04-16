export interface MemorySummary {
  shortTermEntries: number;
  longTermEntries: number;
}

export interface MemoryStoreOptions {
  shortTerm?: unknown[];
  longTerm?: unknown[];
}

export class MemoryStore {
  shortTerm: unknown[];
  longTerm: unknown[];

  constructor({ shortTerm = [], longTerm = [] }: MemoryStoreOptions = {}) {
    this.shortTerm = shortTerm;
    this.longTerm = longTerm;
  }

  addShortTerm(entry: unknown): void {
    this.shortTerm.push(entry);
  }

  addLongTerm(entry: unknown): void {
    this.longTerm.push(entry);
  }

  summary(): MemorySummary {
    return {
      shortTermEntries: this.shortTerm.length,
      longTermEntries: this.longTerm.length,
    };
  }
}

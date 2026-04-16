export interface MemorySummary {
  shortTermEntries: number;
  longTermEntries: number;
  totalEntries: number;
  shortTermPresent: boolean;
  longTermPresent: boolean;
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
    const shortTermEntries = this.shortTerm.length;
    const longTermEntries = this.longTerm.length;

    return {
      shortTermEntries,
      longTermEntries,
      totalEntries: shortTermEntries + longTermEntries,
      shortTermPresent: shortTermEntries > 0,
      longTermPresent: longTermEntries > 0,
    };
  }
}

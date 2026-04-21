export interface MemorySummary {
  dailyEntries: number;
  longTermEntries: number;
  scratchEntries: number;
  totalEntries: number;
  dailyPresent: boolean;
  longTermPresent: boolean;
  scratchPresent: boolean;
  shortTermEntries: number;
  shortTermPresent: boolean;
}

export interface MemoryStoreOptions {
  daily?: unknown[];
  shortTerm?: unknown[];
  longTerm?: unknown[];
  scratch?: unknown[];
}

export class MemoryStore {
  daily: unknown[];
  shortTerm: unknown[];
  longTerm: unknown[];
  scratch: unknown[];

  constructor({ daily, shortTerm, longTerm, scratch }: MemoryStoreOptions = {}) {
    this.daily = Array.isArray(daily) ? daily : Array.isArray(shortTerm) ? shortTerm : [];
    this.shortTerm = this.daily;
    this.longTerm = Array.isArray(longTerm) ? longTerm : [];
    this.scratch = Array.isArray(scratch) ? scratch : [];
  }

  addDaily(entry: unknown): void {
    this.daily.push(entry);
  }

  addShortTerm(entry: unknown): void {
    this.addDaily(entry);
  }

  addLongTerm(entry: unknown): void {
    this.longTerm.push(entry);
  }

  addScratch(entry: unknown): void {
    this.scratch.push(entry);
  }

  summary(): MemorySummary {
    const dailyEntries = this.daily.length;
    const longTermEntries = this.longTerm.length;
    const scratchEntries = this.scratch.length;

    return {
      dailyEntries,
      longTermEntries,
      scratchEntries,
      totalEntries: dailyEntries + longTermEntries + scratchEntries,
      dailyPresent: dailyEntries > 0,
      longTermPresent: longTermEntries > 0,
      scratchPresent: scratchEntries > 0,
      shortTermEntries: dailyEntries,
      shortTermPresent: dailyEntries > 0,
    };
  }
}

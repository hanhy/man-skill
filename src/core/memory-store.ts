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
  canonicalShortTermBucket: 'daily';
  legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'];
  readyBucketCount: number;
  totalBucketCount: number;
  populatedBuckets: string[];
  emptyBuckets: string[];
}

export interface MemoryStoreOptions {
  daily?: unknown[];
  shortTerm?: unknown[];
  longTerm?: unknown[];
  scratch?: unknown[];
}

export class MemoryStore {
  private _daily: unknown[];
  longTerm: unknown[];
  scratch: unknown[];

  constructor({ daily, shortTerm, longTerm, scratch }: MemoryStoreOptions = {}) {
    this._daily = Array.isArray(daily) ? daily : Array.isArray(shortTerm) ? shortTerm : [];
    this.longTerm = Array.isArray(longTerm) ? longTerm : [];
    this.scratch = Array.isArray(scratch) ? scratch : [];
  }

  get daily(): unknown[] {
    return this._daily;
  }

  set daily(entries: unknown[]) {
    this._daily = Array.isArray(entries) ? entries : [];
  }

  get shortTerm(): unknown[] {
    return this._daily;
  }

  set shortTerm(entries: unknown[]) {
    this.daily = entries;
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
    const populatedBuckets = [
      ...(dailyEntries > 0 ? ['daily'] : []),
      ...(longTermEntries > 0 ? ['long-term'] : []),
      ...(scratchEntries > 0 ? ['scratch'] : []),
    ];
    const emptyBuckets = [
      ...(dailyEntries === 0 ? ['daily'] : []),
      ...(longTermEntries === 0 ? ['long-term'] : []),
      ...(scratchEntries === 0 ? ['scratch'] : []),
    ];

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
      canonicalShortTermBucket: 'daily',
      legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
      readyBucketCount: populatedBuckets.length,
      totalBucketCount: 3,
      populatedBuckets,
      emptyBuckets,
    };
  }
}

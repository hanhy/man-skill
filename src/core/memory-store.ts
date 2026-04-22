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
  legacyShortTermSourceCount: number;
  legacyShortTermSources: string[];
  legacyShortTermSampleSources: string[];
  legacyShortTermSourceOverflowCount: number;
  readyBucketCount: number;
  totalBucketCount: number;
  populatedBuckets: string[];
  emptyBuckets: string[];
}

export interface MemoryStoreOptions {
  daily?: unknown[];
  shortTerm?: unknown[];
  legacyShortTerm?: string[];
  longTerm?: unknown[];
  scratch?: unknown[];
}

function normalizeLegacyShortTermSourcePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/');
}

export function normalizeLegacyShortTermSources(legacyShortTerm: unknown): string[] {
  if (!Array.isArray(legacyShortTerm)) {
    return [];
  }

  const normalizedSources: string[] = [];
  const seenSources = new Set<string>();

  legacyShortTerm.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }

    const normalizedValue = normalizeLegacyShortTermSourcePath(value);
    if (normalizedValue.length === 0 || seenSources.has(normalizedValue)) {
      return;
    }

    seenSources.add(normalizedValue);
    normalizedSources.push(normalizedValue);
  });

  return normalizedSources;
}

export class MemoryStore {
  private _daily: unknown[];
  longTerm: unknown[];
  scratch: unknown[];
  legacyShortTermSources: string[];

  constructor({ daily, shortTerm, legacyShortTerm, longTerm, scratch }: MemoryStoreOptions = {}) {
    this._daily = Array.isArray(daily) ? daily : Array.isArray(shortTerm) ? shortTerm : [];
    this.longTerm = Array.isArray(longTerm) ? longTerm : [];
    this.scratch = Array.isArray(scratch) ? scratch : [];
    this.legacyShortTermSources = normalizeLegacyShortTermSources(legacyShortTerm);
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

  private buildLegacyShortTermPreview(limit = 3): { sampleSources: string[]; overflowCount: number } {
    const sampleSources = this.legacyShortTermSources.slice(0, limit);
    return {
      sampleSources,
      overflowCount: Math.max(this.legacyShortTermSources.length - sampleSources.length, 0),
    };
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
    const legacyShortTermPreview = this.buildLegacyShortTermPreview();

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
      legacyShortTermSourceCount: this.legacyShortTermSources.length,
      legacyShortTermSources: [...this.legacyShortTermSources],
      legacyShortTermSampleSources: legacyShortTermPreview.sampleSources,
      legacyShortTermSourceOverflowCount: legacyShortTermPreview.overflowCount,
      readyBucketCount: populatedBuckets.length,
      totalBucketCount: 3,
      populatedBuckets,
      emptyBuckets,
    };
  }
}

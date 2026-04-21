export class MemoryStore {
  constructor({ daily, shortTerm, legacyShortTerm, longTerm, scratch } = {}) {
    this._daily = Array.isArray(daily) ? daily : Array.isArray(shortTerm) ? shortTerm : [];
    this.longTerm = Array.isArray(longTerm) ? longTerm : [];
    this.scratch = Array.isArray(scratch) ? scratch : [];
    this.legacyShortTermSources = Array.isArray(legacyShortTerm)
      ? legacyShortTerm.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : [];
  }

  get daily() {
    return this._daily;
  }

  set daily(entries) {
    this._daily = Array.isArray(entries) ? entries : [];
  }

  get shortTerm() {
    return this._daily;
  }

  set shortTerm(entries) {
    this.daily = entries;
  }

  addDaily(entry) {
    this.daily.push(entry);
  }

  addShortTerm(entry) {
    this.addDaily(entry);
  }

  addLongTerm(entry) {
    this.longTerm.push(entry);
  }

  addScratch(entry) {
    this.scratch.push(entry);
  }

  buildLegacyShortTermPreview(limit = 3) {
    const sampleSources = this.legacyShortTermSources.slice(0, limit);
    return {
      sampleSources,
      overflowCount: Math.max(this.legacyShortTermSources.length - sampleSources.length, 0),
    };
  }

  summary() {
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

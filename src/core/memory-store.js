export class MemoryStore {
  constructor({ daily, shortTerm, longTerm, scratch } = {}) {
    this._daily = Array.isArray(daily) ? daily : Array.isArray(shortTerm) ? shortTerm : [];
    this.longTerm = Array.isArray(longTerm) ? longTerm : [];
    this.scratch = Array.isArray(scratch) ? scratch : [];
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

  summary() {
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
      canonicalShortTermBucket: 'daily',
      legacyShortTermAliases: ['shortTermEntries', 'shortTermPresent'],
    };
  }
}

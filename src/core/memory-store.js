export class MemoryStore {
  constructor({ shortTerm = [], longTerm = [] } = {}) {
    this.shortTerm = shortTerm;
    this.longTerm = longTerm;
  }

  addShortTerm(entry) {
    this.shortTerm.push(entry);
  }

  addLongTerm(entry) {
    this.longTerm.push(entry);
  }

  summary() {
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

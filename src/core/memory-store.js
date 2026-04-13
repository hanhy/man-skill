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
    return {
      shortTermEntries: this.shortTerm.length,
      longTermEntries: this.longTerm.length,
    };
  }
}

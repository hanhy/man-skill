export class BaseRegistry {
  constructor(items = []) {
    this.items = [];
    items.forEach((item) => this.register(item));
  }

  normalize(item) {
    return item;
  }

  getKey(item) {
    if (typeof item === 'string') {
      return item;
    }

    return item?.id ?? item?.name ?? JSON.stringify(item);
  }

  register(item) {
    const normalized = this.normalize(item);
    const key = this.getKey(normalized);
    const existingIndex = this.items.findIndex((entry) => this.getKey(entry) === key);

    if (existingIndex >= 0) {
      this.items[existingIndex] = normalized;
      return normalized;
    }

    this.items.push(normalized);
    return normalized;
  }

  list() {
    return [...this.items];
  }

  count() {
    return this.items.length;
  }
}

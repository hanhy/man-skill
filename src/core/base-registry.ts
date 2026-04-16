export class BaseRegistry<TItem> {
  items: TItem[];

  constructor(items: TItem[] = []) {
    this.items = [];
    items.forEach((item) => this.register(item));
  }

  normalize(item: TItem): TItem {
    return item;
  }

  getKey(item: TItem): string {
    if (typeof item === 'string') {
      return item;
    }

    if (item && typeof item === 'object') {
      const keyedItem = item as { id?: string; name?: string };
      return keyedItem.id ?? keyedItem.name ?? JSON.stringify(item);
    }

    return JSON.stringify(item);
  }

  register(item: TItem): TItem {
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

  list(): TItem[] {
    return [...this.items];
  }

  count(): number {
    return this.items.length;
  }
}

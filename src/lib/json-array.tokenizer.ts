export class JsonArrayTokenizer {
  constructor(private readonly isPretty = false) {}

  get open(): string {
    return this.isPretty ? '[\n' : '[';
  }

  get close(): string {
    return this.isPretty ? '\n]' : ']';
  }

  delimiter(isFirst = false): string {
    if (isFirst) {
      return '';
    }
    return this.isPretty ? ',\n' : ',';
  }
}

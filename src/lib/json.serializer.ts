export class JsonSerializer {
  constructor(private readonly isPretty: boolean) {}

  serialize(data: unknown): string {
    if (this.isPretty) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }
}

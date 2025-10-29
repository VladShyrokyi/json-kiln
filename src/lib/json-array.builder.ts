import { Writer } from './writer';
import { JsonArrayTokenizer } from './json-array.tokenizer';

export class JsonArrayBuilder {
  private bytesWritten = 0;
  private itemsAdded = 0;
  private isFirstItem = true;
  private isOpen = false;

  constructor(
    private readonly writer: Writer,
    private readonly tokenizer: JsonArrayTokenizer,
  ) {}

  get size(): number {
    return this.bytesWritten;
  }

  get count(): number {
    return this.itemsAdded;
  }

  async open(): Promise<void> {
    this.isFirstItem = true;
    const content = this.tokenizer.open;
    await this.write(content);
    this.isOpen = true;
  }

  async close(): Promise<void> {
    if (!this.isOpen) {
      throw new Error('JsonArrayBuilder is not open');
    }
    this.isOpen = false;
    await this.write(this.tokenizer.close);
  }

  async push(item: string): Promise<void> {
    if (!this.isOpen) {
      throw new Error('JsonArrayBuilder is not open');
    }
    await this.write(this.prefixForNextItem() + item);
    if (this.isFirstItem) {
      this.isFirstItem = false;
    }
    this.itemsAdded += 1;
  }

  private async write(s: string): Promise<void> {
    const bytes = await this.writer.write(s);
    this.bytesWritten += bytes;
  }

  private prefixForNextItem(): string {
    return this.tokenizer.delimiter(this.isFirstItem);
  }
}

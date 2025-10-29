import { Writer } from './writer';
import { JsonArrayTokenizer } from './json-array.tokenizer';

export class JsonPlanner {
  constructor(
    private readonly targetSize: number,
    private readonly minItemSize: number,
    private readonly tokenizer: JsonArrayTokenizer,
    private readonly writer: Writer,
  ) {}

  getTotalSize(size: number): number {
    const close = this.getCloserSize();
    return size + close;
  }

  getSizeWithNextItem(size: number, count: number, itemSize: number): number {
    const prefix = this.getPrefixItemSize(count);
    const close = this.getCloserSize();
    return size + prefix + itemSize + close;
  }

  getSoftSizeForItem(size: number, count: number, targetCount: number, minItemSize: number): number {
    const remainingItems = targetCount - count;
    const remainingBudget = this.getRemainingSize(size, count);
    if (remainingItems <= 1) {
      return Math.max(0, remainingBudget);
    }
    return Math.max(minItemSize, Math.floor(remainingBudget / remainingItems));
  }

  getRemainingSize(size: number, count: number): number {
    const prefix = this.getPrefixItemSize(count);
    const close = this.getCloserSize();
    return this.targetSize - size - prefix - close;
  }

  private getPrefixItemSize(currentItems: number): number {
    if (currentItems <= 0) {
      return 0;
    }
    return this.writer.count(this.tokenizer.delimiter());
  }

  private getCloserSize(): number {
    return this.writer.count(this.tokenizer.close);
  }
}

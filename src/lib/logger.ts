import { stringifySize } from './utils';

export class Logger {
  private startTs: number = 0;

  constructor(
    private readonly isEnabledProgress: boolean,
    private readonly isInteractive: boolean,
    private readonly sizeTarget: number,
  ) {}

  start() {
    this.startTs = Date.now();
    this.progress(0, 0);
  }

  end(size: number, items: number) {
    this.progress(size, items);
    this.clearLine();
  }

  progress(size: number, items: number) {
    if (!this.isEnabledProgress) {
      return;
    }
    const line = this.render(size, items);
    this.print(line);
  }

  log(message: string) {
    this.clearLine();
    this.print(message);
  }

  warn(message: string) {
    this.clearLine();
    process.stderr.write(`WARNING: ${message}\n`);
  }

  private render(size: number, items: number): string {
    const now = Date.now();
    const start = this.startTs;

    const elapsed = Math.max(1, (now - start) / 1000);

    const total = this.sizeTarget;

    const percent = Math.min(100, (size / this.sizeTarget) * 100);
    const speed = size / elapsed;
    const sizeRemained = Math.max(0, this.sizeTarget - size);
    const eta = speed > 0 ? sizeRemained / speed : Infinity;

    const barWidth = 24;
    const barWidthFilled = Math.round((percent / 100) * barWidth);
    const bar = `[${'#'.repeat(barWidthFilled)}${'.'.repeat(barWidth - barWidthFilled)}]`;

    const percentFormatted = `${percent.toFixed(1)}%`;
    const sizeByTotalFormatted = `${stringifySize(size)} / ${stringifySize(total)}`;
    const speedFormatted = `${stringifySize(speed)}/s`;
    const etaFormatted = eta === Infinity ? '∞' : `${Math.ceil(eta)}s`;

    return `${bar} ${percentFormatted}  ${sizeByTotalFormatted}  items:${items}  speed:${speedFormatted}  ETA:${etaFormatted}`;
  }

  private print(line: string) {
    if (this.isInteractive) {
      process.stderr.write('\r' + line + '   ' + '\n');
    } else {
      process.stderr.write(line + '\n');
    }
  }

  private clearLine() {
    if (this.isInteractive) {
      process.stderr.write('\r' + ' '.repeat(80) + '\r');
    }
  }
}

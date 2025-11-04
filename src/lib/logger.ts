import * as rl from 'node:readline';
import { stringifySize } from './utils';
import { Logger } from '../index';

/**
 * @internal
 */
export class ReadLineLogger implements Logger {
  private startTs: number = 0;
  private lastSize: number = 0;
  private lastItems: number = 0;
  private hasEnded = false;

  constructor(
    private readonly isEnabledProgress: boolean,
    private readonly isInteractive: boolean,
    private readonly sizeTarget: number,
  ) {}

  start() {
    this.startTs = Date.now();
    this.log('Starting...');
    this.progress(0, 0);
  }

  end(isSuccess: boolean = true) {
    if (this.hasEnded) {
      return;
    }
    this.hasEnded = true;

    this.progress(this.lastSize, this.lastItems);
    if (this.isInteractive) {
      this.newLine();
    }
    if (!isSuccess) {
      return;
    }
    const elapsed = Date.now() - this.startTs;
    this.log(`Done! ${stringifySize(this.lastSize)} written by ${this.formatTime(elapsed)}.`);
  }

  progress(size: number, items: number) {
    this.lastSize = size;
    this.lastItems = items;
    if (!this.isEnabledProgress) {
      return;
    }
    const line = this.render(size, items);
    this.print(line);
  }

  log(msg: string) {
    this.print(msg, true);
  }

  warn(msg: string) {
    this.print(`WARNING: ${msg}`, true);
  }

  error(msg: string) {
    this.print(`ERROR: ${msg}`, true);
  }

  private print(line: string, isNewLine = false) {
    if (this.isInteractive) {
      rl.clearLine(process.stderr, 0);
      rl.cursorTo(process.stderr, 0);
      process.stderr.write(isNewLine ? line + '\n' : line);
    } else {
      process.stderr.write(line + '\n');
    }
  }

  private newLine() {
    if (this.isInteractive) {
      process.stderr.write('\n');
    }
  }

  private clearLine() {
    if (this.isInteractive) {
      rl.clearLine(process.stderr, 0);
      rl.cursorTo(process.stderr, 0);
    }
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
    const totalFormatted = stringifySize(total);
    const sizeByTotalFormatted = `${stringifySize(size).padStart(totalFormatted.length, ' ')} / ${totalFormatted}`;
    const speedFormatted = `${stringifySize(speed)}/s`;
    const etaFormatted = eta === Infinity ? '∞' : `${Math.ceil(eta)}s`;

    return `${bar} ${percentFormatted}  ${sizeByTotalFormatted}  items:${items}  speed:${speedFormatted}  ETA:${etaFormatted}`;
  }

  private formatTime(time: number): string {
    let remainingSeconds = Math.max(1, time / 1000);

    const days = Math.floor(remainingSeconds / 86400);
    remainingSeconds -= days * 86400;
    const hours = Math.floor(remainingSeconds / 3600);
    remainingSeconds -= hours * 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    remainingSeconds -= minutes * 60;
    const seconds = Math.floor(remainingSeconds);
    let formattedTime = '';
    if (days > 0) {
      formattedTime += `${days}d`;
    }
    if (hours > 0) {
      formattedTime += `${hours}h`;
    }
    if (minutes > 0) {
      formattedTime += `${minutes}m`;
    }
    formattedTime += `${seconds}s`;

    return formattedTime;
  }
}

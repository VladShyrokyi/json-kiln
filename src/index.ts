export interface Logger {
  start(): void;
  progress(size: number, items: number): void;
  end(isSuccess: boolean): void;

  log(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface GenerateOptions {
  size: number;
  depth?: number;
  items?: number;
  minItemSize?: number;
  exact?: boolean;
  oid?: boolean;
  seed?: number;
  pretty?: boolean;
  logger?: Logger;

  encoding?: BufferEncoding;
}

export { generateStream } from './lib/generate';
export { parseSize } from './lib/utils';

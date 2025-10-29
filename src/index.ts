export interface GenerateOptions {
  size: number;
  depth?: number;
  items?: number;
  minItemSize?: number;
  exact?: boolean;
  oid?: boolean;
  seed?: number;
  pretty?: boolean;
  progress?: boolean;

  encoding?: BufferEncoding;
}

export { generateStream } from './lib/generate';
export { parseSize } from './lib/utils';

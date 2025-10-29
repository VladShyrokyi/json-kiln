import { generateStream } from './lib/generate';
import * as fs from 'node:fs';
import { parseSize } from './lib/utils';

function parseArgs(argv: string[]) {
  const out: Record<string, string | number | boolean> = {};
  const stack: string[] = [];
  for (const a of argv) {
    if (a.startsWith('--')) {
      if (stack.length) {
        const key = stack.pop()!;
        out[key] = true;
      }
      const eq = a.indexOf('=');
      if (eq !== -1) {
        // --key=val
        const key = a.slice(2, eq);
        const val = a.slice(eq + 1);
        out[key] = val;
      } else {
        // --key val  OR  --flag
        const key = a.slice(2);
        stack.push(key);
      }
    } else if (stack.length) {
      const key = stack.pop()!;
      out[key] = a ?? true;
    }
  }
  return out;
}

function help() {
  console.log(`json-kiln

Usage:
  json-kiln --size=500MB [--depth=3] [--items=2] [--minItemSize=200MB] [--exact] [--oid] [--seed=42] [--pretty] [--progress] [--out=./file.json]

Options:
  --size            Target file size (bytes) or human string: B|KB|MB|GB
  --depth           Max nesting depth (default 3)
  --items           Fixed number of array elements
  --minItemSize     Per-item minimum serialized size
  --exact           Force exact final file size (pad last element)
  --oid             Use EJSON {_id:{$oid}} instead of id
  --seed            Deterministic RNG seed
  --pretty          Pretty-print JSON
  --progress        Print progress bar to stderr
  --out             Output file (default stdout)

Examples:
  json-kiln --size 200MB --items 1 --minItemSize 200MB --exact --out one.json
  json-kiln --size 500MB --items 2 --minItemSize 200MB --exact --progress --out two.json
`);
}

const availableArgs = [
  'size',
  'depth',
  'items',
  'minItemSize',
  'exact',
  'oid',
  'seed',
  'pretty',
  'progress',
  'out',
  'help',
];

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (!argv.size || argv.help) {
    return help();
  }

  for (const key of Object.keys(argv)) {
    if (!availableArgs.includes(key)) {
      console.error(`Unknown argument: --${key}`);
      return help();
    }
  }

  const size = parseSize(String(argv.size));
  const depth = Number(argv.depth ?? 3);
  const items = argv.items !== undefined ? Number(argv.items) : undefined;
  const minItemSize = argv.minItemSize !== undefined ? parseSize(String(argv.minItemSize)) : undefined;

  const encoding: BufferEncoding = 'utf8';
  const outPath = typeof argv.out === 'string' ? argv.out : undefined;
  const outStream = outPath ? fs.createWriteStream(outPath, { encoding }) : process.stdout;

  await generateStream(outStream, {
    size,
    depth,
    items,
    minItemSize,
    exact: Boolean(argv.exact),
    oid: Boolean(argv.oid),
    seed: argv.seed !== undefined ? Number(argv.seed) : undefined,
    pretty: Boolean(argv.pretty),
    progress: Boolean(argv.progress),
    encoding,
  });

  if (outStream !== process.stdout) {
    await new Promise<void>((res) => (outStream as fs.WriteStream).end(res));
  }
}

main().catch((err) => {
  console.error('Failed:', err?.stack || err);
  process.exit(1);
});

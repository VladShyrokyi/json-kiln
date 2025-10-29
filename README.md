# json-kiln

Streaming JSON array generator by **target size (bytes)** with **constant memory usage**.  
Features: exact final file size, per-item minimum size, deterministic output, EJSON `_id.$oid`, progress, Docker image, and CLI-friendly defaults.

> Bake JSON arrays to an exact size with streaming heat and zero OOM.

---

## Contents

- [Why](#why)
- [Features](#features)
- [Install](#install)
- [Quick start](#quick-start)
- [CLI](#cli)
- [Typical recipes](#typical-recipes)
- [Docker](#docker)
- [Library API (Node.js)](#library-api-nodejs)
- [Performance notes](#performance-notes)
- [Validation & tests](#validation--tests)
- [Limitations](#limitations)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Why

Most mock-data tools optimize for _shape_ (schemas), not for exact **file size**.  
`json-kiln` focuses on **byte budget and streaming**:

- Generate 100 MB, 500 MB, 5 GB JSON **without** keeping the full array in RAM.
- Guarantee **per-item minimum size** (e.g., each element ≥ 200 MB for edge-case testing).
- Make the whole file match the **exact target size** via a smart `pad` field on the last element.
- Deterministic output with `--seed`.

---

## Features

- ✅ **Target file size in bytes**: `--size 500MB`
- ✅ **Streaming output** (no full-array buffering, backpressure-aware)
- ✅ **Per-item minimum size**: `--minItemSize 200MB`
- ✅ **Exact final size**: `--exact` pads the last element to match the target
- ✅ **Deterministic** via `--seed`
- ✅ **EJSON** `_id: { "$oid": "…" }` via `--oid`
- ✅ **TTY progress bar**: `--progress`
- ✅ **Pretty-print** option
- ✅ **Docker image** and **npm CLI**

---

## Install

### npm (CLI)

```bash
npm i -g json-kiln
# or locally
npm i -D json-kiln
```

Now you have a `json-kiln` CLI (alias `jk` if linked).

### Docker

```bash
docker pull shyrokyivladislav/json-kiln:latest
```

---

## Quick start

Generate a 200 MB file with a **single element**:

```bash
json-kiln --size 200MB --items 1 --minItemSize 200MB --exact --progress --out one-200mb.json
```

Generate a 500 MB file with **two elements**, each ≥ 200 MB:

```bash
json-kiln --size 500MB --items 2 --minItemSize 200MB --exact --progress --out two-250mb.json
```

Stream to gzip (no temporary files):

```bash
json-kiln --size 2GB --depth 5 --progress | gzip > data.json.gz
```

Generate with EJSON ObjectId and deterministic output:

```bash
json-kiln --size 300MB --oid --seed 1337 --progress --out dataset.json
```

---

## CLI

```
json-kiln [options]

Options:
  --size=VALUE         Target file size (bytes). Supports B|KB|MB|GB (e.g., 500MB, 1GB).
  --depth=N            Max nesting depth (default: 3, range: 0..12).
  --items=N            Fixed number of array elements. If omitted, generator fills by size.
  --minItemSize=VALUE  Per-item minimum size in bytes (B|KB|MB|GB). Each element is padded
                       to be at least this long. With --items, helps split the budget.
  --exact              Force exact final file size by padding the last element's "pad" field.
  --oid                Use EJSON-style id: { "_id": { "$oid": "<24-hex>" } }.
                       Default is string "id": "cfg_<i>_<oid>".
  --seed=N             Deterministic RNG seed (number).
  --pretty             Pretty-print JSON (more readable, larger output).
  --progress           Show single-line progress bar on TTY, log lines on non-TTY.
  --out=PATH           Write to file. Default is stdout.

Short alias (if enabled): `jk`
```

**Exit codes**

- `0` success
- `1` invalid arguments or I/O error

---

## Typical recipes

### 1) Single element ≈ 200 MB

```bash
json-kiln --size 200MB --items 1 --minItemSize 200MB --exact --out one-200mb.json
```

### 2) 500 MB total, two elements, each ≥ 200 MB

```bash
json-kiln --size 500MB --items 2 --minItemSize 200MB --exact --out twox250mb.json
```

### 3) Big file with streaming and gzip

```bash
json-kiln --size 5GB --depth 5 --progress | gzip > five-gigs.json.gz
```

### 4) Deterministic dataset with EJSON and pretty-print

```bash
json-kiln --size 120MB --depth 4 --oid --seed 42 --pretty --out demo.json
```

---

## Docker

Run with output file mounted to a volume:

```bash
docker run --rm -it \
  -v "$PWD:/out" \
  shyrokyivladislav/json-kiln:latest \
  --size 500MB --items 2 --minItemSize 200MB --exact --progress --out /out/twox250mb.json
```

Pipe to gzip in container:

```bash
docker run --rm -i shyrokyivladislav/json-kiln:latest \
  --size 2GB --depth 5 --progress | gzip > data.json.gz
```

---

## Library API (Node.js)

```ts
import { generateStream } from 'json-kiln';

const fs = await import('node:fs');

const stream = fs.createWriteStream('data.json', { encoding: 'utf8' });
await generateStream(stream, {
  size: '500MB', // string or number (bytes)
  depth: 4,
  items: 2,
  minItemSize: '200MB', // string or number (bytes)
  exact: true,
  oid: true,
  seed: 1337,
  pretty: false,
  progress: true, // progress to stderr
});
// resolves when stream is finished
```

**Options (library)** mirror CLI flags. String sizes (`"200MB"`) or numeric bytes are accepted. `generateStream` respects backpressure and never buffers the full array.

---

## Performance notes

- **Streaming**: output is written incrementally. Memory stays near the size of a single element string plus small buffers.
- **Backpressure-aware**: waits for `drain` when writing to slow destinations (stdout, filesystems, pipes).
- **Pretty-print** (`--pretty`) increases file size and CPU due to whitespace; disable for tighter packing and maximum throughput.
- **Depth** increases natural content size and variety; for larger elements with less padding, raise `--depth`.

---

## Validation & tests

Recommended quick checks:

```bash
# Validate JSON shape
jq -e type < data.json > /dev/null

# Verify array length (count elements)
jq length < data.json

# Check file size (exactness)
stat -f%z data.json   # macOS
stat --format=%s data.json  # Linux
```

CI suggestions:

- Unit tests: id format, deterministic seed, pad logic, exact-size contract.
- Integration: generate big file (e.g., 2 GB) with RSS cap check (e.g., < 200 MB).

---

## Limitations

- Padding is implemented as a `"pad"` string field on elements. This is valid JSON and easy to strip if needed.
- EJSON `_id.$oid` is syntactic, not a real MongoDB `ObjectId` type. For test data it is sufficient.
- Exact-size fit uses binary search plus small linear tuning; for extreme constraints and `--pretty` it may fail to hit exact size for intermediate elements. Final exactness is always enforced with `--exact` on the last element.

---

## FAQ

**Q: How is `json-kiln` different from schema faker tools?**

A: We focus on **size** and **streaming**, not schema contract. Needing `exactly 500 MB'' or `each item ≥ 200 MB'' is our zone.

**Q: Can we reduce ``pad'' part?**

A: Yes. Increase `--depth`' to make the content naturally heavier; or raise `--minItemSize`' and allocate budget via `--items`.

**Q: Is it safe for CI?**

A: Yes. The process does not keep the entire array in memory, works with backpressure, progress and logging go to `stderr`.

---

## Contributing

1. Fork & clone
2. `npm i`
3. `npm run build`
4. `npm run test`
5. PR with a short description of motivation

Please follow the code style and add tests for public changes.

---

## License

MIT © You. See [LICENSE](./LICENSE).

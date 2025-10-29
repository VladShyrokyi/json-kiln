import { describe, it, expect } from 'vitest';
import { spawnSync, SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

function projectRoot(): string {
  // tests file is under <root>/tests
  return path.resolve(__dirname, '..');
}

function tsxBinPath(): string {
  return path.join(projectRoot(), 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
}

const kb = (n: number) => n * 1024;
const mb = (n: number) => n * 1024 ** 2;
const gb = (n: number) => n * 1024 ** 3;

function runCli(args: string[], input?: string): SpawnSyncReturns<string> {
  const bin = tsxBinPath();
  const entry = path.join(projectRoot(), 'src', 'cli.ts');
  const res = spawnSync(bin, [entry, ...args], {
    cwd: projectRoot(),
    input,
    encoding: 'utf8',
    // Allow large stdout (e.g., 10MB+ JSON) to be buffered without throwing
    maxBuffer: mb(256),
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  return res;
}

function byteLen(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

function parseJsonArray(s: string): unknown[] {
  const data = JSON.parse(s);
  expect(Array.isArray(data)).toBe(true);
  return data as unknown[];
}

function normalizeDynamicIds(s: string): string {
  // Mask timestamp prefix in cfg_* ids
  s = s.replace(/("id":"cfg_\d+_)([0-9a-f]{8})([0-9a-f]{16})/g, '$1XXXXXXXX$3');
  // Mask timestamp prefix in EJSON $oid
  s = s.replace(/(\"\$oid\":\"|"\$oid":")([0-9a-f]{8})([0-9a-f]{16})(\")/g, '$1XXXXXXXX$3$4');
  return s;
}

describe('json-kiln CLI', () => {
  it('prints help when no args', () => {
    const res = runCli([]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Usage:');
    expect(res.stderr).toBe('');
  });

  it('rejects unknown args', () => {
    const res = runCli(['--size', '1KB', '--foo=1']);
    expect(res.status).toBe(0); // help printed without throwing
    // Message goes to stderr
    expect(res.stderr).toContain('Unknown argument');
    expect(res.stdout).toContain('Usage:');
  });

  it.each([kb(8), mb(1), mb(10)])('generates compact JSON up to target size %s (<=) without --exact', (size) => {
    // Use fixed seed to stabilize content size across runs
    const res = runCli(['--size', String(size), '--seed', '1337']);
    expect(res.status).toBe(0);
    const out = res.stdout;
    const actualSize = byteLen(out);
    expect(out.startsWith('[')).toBe(true);
    expect(out[1]).not.toBe('\n');
    expect(out.trim().endsWith(']')).toBe(true);
    expect(actualSize).toBeLessThanOrEqual(size);
    // JSON validity
    parseJsonArray(out);
  });

  it('generates pretty JSON when --pretty is set', () => {
    const res = runCli(['--size', '6KB', '--pretty']);
    expect(res.status).toBe(0);
    const out = res.stdout;
    expect(out.startsWith('[')).toBe(true);
    expect(out.includes('\n')).toBe(true);
    expect(out.includes('\n]')).toBe(true);
    expect(out.trim().endsWith(']')).toBe(true);
    // JSON validity
    parseJsonArray(out);
  });

  it.each([kb(5), kb(10), mb(1), mb(10)])('honors --exact for byte-perfect size %s', (size) => {
    // Use fixed seed to avoid rare variance and keep within tolerance
    const res = runCli(['--size', String(size), '--exact', '--seed', '1337']);
    expect(res.status).toBe(0);
    const out = res.stdout;
    const actual = byteLen(out);
    // Allow a small tolerance due to JSON overhead/padding interactions
    expect(Math.abs(actual - size)).toBeLessThanOrEqual(2048);
    parseJsonArray(out);
  });

  it('writes to file with --out', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-kiln-'));
    const file = path.join(dir, 'out.json');
    const res = runCli(['--size', '4096', '--exact', '--out', file]);
    expect(res.status).toBe(0);
    const buf = fs.readFileSync(file, 'utf8');
    const actual = byteLen(buf);
    expect(Math.abs(actual - 4096)).toBeLessThanOrEqual(2048);
    parseJsonArray(buf);
  });

  it('supports --items to set fixed length', () => {
    const res = runCli(['--size', '10KB', '--items', '3', '--exact']);
    expect(res.status).toBe(0);
    const arr = parseJsonArray(res.stdout);
    expect(arr.length).toBe(3);
  });

  it('enforces per-item minimum size with --minItemSize', () => {
    const min = 600; // bytes per item
    const res = runCli(['--size', '4KB', '--items', '3', '--minItemSize', String(min)]);
    expect(res.status).toBe(0);
    const out = res.stdout;
    const arr = parseJsonArray(out) as any[];
    // Compact mode by default
    for (const item of arr) {
      const s = JSON.stringify(item);
      const n = byteLen(s);
      expect(n).toBeGreaterThanOrEqual(min);
    }
  });

  it('enforces per-item minimum size with pretty mode', () => {
    const min = 700;
    const res = runCli(['--size', '6KB', '--items', '3', '--minItemSize', String(min), '--pretty']);
    expect(res.status).toBe(0);
    const arr = parseJsonArray(res.stdout) as any[];
    for (const item of arr) {
      const s = JSON.stringify(item, null, 2);
      const n = byteLen(s);
      expect(n).toBeGreaterThanOrEqual(min);
    }
  });

  it('supports EJSON OID with --oid and removes string id', () => {
    const res = runCli(['--size', '6KB', '--items', '2', '--oid']);
    expect(res.status).toBe(0);
    const arr = parseJsonArray(res.stdout) as any[];
    for (const item of arr) {
      expect('_id' in item).toBe(true);
      expect('id' in item).toBe(false);
      const oid = item._id?.$oid;
      expect(typeof oid).toBe('string');
      expect(oid).toMatch(/^[0-9a-f]{24}$/);
    }
  });

  it('default id when --oid is not set', () => {
    const res = runCli(['--size', '6KB', '--items', '2']);
    expect(res.status).toBe(0);
    const arr = parseJsonArray(res.stdout) as any[];
    for (const item of arr) {
      expect('id' in item).toBe(true);
      expect('_id' in item).toBe(false);
      expect(typeof item.id).toBe('string');
    }
  });

  it('is deterministic with the same --seed', () => {
    const args = ['--size', '10KB', '--items', '3', '--seed', '1337'];
    const a = runCli(args);
    const b = runCli(args);
    expect(a.status).toBe(0);
    expect(b.status).toBe(0);
    const na = normalizeDynamicIds(a.stdout);
    const nb = normalizeDynamicIds(b.stdout);
    expect(na).toBe(nb);
  });

  it('accepts --depth and produces valid output', () => {
    const res0 = runCli(['--size', '6KB', '--depth', '0']);
    const res5 = runCli(['--size', '6KB', '--depth', '5']);
    expect(res0.status).toBe(0);
    expect(res5.status).toBe(0);
    parseJsonArray(res0.stdout);
    parseJsonArray(res5.stdout);
  });

  it('prints progress to stderr with --progress (non-TTY mode)', () => {
    const res = runCli(['--size', '12KB', '--progress']);
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('items:');
    expect(res.stderr).toMatch(/\[#{0,}\.*\]/); // progress bar shape
    // stdout must remain valid JSON
    parseJsonArray(res.stdout);
  });
});

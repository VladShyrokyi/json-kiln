export function clampInt(n: number, min: number, max: number): number {
  const x = Math.floor(Number(n));
  return Math.min(max, Math.max(min, Number.isFinite(x) ? x : min));
}

export function parseSize(s: string): number {
  const m = String(s)
    .trim()
    .toUpperCase()
    .match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/);
  if (!m) {
    return Number(s);
  }
  const n = Number(m[1]);
  const unit = m[2] ?? 'B';
  const mul = unit === 'GB' ? 1024 ** 3 : unit === 'MB' ? 1024 ** 2 : unit === 'KB' ? 1024 : 1;
  return Math.floor(n * mul);
}

export function stringifySize(n: number): string {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0,
    x = n;
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(x >= 10 || i === 0 ? 0 : 1)}${u[i]}`;
}

/** Dot-path utils */
export function getByPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc: any, key) => (acc == null ? undefined : acc[key]), obj);
}

export function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Convert from '*' to a fixed value
// Only works with one star per path (max)
export function readForPath(report: any, dotPath: string, idx: number): unknown {
  const parts = dotPath.split(".");
  const starIdx = parts.indexOf("*");
  const finalPath =
    starIdx === -1
      ? dotPath /* no star */
      : [...parts.slice(0, starIdx), idx, ...parts.slice(starIdx + 1)].join(".");
  return getByPath(report, finalPath);
}

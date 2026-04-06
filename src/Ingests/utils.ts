// src/Ingests/utils.ts
/** Dot-path utils */
export function getByPath(obj: any, path: string): unknown {
  return path
    .split(".")
    .reduce((acc: any, key) => (acc == null ? undefined : acc[key]), obj);
}


//Recomendacao de mudanca do copilot, achei que faz sentido e serve como registro para futuros problemas :)
export function toNum(v: unknown): number | null {
  // Keep "missing data" as null (do not convert to fake zero)
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;

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
      ? dotPath
      : [...parts.slice(0, starIdx), idx, ...parts.slice(starIdx + 1)].join(".");
  return getByPath(report, finalPath);
}

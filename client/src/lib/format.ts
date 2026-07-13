export function fmtDuration(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function fmtRelative(ms: number, now: number): string {
  const diff = now - ms;
  if (diff < 45_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.round(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.round(diff / 3_600_000)} h`;
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return `il y a ${days} j`;
  return new Date(ms).toLocaleDateString("fr-FR");
}

export function summarize(record: { attributes: Record<string, string | number | boolean> }): string {
  const entries = Object.entries(record.attributes || {}).filter(([k]) => k !== "job.name");
  return entries.map(([k, v]) => `${k}=${v}`).join("  ") || "—";
}

interface SparklineProps {
  durations: number[];
  className?: string;
}

export function Sparkline({ durations, className }: SparklineProps) {
  if (durations.length < 2) {
    return <svg className={className ?? "h-6 w-[90px] shrink-0"} viewBox="0 0 90 24" preserveAspectRatio="none" />;
  }

  const w = 90;
  const h = 24;
  const pad = 3;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (durations.length - 1);
  const pts = durations.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (d - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const points = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg className={className ?? "h-6 w-[90px] shrink-0"} viewBox="0 0 90 24" preserveAspectRatio="none">
      <polyline
        points={points}
        style={{ fill: "none", stroke: "var(--muted-foreground)", strokeWidth: 1.6, strokeLinejoin: "round", strokeLinecap: "round" }}
      />
      <circle cx={lx} cy={ly} r={2.2} style={{ fill: "var(--primary)" }} />
    </svg>
  );
}

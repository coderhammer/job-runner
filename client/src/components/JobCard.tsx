import { Link } from "@tanstack/react-router";
import type { JobRecord, WorkflowDefinition } from "../types";
import { fmtDuration, fmtRelative } from "../lib/format";
import { Badge } from "./ui/badge";
import { StatusDot, type Status } from "./ui/status-dot";
import { Sparkline } from "./Sparkline";

interface JobCardProps {
  job: WorkflowDefinition;
  runs: JobRecord[];
  isRunning: boolean;
  now: number;
}

export function JobCard({ job, runs, isRunning, now }: JobCardProps) {
  const last = runs[runs.length - 1];
  const status: Status = isRunning ? "running" : last ? last.status : "idle";

  return (
    <Link
      to="/jobs"
      search={(prev) => ({ ...prev, open: job.id })}
      className="flex flex-col gap-2.5 rounded-lg border border-border bg-panel p-3.5 text-left transition-colors hover:border-ring"
    >
      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        <h3 className="flex-1 truncate text-[13px] font-semibold">{job.name}</h3>
        <Badge>{job.trigger}</Badge>
      </div>
      <p className="line-clamp-2 text-xs leading-relaxed text-muted">{job.description}</p>
      <div className="text-[11px] text-muted-2">{job.trigger === "webhook" ? "webhook" : `cron ${job.schedule}`}</div>
      {job.stats.totalRuns > 0 && (
        <div className="text-[11px] text-muted-2">
          {Math.round((job.stats.successRate ?? 0) * 100)}% succès · {fmtDuration(job.stats.avgDurationMs ?? 0)} moy ({job.stats.windowDays}j)
        </div>
      )}
      <div className="mt-0.5 flex items-center justify-between gap-2.5 border-t border-border pt-2">
        {isRunning ? (
          <span className="text-[11px] text-accent">en cours…</span>
        ) : last ? (
          <span className="text-[11px] text-muted" title={new Date(last.startedAt).toLocaleString("fr-FR")}>
            {fmtRelative(last.startedAtMs, now)} · {fmtDuration(last.durationMs ?? 0)}
          </span>
        ) : (
          <span className="text-[11px] text-muted">jamais exécuté</span>
        )}
        <Sparkline durations={runs.slice(-12).map((r) => r.durationMs ?? 0)} />
      </div>
    </Link>
  );
}

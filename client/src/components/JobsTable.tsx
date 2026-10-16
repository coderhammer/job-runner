import { Link, useNavigate } from "@tanstack/react-router";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@spunto/design-system";
import type { JobRecord, WorkflowDefinition } from "../types";
import { fmtDuration, fmtRelative } from "../lib/format";
import { cn } from "@/lib/utils";
import { StatusDot, type Status } from "./ui/status-dot";
import { Sparkline } from "./Sparkline";

export interface JobRow {
  job: WorkflowDefinition;
  runs: JobRecord[];
  isRunning: boolean;
}

interface JobsTableProps {
  rows: JobRow[];
  selectedJobId: string | null;
  now: number;
}

// Une ligne par workflow. Toute la ligne ouvre la sheet du job ; le nom reste un vrai
// lien (clavier, ouverture dans un onglet). Sur mobile, seules les colonnes essentielles
// restent (job + dernière exécution) — le déclencheur passe sous le nom.
export function JobsTable({ rows, selectedJobId, now }: JobsTableProps) {
  const navigate = useNavigate({ from: "/jobs" });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="text-[11px] uppercase tracking-wide">
            <TableHead className="pl-3">Job</TableHead>
            <TableHead className="hidden md:table-cell">Déclencheur</TableHead>
            <TableHead>Dernière exécution</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Succès 30j</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Durée moy.</TableHead>
            <TableHead className="hidden pr-3 lg:table-cell">Tendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortByLastRun(rows).map(({ job, runs, isRunning }) => {
            const last = runs[runs.length - 1];
            const status: Status = isRunning ? "running" : last ? last.status : "idle";
            const successRate = job.stats.successRate;
            return (
              <TableRow
                key={job.id}
                data-state={job.id === selectedJobId ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => navigate({ search: (prev) => ({ ...prev, open: job.id }) })}
              >
                <TableCell className="w-full max-w-0 py-2.5 pl-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <StatusDot status={status} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        to="/jobs"
                        search={(prev) => ({ ...prev, open: job.id })}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {job.name}
                      </Link>
                      <span className="truncate text-[11px] text-muted-foreground" title={job.description}>
                        <span className="font-mono md:hidden">{triggerLabel(job)} · </span>
                        {job.description}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{job.trigger}</Badge>
                    {job.schedule && <span className="font-mono text-[11px] text-muted-foreground">{job.schedule}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {isRunning ? (
                    <span className="text-primary">en cours…</span>
                  ) : last ? (
                    <span
                      className={cn("whitespace-nowrap", last.status === "error" ? "text-destructive" : "text-muted-foreground")}
                      title={new Date(last.startedAt).toLocaleString("fr-FR")}
                    >
                      {fmtRelative(last.startedAtMs, now)}
                      <span className="hidden font-mono sm:inline"> · {fmtDuration(last.durationMs ?? 0)}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">jamais</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                  {job.stats.totalRuns > 0 && successRate !== null ? (
                    <span className={successRate < 1 ? (successRate < 0.5 ? "text-destructive" : "text-warning") : "text-success"}>
                      {Math.round(successRate * 100)}%
                      <span className="ml-1 text-[10px] text-muted-foreground">({job.stats.totalRuns})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground lg:table-cell">
                  {job.stats.avgDurationMs !== null && job.stats.totalRuns > 0 ? fmtDuration(job.stats.avgDurationMs) : "—"}
                </TableCell>
                <TableCell className="hidden pr-3 lg:table-cell">
                  <Sparkline durations={runs.slice(-12).map((r) => r.durationMs ?? 0)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-foreground">Aucun workflow déclaré.</div>}
    </div>
  );
}

// Tri par défaut : dernière exécution la plus récente en haut. Un job en cours compte
// comme « maintenant » ; les jamais-exécutés ferment la marche, dans l'ordre du manifest
// (le tri de Array.prototype.sort est stable).
function sortByLastRun(rows: JobRow[]): JobRow[] {
  const key = (r: JobRow) => (r.isRunning ? Infinity : (r.runs[r.runs.length - 1]?.startedAtMs ?? -Infinity));
  return [...rows].sort((a, b) => (key(a) === key(b) ? 0 : key(b) > key(a) ? 1 : -1));
}

function triggerLabel(job: WorkflowDefinition): string {
  return job.trigger === "webhook" ? "webhook" : `cron ${job.schedule}`;
}

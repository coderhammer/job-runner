import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { JobRecord, WorkflowDefinition } from "../types";
import { fmtDuration, fmtRelative } from "../lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { SheetBody, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { StatusDot, type Status } from "./ui/status-dot";

interface JobSheetContentProps {
  job: WorkflowDefinition;
  runs: JobRecord[];
  running: JobRecord[];
  now: number;
  onTrigger: (id: string, input: Record<string, string>) => Promise<void>;
}

export function JobSheetContent({ job, runs, running, now, onTrigger }: JobSheetContentProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(job.inputs.map((i) => [i.name, i.type === "select" ? i.options?.[0] ?? "" : ""]))
  );
  const [status, setStatus] = useState<{ text: string; kind: "" | "ok" | "error" }>({ text: "", kind: "" });

  const isRunning = running.length > 0;
  const last = runs[runs.length - 1];
  const recent = [...runs].reverse().slice(0, 15);
  const healthStatus: Status = isRunning ? "running" : last ? last.status : "idle";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ text: "lancement…", kind: "" });
    try {
      await onTrigger(job.id, formValues);
      setStatus({ text: "lancé ✓", kind: "ok" });
    } catch (err) {
      setStatus({ text: `erreur: ${(err as Error).message}`, kind: "error" });
    }
  }

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <StatusDot status={healthStatus} />
          <SheetTitle>{job.name}</SheetTitle>
          <Badge className="ml-auto">{job.trigger}</Badge>
        </div>
        <SheetDescription>{job.trigger === "webhook" ? "webhook" : `cron ${job.schedule}`}</SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-6">
        <p className="text-xs leading-relaxed text-muted">{job.description}</p>

        {job.stats.totalRuns > 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile label="Runs" value={String(job.stats.totalRuns)} sub={`${job.stats.windowDays}j`} />
            <StatTile
              label="Succès"
              value={`${Math.round((job.stats.successRate ?? 0) * 100)}%`}
              tone={job.stats.successRate !== null && job.stats.successRate < 1 ? "warn" : "ok"}
            />
            <StatTile label="Durée moy." value={fmtDuration(job.stats.avgDurationMs ?? 0)} />
            <StatTile label="p95" value={fmtDuration(job.stats.p95DurationMs ?? 0)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-lg border border-border bg-panel-2 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-2">Déclencher manuellement</div>
          {job.inputs.map((input) => (
            <label key={input.name} className="flex flex-col gap-1 text-[11px] text-muted">
              {input.label}
              {input.type === "select" ? (
                <Select value={formValues[input.name]} onChange={(e) => setFormValues((v) => ({ ...v, [input.name]: e.target.value }))}>
                  {input.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type="text"
                  value={formValues[input.name]}
                  onChange={(e) => setFormValues((v) => ({ ...v, [input.name]: e.target.value }))}
                />
              )}
            </label>
          ))}
          <div className="flex items-center gap-2.5 pt-1">
            <Button type="submit" size="sm">
              ▶ Lancer
            </Button>
            <span className={cn("text-[11px]", status.kind === "ok" && "text-ok", status.kind === "error" && "text-error")}>
              {status.text}
            </span>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
            Dernières exécutions {running.length + recent.length ? `(${running.length + recent.length})` : ""}
          </div>
          {running.length === 0 && recent.length === 0 && <div className="text-xs text-muted-2">Aucune exécution pour l'instant.</div>}
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {running.map((r) => (
              <Link
                key={r.id}
                to="/executions"
                search={{ open: r.id }}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs transition-colors hover:bg-panel-2"
              >
                <StatusDot status="running" />
                <span className="text-accent">en cours depuis {fmtDuration(Math.max(now - r.startedAtMs, 0))}</span>
              </Link>
            ))}
            {recent.map((r) => (
              <Link
                key={r.id}
                to="/executions"
                search={{ open: r.id }}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs transition-colors hover:bg-panel-2"
              >
                <StatusDot status={r.status} />
                <span className="text-muted" title={new Date(r.startedAt).toLocaleString("fr-FR")}>
                  {fmtRelative(r.startedAtMs, now)}
                </span>
                <span className="ml-auto tabular-nums text-muted">{fmtDuration(r.durationMs ?? 0)}</span>
              </Link>
            ))}
          </div>
        </div>
      </SheetBody>
    </>
  );
}

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-panel-2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", tone === "ok" && "text-ok", tone === "warn" && "text-warning")}>
        {value}
        {sub && <span className="ml-1 text-[10px] font-normal text-muted-2">{sub}</span>}
      </div>
    </div>
  );
}

import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { JobRecord, WorkflowDefinition } from "../types";
import { fmtDuration, fmtRelative } from "../lib/format";
import { cn } from "@/lib/utils";
import { Badge, Button, Input, Label, SheetDescription, SheetHeader, SheetTitle } from "@spunto/design-system";
import { Play } from "lucide-react";
import { OptionSelect } from "./ui/option-select";
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
      <SheetHeader className="gap-1.5 border-b border-border pr-12">
        <div className="flex items-center gap-2">
          <StatusDot status={healthStatus} />
          <SheetTitle className="text-sm">{job.name}</SheetTitle>
          <Badge variant="outline" className="ml-auto">
            {job.trigger}
          </Badge>
        </div>
        <SheetDescription className="font-mono text-[11px]">{job.trigger === "webhook" ? "webhook" : `cron ${job.schedule}`}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{job.description}</p>

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
          <SectionTitle>Déclencher manuellement</SectionTitle>
          {job.inputs.map((input) => (
            <div key={input.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`input-${input.name}`} className="text-[11px] text-muted-foreground">
                {input.label}
              </Label>
              {input.type === "select" ? (
                <OptionSelect
                  aria-label={input.label}
                  value={formValues[input.name]}
                  onValueChange={(value) => setFormValues((v) => ({ ...v, [input.name]: value }))}
                  options={(input.options ?? []).map((o) => ({ value: o, label: o }))}
                />
              ) : (
                <Input
                  id={`input-${input.name}`}
                  type="text"
                  className="text-xs"
                  value={formValues[input.name]}
                  onChange={(e) => setFormValues((v) => ({ ...v, [input.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-2.5 pt-1">
            <Button type="submit" size="sm">
              <Play /> Lancer
            </Button>
            <span className={cn("text-[11px]", status.kind === "ok" && "text-success", status.kind === "error" && "text-destructive")}>
              {status.text}
            </span>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <SectionTitle>Dernières exécutions {running.length + recent.length ? `(${running.length + recent.length})` : ""}</SectionTitle>
          {running.length === 0 && recent.length === 0 && <div className="text-xs text-muted-foreground">Aucune exécution pour l'instant.</div>}
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {running.map((r) => (
              <Link
                key={r.id}
                to="/executions"
                search={{ open: r.id }}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs transition-colors hover:bg-muted/50"
              >
                <StatusDot status="running" />
                <span className="text-primary">en cours depuis {fmtDuration(Math.max(now - r.startedAtMs, 0))}</span>
              </Link>
            ))}
            {recent.map((r) => (
              <Link
                key={r.id}
                to="/executions"
                search={{ open: r.id }}
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs transition-colors hover:bg-muted/50"
              >
                <StatusDot status={r.status} />
                <span className="text-muted-foreground" title={new Date(r.startedAt).toLocaleString("fr-FR")}>
                  {fmtRelative(r.startedAtMs, now)}
                </span>
                <span className="ml-auto font-mono tabular-nums text-muted-foreground">{fmtDuration(r.durationMs ?? 0)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-sm font-semibold tabular-nums", tone === "ok" && "text-success", tone === "warn" && "text-warning")}>
        {value}
        {sub && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{children}</div>;
}

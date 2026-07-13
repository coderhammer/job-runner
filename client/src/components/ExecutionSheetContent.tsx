import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { JobRecord, LogLine, WorkflowDefinition } from "../types";
import { useExecutionSpans } from "../hooks/useExecutionSpans";
import { useNow } from "../hooks/useNow";
import { useRetryExecution } from "../hooks/useRetryExecution";
import { fmtDuration } from "../lib/format";
import { resolveJobForExecution } from "../lib/workflowHealth";
import type { SpanNode } from "../lib/waterfall";
import { Button, buttonVariants } from "./ui/button";
import { SheetBody, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { StatusDot } from "./ui/status-dot";
import { TraceWaterfall } from "./TraceWaterfall";
import { cn } from "@/lib/utils";

interface ExecutionSheetContentProps {
  record: JobRecord;
  workflows: WorkflowDefinition[];
}

const LOG_COLOR: Record<LogLine["level"], string> = {
  log: "text-muted",
  info: "text-accent",
  warn: "text-warning",
  error: "text-error",
};

export function ExecutionSheetContent({ record, workflows }: ExecutionSheetContentProps) {
  const now = useNow();
  const spansQuery = useExecutionSpans(record.id);
  const retry = useRetryExecution();
  const [selectedSpan, setSelectedSpan] = useState<SpanNode | null>(null);
  const job = resolveJobForExecution(workflows, record);

  const isRunning = record.status === "running";
  const canRetry = record.status === "error" || record.status === "interrupted";

  const activeAttributes = selectedSpan?.attributes ?? record.attributes;
  const activeError = selectedSpan ? selectedSpan.error : record.error;
  const activeName = selectedSpan ? selectedSpan.name : record.job;
  const activeLogs = selectedSpan?.logs ?? record.logs ?? [];

  const durationLabel = isRunning
    ? `en cours depuis ${fmtDuration(Math.max(now - record.startedAtMs, 0))}`
    : fmtDuration(record.durationMs ?? 0);

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <StatusDot status={record.status} />
          <SheetTitle>{record.job}</SheetTitle>
          <div className="ml-auto flex items-center gap-1.5">
            {canRetry && (
              <Button type="button" size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(record.id)}>
                {retry.isPending ? "Relance…" : "↻ Relancer"}
              </Button>
            )}
            {job && (
              <Link to="/jobs" search={{ open: job.id }} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Voir le job
              </Link>
            )}
          </div>
        </div>
        <SheetDescription className={isRunning ? "text-accent" : undefined}>
          {new Date(record.startedAt).toLocaleString("fr-FR")} · {durationLabel}
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-5">
        {isRunning && (
          <div className="rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-[11px] text-accent">
            Ce job tourne encore — le waterfall se complète au fur et à mesure que ses étapes se terminent.
          </div>
        )}
        {record.status === "interrupted" && (
          <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-[11px] text-warning">
            {record.statusMessage || "Processus arrêté avant la fin (redémarrage ou crash)."}
          </div>
        )}

        <TraceWaterfall
          job={record}
          spans={spansQuery.data}
          isLoading={spansQuery.isLoading}
          onSelectSpan={setSelectedSpan}
          selectedSpanId={selectedSpan?.id}
          now={now}
        />

        {activeError && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-error">Erreur — {activeName}</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-error bg-error-soft p-3 text-[11px] text-error">
              {`${activeError.type || "Error"}: ${activeError.message || "(pas de message)"}\n\n${activeError.stacktrace || "(pas de stacktrace)"}`}
            </pre>
          </div>
        )}

        {activeLogs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-2">Logs — {activeName}</div>
            <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-panel-2 p-3">
              {activeLogs.map((l, i) => (
                <pre key={i} className={cn("whitespace-pre-wrap break-words text-[11px]", LOG_COLOR[l.level])}>
                  [{l.level}] {l.message}
                </pre>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-2">
            Attributs {selectedSpan ? "" : isRunning ? "(au démarrage)" : ""}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-panel-2 p-3 text-[11px] text-muted">
            {JSON.stringify(activeAttributes || {}, null, 2)}
          </pre>
        </div>
      </SheetBody>
    </>
  );
}

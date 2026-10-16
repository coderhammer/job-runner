import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { JobRecord, LogLine, WorkflowDefinition } from "../types";
import { useExecutionSpans } from "../hooks/useExecutionSpans";
import { useNow } from "../hooks/useNow";
import { useRetryExecution } from "../hooks/useRetryExecution";
import { fmtDuration } from "../lib/format";
import { resolveJobForExecution } from "../lib/workflowHealth";
import type { SpanNode } from "../lib/waterfall";
import { Alert, AlertDescription, Button, buttonVariants, SheetDescription, SheetHeader, SheetTitle } from "@spunto/design-system";
import { RotateCw } from "lucide-react";
import { StatusDot } from "./ui/status-dot";
import { TraceWaterfall } from "./TraceWaterfall";
import { cn } from "@/lib/utils";

interface ExecutionSheetContentProps {
  record: JobRecord;
  workflows: WorkflowDefinition[];
}

const LOG_COLOR: Record<LogLine["level"], string> = {
  log: "text-muted-foreground",
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
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
      <SheetHeader className="gap-1.5 border-b border-border pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot status={record.status} />
          <SheetTitle className="min-w-0 truncate text-sm">{record.job}</SheetTitle>
          <div className="flex w-full items-center gap-1.5 sm:ml-auto sm:w-auto">
            {canRetry && (
              <Button type="button" size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(record.id)}>
                <RotateCw className={retry.isPending ? "animate-spin" : undefined} />
                {retry.isPending ? "Relance…" : "Relancer"}
              </Button>
            )}
            {job && (
              <Link to="/jobs" search={{ open: job.id }} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Voir le job
              </Link>
            )}
          </div>
        </div>
        <SheetDescription className={cn("text-xs", isRunning && "text-primary")}>
          {new Date(record.startedAt).toLocaleString("fr-FR")} · {durationLabel}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {isRunning && (
          <Alert variant="info">
            <AlertDescription className="text-xs">
              Ce job tourne encore — le waterfall se complète au fur et à mesure que ses étapes se terminent.
            </AlertDescription>
          </Alert>
        )}
        {record.status === "interrupted" && (
          <Alert variant="warning">
            <AlertDescription className="text-xs">
              {record.statusMessage || "Processus arrêté avant la fin (redémarrage ou crash)."}
            </AlertDescription>
          </Alert>
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
            <div className="text-[11px] font-medium uppercase tracking-wide text-destructive">Erreur — {activeName}</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-mono text-[11px] text-destructive">
              {`${activeError.type || "Error"}: ${activeError.message || "(pas de message)"}\n\n${activeError.stacktrace || "(pas de stacktrace)"}`}
            </pre>
          </div>
        )}

        {activeLogs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Logs — {activeName}</div>
            <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-code-surface p-3">
              {activeLogs.map((l, i) => (
                <pre key={i} className={cn("whitespace-pre-wrap break-words font-mono text-[11px]", LOG_COLOR[l.level])}>
                  [{l.level}] {l.message}
                </pre>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Attributs {selectedSpan ? "" : isRunning ? "(au démarrage)" : ""}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-3 font-mono text-[11px] text-muted-foreground">
            {JSON.stringify(activeAttributes || {}, null, 2)}
          </pre>
        </div>
      </div>
    </>
  );
}

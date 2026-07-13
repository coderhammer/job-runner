// Miroir côté client des types serveur (src/lib/executionRecord.ts, src/lib/workflow.ts,
// src/lib/spanStore.ts) — ce sont de simples DTO JSON, dupliqués plutôt que partagés pour
// garder le build client indépendant du projet tsc serveur (rootDir "src").

export interface LogLine {
  tsMs: number;
  level: "log" | "info" | "warn" | "error";
  message: string;
}

interface RecordCommon {
  id: string;
  status: "running" | "ok" | "error" | "interrupted";
  statusMessage?: string;
  startedAt: string;
  endedAt: string | null;
  startedAtMs: number;
  endedAtMs: number | null;
  durationMs: number | null;
  attributes: Record<string, string | number | boolean>;
  error: { type?: string; message?: string; stacktrace?: string } | null;
  logs?: LogLine[];
}

// Un job = un run applicatif complet (span racine OTel) — source de vérité pour
// /api/executions.
export interface JobRecord extends RecordCommon {
  traceId: string;
  job: string;
  input: Record<string, string> | null;
}

// Une sous-étape d'un job (withChildSpan manuel ou appel HTTP auto-instrumenté).
export interface SpanRecord extends RecordCommon {
  jobId: string;
  parentSpanId: string | null;
  name: string;
}

export interface WorkflowInput {
  name: string;
  label: string;
  type: "text" | "select";
  options?: string[];
}

export interface WorkflowStats {
  windowDays: number;
  totalRuns: number;
  successRate: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  schedule: string | null;
  trigger: "cron" | "webhook";
  inputs: WorkflowInput[];
  stats: WorkflowStats;
}

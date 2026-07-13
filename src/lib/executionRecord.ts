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
  // null tant que le job/span n'est pas terminé.
  endedAt: string | null;
  // Millisecondes en float (non arrondies) — à utiliser pour tout calcul/tri
  // de timing. startedAt/endedAt (ISO, arrondi à la ms) sont pour l'affichage.
  startedAtMs: number;
  endedAtMs: number | null;
  durationMs: number | null;
  attributes: Record<string, string | number | boolean>;
  error: { type?: string; message?: string; stacktrace?: string } | null;
  logs?: LogLine[];
}

// Un job = un run applicatif complet (span racine OTel), source de vérité pour
// /api/executions — plus de "span sans parent" à interpréter comme un job.
export interface JobRecord extends RecordCommon {
  traceId: string;
  job: string;
  // Input d'origine du déclenchement (trigger manuel, cron, webhook) — permet
  // de rejouer une exécution (voir /retry).
  input: Record<string, string> | null;
}

// Une sous-étape d'un job (withChildSpan manuel ou appel HTTP auto-instrumenté).
// job_id est désormais obligatoire : un span ne peut exister sans job rattaché.
export interface SpanRecord extends RecordCommon {
  jobId: string;
  parentSpanId: string | null;
  name: string;
}

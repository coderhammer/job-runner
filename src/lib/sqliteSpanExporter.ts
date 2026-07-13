import { ExportResultCode, hrTimeToMilliseconds, type ExportResult } from "@opentelemetry/core";
import { SpanStatusCode } from "@opentelemetry/api";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import type Database from "better-sqlite3";
import { updateJobEnd, updateSpanEnd, type EndInput } from "./spanStore.js";
import { publishSpanEvent } from "./eventBus.js";

function serializeSpanEnd(span: ReadableSpan): EndInput {
  const exceptionEvent = span.events.find((e) => e.name === "exception");
  return {
    id: span.spanContext().spanId,
    status: span.status.code === SpanStatusCode.ERROR ? "error" : "ok",
    statusMessage: span.status.message,
    startedAtMs: hrTimeToMilliseconds(span.startTime),
    endedAtMs: hrTimeToMilliseconds(span.endTime),
    durationMs: Math.round(hrTimeToMilliseconds(span.duration) * 100) / 100,
    attributes: span.attributes as Record<string, string | number | boolean>,
    error: exceptionEvent
      ? {
          type: exceptionEvent.attributes?.["exception.type"] as string | undefined,
          message: exceptionEvent.attributes?.["exception.message"] as string | undefined,
          stacktrace: exceptionEvent.attributes?.["exception.stacktrace"] as string | undefined,
        }
      : null,
  };
}

// Remplace l'ancien FileSpanExporter (JSONL) : même interface OTel SpanExporter,
// déclenché par le SimpleSpanProcessor à span.end(), mais fait un UPDATE sur la
// ligne déjà insérée en 'running' par insertJobStart/insertSpanStart (voir
// telemetry.ts) plutôt que d'ajouter une nouvelle ligne — un job/span a désormais
// une seule ligne, du démarrage à la fin. Pas de troncature : l'historique est
// illimité (pagination côté API, voir spanStore.listJobs).
export class SqliteSpanExporter implements SpanExporter {
  constructor(private readonly db: Database.Database) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    try {
      for (const span of spans) {
        const input = serializeSpanEnd(span);
        // "job.name" présent = racine de job (voir SpanStartTracker.onStart,
        // telemetry.ts) → jobs, sinon → spans. Un span jamais inséré à onStart
        // (orphelin observé hors de tout contexte de job) ne touche aucune ligne
        // ici — updateJobEnd/updateSpanEnd retournent undefined silencieusement,
        // ce n'est plus une anomalie à faire remonter.
        if (span.attributes["job.name"]) {
          const job = updateJobEnd(this.db, input);
          if (job) publishSpanEvent({ type: "job-finished", job });
        } else {
          const record = updateSpanEnd(this.db, input);
          if (record) publishSpanEvent({ type: "span-finished", span: record });
        }
      }
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      resultCallback({ code: ExportResultCode.FAILED, error: error as Error });
    }
  }

  async shutdown(): Promise<void> {}
}

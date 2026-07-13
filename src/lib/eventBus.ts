import { EventEmitter } from "node:events";
import type { JobRecord, SpanRecord } from "./executionRecord.js";

export type SpanEvent =
  | { type: "job-started" | "job-finished"; job: JobRecord }
  | { type: "span-started" | "span-finished"; span: SpanRecord };

// Bus interne au process : un seul serveur Express, un seul process — pas besoin
// de pubsub externe (Redis...) pour propager les événements aux clients SSE connectés.
const bus = new EventEmitter();
bus.setMaxListeners(50); // plusieurs onglets dashboard ouverts en même temps

export function publishSpanEvent(event: SpanEvent): void {
  bus.emit("span-event", event);
}

export function subscribeSpanEvents(listener: (event: SpanEvent) => void): () => void {
  bus.on("span-event", listener);
  return () => bus.off("span-event", listener);
}

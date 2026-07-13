import type { JobRecord, SpanRecord } from "./executionRecord.js";
export type SpanEvent = {
    type: "job-started" | "job-finished";
    job: JobRecord;
} | {
    type: "span-started" | "span-finished";
    span: SpanRecord;
};
export declare function publishSpanEvent(event: SpanEvent): void;
export declare function subscribeSpanEvents(listener: (event: SpanEvent) => void): () => void;

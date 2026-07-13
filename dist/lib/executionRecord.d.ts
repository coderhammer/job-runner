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
    error: {
        type?: string;
        message?: string;
        stacktrace?: string;
    } | null;
    logs?: LogLine[];
}
export interface JobRecord extends RecordCommon {
    traceId: string;
    job: string;
    input: Record<string, string> | null;
}
export interface SpanRecord extends RecordCommon {
    jobId: string;
    parentSpanId: string | null;
    name: string;
}
export {};

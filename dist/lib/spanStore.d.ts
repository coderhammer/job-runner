import type Database from "better-sqlite3";
import type { JobRecord, SpanRecord, LogLine } from "./executionRecord.js";
import type { WorkflowDefinition } from "./workflow.js";
type Attrs = Record<string, string | number | boolean>;
export interface JobStartInput {
    id: string;
    traceId: string;
    job: string;
    startedAtMs: number;
    attributes: Attrs;
    input?: Record<string, string> | null;
}
export declare function insertJobStart(db: Database.Database, input: JobStartInput): JobRecord;
export interface SpanStartInput {
    id: string;
    jobId: string;
    parentSpanId: string | null;
    name: string;
    startedAtMs: number;
    attributes: Attrs;
}
export declare function insertSpanStart(db: Database.Database, input: SpanStartInput): SpanRecord;
export interface EndInput {
    id: string;
    status: "ok" | "error";
    statusMessage?: string;
    startedAtMs: number;
    endedAtMs: number;
    durationMs: number;
    attributes: Attrs;
    error: {
        type?: string;
        message?: string;
        stacktrace?: string;
    } | null;
}
export declare function updateJobEnd(db: Database.Database, input: EndInput): JobRecord | undefined;
export declare function updateSpanEnd(db: Database.Database, input: EndInput): SpanRecord | undefined;
export declare function insertLog(db: Database.Database, entry: {
    jobId?: string;
    spanId?: string;
    tsMs: number;
    level: LogLine["level"];
    message: string;
}): void;
export declare function getJob(db: Database.Database, id: string): JobRecord | undefined;
export declare function getJobSpans(db: Database.Database, jobId: string): SpanRecord[];
export interface ListJobsOptions {
    cursor?: string;
    limit?: number;
    job?: string;
    status?: "running" | "ok" | "error" | "interrupted";
}
export interface ListJobsResult {
    items: JobRecord[];
    nextCursor: string | null;
}
export declare function listJobs(db: Database.Database, opts?: ListJobsOptions): ListJobsResult;
export declare function reconcileInterruptedSpans(db: Database.Database): number;
export interface WorkflowStats {
    windowDays: number;
    totalRuns: number;
    successRate: number | null;
    avgDurationMs: number | null;
    p95DurationMs: number | null;
}
export declare function computeWorkflowStats(db: Database.Database, workflows: WorkflowDefinition[], windowDays?: number): Map<string, WorkflowStats>;
export {};

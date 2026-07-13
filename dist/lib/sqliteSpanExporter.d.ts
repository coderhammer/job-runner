import { type ExportResult } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import type Database from "better-sqlite3";
export declare class SqliteSpanExporter implements SpanExporter {
    private readonly db;
    constructor(db: Database.Database);
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
    shutdown(): Promise<void>;
}

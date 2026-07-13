import { type Span } from "@opentelemetry/api";
import { dataDir } from "./db/client.js";
export { dataDir };
export declare function withSpan<T>(jobName: string, attributes: Record<string, string | number | boolean>, fn: (span: Span) => Promise<T>): Promise<T>;
export declare function withChildSpan<T>(parent: Span, name: string, attributes: Record<string, string | number | boolean>, fn: (span: Span) => Promise<T>): Promise<T>;

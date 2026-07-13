import type { JobRecord, SpanRecord, WorkflowDefinition } from "./types";

export interface ExecutionsFilter {
  limit?: number;
  job?: string;
  status?: "" | "ok" | "error" | "running" | "interrupted";
  cursor?: string;
}

export interface ExecutionsPage {
  items: JobRecord[];
  nextCursor: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchExecutions(filter: ExecutionsFilter = {}): Promise<ExecutionsPage> {
  const params = new URLSearchParams();
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.job) params.set("job", filter.job);
  if (filter.status) params.set("status", filter.status);
  if (filter.cursor) params.set("cursor", filter.cursor);
  const qs = params.toString();
  return fetch(`/api/executions${qs ? `?${qs}` : ""}`).then((res) => json<ExecutionsPage>(res));
}

export function fetchExecution(id: string): Promise<JobRecord> {
  return fetch(`/api/executions/${id}`).then((res) => json<JobRecord>(res));
}

export function fetchExecutionSpans(id: string): Promise<SpanRecord[]> {
  return fetch(`/api/executions/${id}/spans`).then((res) => json<SpanRecord[]>(res));
}

export function fetchWorkflows(): Promise<WorkflowDefinition[]> {
  return fetch("/api/workflows").then((res) => json<WorkflowDefinition[]>(res));
}

export function triggerWorkflow(id: string, input: Record<string, string>): Promise<void> {
  return fetch(`/api/workflows/${id}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });
}

export function retryExecution(id: string): Promise<void> {
  return fetch(`/api/executions/${id}/retry`, { method: "POST" }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });
}

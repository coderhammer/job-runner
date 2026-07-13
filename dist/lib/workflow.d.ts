import type { RequestHandler } from "express";
export interface WorkflowInput {
    name: string;
    label: string;
    type: "text" | "select";
    options?: string[];
}
export interface WebhookDefinition {
    path: string;
    handler: RequestHandler;
}
export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    schedule: string | null;
    trigger: "cron" | "webhook";
    inputs: WorkflowInput[];
    run: (input: Record<string, string>) => Promise<void>;
}
export declare function getWorkflow(workflows: WorkflowDefinition[], id: string): WorkflowDefinition | undefined;

import type { WorkflowDefinition } from "./workflow.js";
export declare function matchesWorkflow(job: string, workflowId: string): boolean;
export declare function resolveWorkflowForJob(workflows: WorkflowDefinition[], job: string): WorkflowDefinition | undefined;

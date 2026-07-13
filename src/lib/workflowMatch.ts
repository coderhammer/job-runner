import type { WorkflowDefinition } from "./workflow.js";

// Port serveur de la même règle que client/src/lib/workflowHealth.ts (dupliquée
// délibérément, comme client/src/types.ts, pour garder les deux builds indépendants).
// Le job d'un span racine correspond soit exactement à l'id du workflow (ex:
// "binance-balance"), soit préfixé (ex: workflow "notion-spunto-worker" produit
// des spans "notion-spunto-worker-start"/"-stop").
export function matchesWorkflow(job: string, workflowId: string): boolean {
  return job === workflowId || job.startsWith(`${workflowId}-`);
}

export function resolveWorkflowForJob(workflows: WorkflowDefinition[], job: string): WorkflowDefinition | undefined {
  return workflows.find((w) => matchesWorkflow(job, w.id));
}

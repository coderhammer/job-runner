import type { JobRecord, WorkflowDefinition } from "../types";

// Le job d'un span racine correspond soit exactement à l'id du workflow (ex:
// "binance-balance"), soit préfixé (ex: workflow "notion-spunto-worker" produit
// des spans "notion-spunto-worker-start"/"-stop").
function matchesWorkflow(job: string, workflowId: string): boolean {
  return job === workflowId || job.startsWith(`${workflowId}-`);
}

// Runs terminés (ok/error/interrupted) uniquement, pour l'historique/la sparkline —
// un job "running" n'a pas de durée figée et se filtre séparément (runningForWorkflow).
export function runsForWorkflow(stats: JobRecord[], workflowId: string): JobRecord[] {
  return stats.filter((r) => r.status !== "running" && matchesWorkflow(r.job, workflowId)).sort((a, b) => a.startedAtMs - b.startedAtMs);
}

export function runningForWorkflow(running: JobRecord[], workflowId: string): JobRecord[] {
  return running.filter((r) => matchesWorkflow(r.job, workflowId));
}

// Même règle de correspondance job -> workflow, dans l'autre sens : à partir
// d'une exécution, retrouver le workflow (Job) dont elle est une des étapes.
export function resolveJobForExecution(
  workflows: WorkflowDefinition[],
  record: { job: string }
): WorkflowDefinition | undefined {
  return workflows.find((w) => matchesWorkflow(record.job, w.id));
}

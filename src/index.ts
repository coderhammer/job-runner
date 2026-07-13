// Surface publique de @hammerbot/job-runner.
//
// Un consommateur déclare des jobs (WorkflowDefinition[]) + éventuellement des
// webhooks, et appelle start(). Il obtient : exécution cron/webhook, télémétrie
// OpenTelemetry (spans jobs + sous-étapes, persistés en SQLite), et un dashboard
// web complet — sans écrire une ligne de serveur, de DB ou de dashboard.
//
// Instrumenter un job : withSpan (span racine) + withChildSpan (une par étape
// externe). Voir le README pour les règles d'instrumentation.

export { start, createServer, type ServerConfig } from "./server.js";
export { withSpan, withChildSpan, dataDir } from "./telemetry.js";
export { triggerInputStorage } from "./lib/triggerInput.js";
export { getWorkflow } from "./lib/workflow.js";
export type { WorkflowDefinition, WorkflowInput, WebhookDefinition } from "./lib/workflow.js";
export type { JobRecord, SpanRecord, LogLine } from "./lib/executionRecord.js";

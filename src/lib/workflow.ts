import type { RequestHandler } from "express";

export interface WorkflowInput {
  name: string;
  label: string;
  type: "text" | "select";
  options?: string[];
}

// Entrée webhook déclarative. Le framework monte `app.post(path, handler)` après
// avoir installé le middleware qui conserve le corps brut (req.rawBody, pour la
// vérification de signature HMAC). La logique propre au fournisseur (vérif de
// signature, mapping payload → action) reste dans le handler du consommateur —
// c'est volontairement flexible : chaque source (Notion, GitHub, Stripe…) a un
// mapping trop spécifique pour être abstrait utilement.
//
// ⚠️ Rappel (leçon prod, cf. CLAUDE.md d'automations) : ne jamais laisser une
// fonction appelée en tête d'un handler async (ex. verifySignature) throw sans
// try/catch — un throw synchrone dans un handler Express async crashe le process.
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

export function getWorkflow(workflows: WorkflowDefinition[], id: string): WorkflowDefinition | undefined {
  return workflows.find((w) => w.id === id);
}

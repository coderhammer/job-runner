import { AsyncLocalStorage } from "node:async_hooks";

// Permet à withSpan() de récupérer l'input du déclenchement (trigger manuel, cron,
// webhook) sans changer la signature de workflow.run(input) — utilisé pour peupler
// spans.input_json sur le span racine, et ainsi permettre un "retry" fidèle plus tard.
export const triggerInputStorage = new AsyncLocalStorage<Record<string, string>>();

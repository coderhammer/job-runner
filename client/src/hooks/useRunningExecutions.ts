import { useExecutions } from "./useExecutions";

// Les jobs "en cours" sont désormais juste des JobRecord avec status="running"
// (une seule table côté serveur, plus de registre séparé) — ce hook n'est plus
// qu'un filtre pratique au-dessus de useExecutions, conservé pour ne pas changer
// tous les call sites (JobsPage, ExecutionsPage).
export function useRunningExecutions() {
  return useExecutions({ status: "running", limit: 100 });
}

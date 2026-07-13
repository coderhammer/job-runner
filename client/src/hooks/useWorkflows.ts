import { useQuery } from "@tanstack/react-query";
import { fetchWorkflows } from "../api";

// Les définitions de workflow ne changent qu'au déploiement — pas besoin de
// les repoller comme les exécutions, staleTime long pour éviter du bruit réseau.
export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
    staleTime: 5 * 60_000,
  });
}

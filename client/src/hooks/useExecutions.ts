import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchExecutions, type ExecutionsFilter } from "../api";

// Utilisé pour les besoins "bornés" (peupler le sélecteur de job, sparklines de
// JobsPage) — pas de pagination ici, juste les N plus récents. Le vrai temps réel
// vient de useLiveEvents (SSE), qui invalide cette query dès qu'un span racine se
// termine ou démarre — plus de refetchInterval.
export function useExecutions(filter: ExecutionsFilter) {
  return useQuery({
    queryKey: ["executions", filter],
    queryFn: () => fetchExecutions(filter).then((page) => page.items),
    placeholderData: keepPreviousData,
  });
}

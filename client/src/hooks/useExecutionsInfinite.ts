import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchExecutions, type ExecutionsFilter } from "../api";

// Table d'audit paginée (bouton "Charger plus") : remplace l'ancienne troncature
// serveur à 2000 lignes — l'historique est désormais illimité, la pagination par
// curseur (voir spanStore.listExecutions) permet de le parcourir sans tout charger.
export function useExecutionsInfinite(filter: Omit<ExecutionsFilter, "cursor">) {
  return useInfiniteQuery({
    queryKey: ["executions", "infinite", filter],
    queryFn: ({ pageParam }) => fetchExecutions({ ...filter, limit: 50, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

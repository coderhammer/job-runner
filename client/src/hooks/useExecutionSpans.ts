import { useQuery } from "@tanstack/react-query";
import { fetchExecutionSpans } from "../api";

// Plus de polling : useLiveEvents (SSE) invalide précisément ["executionSpans", jobId]
// dès qu'un sous-span de ce job démarre ou se termine, donc le waterfall d'un
// job encore en cours se complète en direct sans repoller à l'aveugle.
export function useExecutionSpans(jobId: string | null) {
  return useQuery({
    queryKey: ["executionSpans", jobId],
    queryFn: () => fetchExecutionSpans(jobId as string),
    enabled: jobId !== null,
  });
}

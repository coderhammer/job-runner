import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SpanRecord } from "../types";

// Remplace le polling (refetchInterval) par un flux SSE unique (GET /api/events) :
// un event job-started/job-finished/span-started/span-finished est publié par le
// serveur à chaque insertion/mise à jour en base (voir src/telemetry.ts,
// src/lib/sqliteSpanExporter.ts). On invalide précisément les queries concernées
// plutôt que de tout repoller à l'aveugle. EventSource se reconnecte automatiquement
// en cas de coupure, pas de logique supplémentaire nécessaire ici. Monté une seule
// fois (AppLayout).
export function useLiveEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/events");

    const handleJobEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    };

    const handleSpanEvent = (event: MessageEvent<string>) => {
      const span = JSON.parse(event.data) as SpanRecord;
      queryClient.invalidateQueries({ queryKey: ["executionSpans", span.jobId] });
    };

    source.addEventListener("job-started", handleJobEvent);
    source.addEventListener("job-finished", handleJobEvent);
    source.addEventListener("span-started", handleSpanEvent);
    source.addEventListener("span-finished", handleSpanEvent);

    return () => source.close();
  }, [queryClient]);
}

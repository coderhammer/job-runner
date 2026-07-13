import { useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerWorkflow } from "../api";

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, string> }) => triggerWorkflow(id, input),
    onSuccess: () => {
      // Le job tourne peut-être encore plusieurs minutes (cf. src/index.ts) : le
      // refetchInterval de useExecutions le fera apparaître dès qu'il se termine,
      // cette invalidation immédiate sert juste à ne pas attendre le prochain tick.
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      // Le job démarre en général bien avant que le trigger HTTP ne réponde
      // (withSpan écrit dans le registre "running" avant même d'exécuter fn) :
      // invalider tout de suite le fait apparaître "en cours" sans attendre le
      // prochain tick de polling.
      queryClient.invalidateQueries({ queryKey: ["running"] });
    },
  });
}

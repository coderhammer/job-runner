import { useMutation, useQueryClient } from "@tanstack/react-query";
import { retryExecution } from "../api";

export function useRetryExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retryExecution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });
}

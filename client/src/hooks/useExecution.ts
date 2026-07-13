import { useQuery } from "@tanstack/react-query";
import { fetchExecution } from "../api";

export function useExecution(id: string | null) {
  return useQuery({
    queryKey: ["execution", id],
    queryFn: () => fetchExecution(id as string),
    enabled: id !== null,
  });
}

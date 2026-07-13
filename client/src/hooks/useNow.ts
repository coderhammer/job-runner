import { useEffect, useState } from "react";

// Horloge partagée pour les libellés relatifs ("il y a 2 min") — tique toute
// seule entre deux refetch pour que le dashboard reste lisible sans dépendre
// du polling réseau.
export function useNow(intervalMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

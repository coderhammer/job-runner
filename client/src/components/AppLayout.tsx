import type { ReactNode } from "react";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  useLiveEvents();

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

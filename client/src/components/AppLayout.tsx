import type { ReactNode } from "react";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { MobileTopBar, Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  useLiveEvents();

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <MobileTopBar />
        <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}

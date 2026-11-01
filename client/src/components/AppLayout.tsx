import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@spunto/design-system";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { AppSidebar, MobileTopBar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  useLiveEvents();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarProvider className="h-dvh" mobileCloseKey={pathname}>
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-y-auto">
        <MobileTopBar />
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

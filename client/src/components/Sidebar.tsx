import { Link, useRouterState } from "@tanstack/react-router";
import { History, Workflow } from "lucide-react";
import {
  Sidebar,
  SidebarBrand,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@spunto/design-system";

const NAV = [
  { to: "/jobs" as const, label: "Jobs", icon: Workflow },
  { to: "/executions" as const, label: "Executions", icon: History },
];

// Pas de compte ni d'organisation ici : seulement la marque et la nav.
function Brand() {
  return (
    <SidebarBrand
      name="automations"
      product="cockpit"
      logo={
        <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-sidebar-border">
          <Workflow className="size-4" />
          <span
            className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] animate-pulse-ok rounded-full bg-success"
            title="rafraîchissement automatique actif"
          />
        </span>
      }
    />
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar className="border-sidebar-border">
      <SidebarHeader className="px-2 pt-3 pb-2">
        <Brand />
      </SidebarHeader>
      <SidebarContent className="py-2">
        <SidebarGroup className="gap-0 px-2">
          <SidebarMenu>
            {NAV.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton isActive={pathname === item.to || pathname.startsWith(item.to + "/")} render={<Link to={item.to} />}>
                  <item.icon />
                  {item.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// Mobile (< md) : barre du haut avec le bouton qui ouvre la feuille latérale.
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-sidebar-border bg-sidebar/95 px-3 py-2 text-sidebar-foreground backdrop-blur md:hidden">
      <SidebarTrigger className="-ml-1" />
      <Brand />
    </header>
  );
}

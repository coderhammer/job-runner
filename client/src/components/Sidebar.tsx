import { Link } from "@tanstack/react-router";
import { History, Workflow } from "lucide-react";

const NAV = [
  { to: "/jobs" as const, label: "Jobs", icon: Workflow },
  { to: "/executions" as const, label: "Executions", icon: History },
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="h-[7px] w-[7px] shrink-0 animate-pulse-ok rounded-full bg-success" title="rafraîchissement automatique actif" />
      <div className="flex flex-col gap-0.5 leading-none">
        <span className="font-display text-sm font-bold">automations</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">cockpit</span>
      </div>
    </div>
  );
}

// Desktop (≥ md) : colonne latérale fixe.
export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-4 py-4">
        <Brand />
      </div>
      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground [&>svg]:text-sidebar-primary" }}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

// Mobile (< md) : barre du haut, la nav tient en deux onglets — pas besoin de tiroir.
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar/95 px-4 py-2.5 text-sidebar-foreground backdrop-blur md:hidden">
      <Brand />
      <nav className="flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground [&>svg]:text-sidebar-primary" }}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

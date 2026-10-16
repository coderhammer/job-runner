import { Link } from "@tanstack/react-router";
import { History, Workflow } from "lucide-react";

const NAV = [
  { to: "/jobs" as const, label: "Jobs", icon: Workflow },
  { to: "/executions" as const, label: "Executions", icon: History },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="h-[7px] w-[7px] shrink-0 animate-pulse-ok rounded-full bg-success" title="rafraîchissement automatique actif" />
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-display text-sm font-bold">automations</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">cockpit</span>
        </div>
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

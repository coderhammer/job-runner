import { Link } from "@tanstack/react-router";
import { History, Workflow } from "lucide-react";

const NAV = [
  { to: "/jobs" as const, label: "Jobs", icon: Workflow },
  { to: "/executions" as const, label: "Executions", icon: History },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-panel">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="h-[7px] w-[7px] shrink-0 animate-pulse-ok rounded-full bg-ok" title="rafraîchissement automatique actif" />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold">automations</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-2">cockpit</span>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted transition-colors hover:bg-panel-2 hover:text-foreground"
            activeProps={{ className: "bg-panel-2 text-foreground" }}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

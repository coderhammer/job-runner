import { Link } from "@tanstack/react-router";
import { fmtDuration, fmtRelative, summarize } from "../lib/format";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { StatusDot } from "./ui/status-dot";

export type StatusFilter = "" | "ok" | "error" | "interrupted";

// Vue table d'un JobRecord — durationMs est toujours un nombre concret ici
// (recalculé en direct côté ExecutionsPage pour un run encore "running", via
// now - startedAtMs), contrairement à JobRecord.durationMs qui est null
// tant que le job tourne.
export interface ExecutionRow {
  id: string;
  job: string;
  status: "ok" | "error" | "running" | "interrupted";
  startedAt: string;
  startedAtMs: number;
  durationMs: number;
  attributes: Record<string, string | number | boolean>;
}

interface ExecutionsTableProps {
  records: ExecutionRow[];
  knownJobs: string[];
  jobFilter: string;
  onJobFilterChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  selectedRecordId: string | null;
  now: number;
}

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "ok", label: "OK" },
  { value: "error", label: "Erreur" },
  { value: "interrupted", label: "Interrompu" },
];

export function ExecutionsTable({
  records,
  knownJobs,
  jobFilter,
  onJobFilterChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  selectedRecordId,
  now,
}: ExecutionsTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Rechercher un job, un attribut…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="min-w-[200px] max-w-xs flex-1"
        />
        <Select value={jobFilter} onChange={(e) => onJobFilterChange(e.target.value)}>
          <option value="">Tous les jobs</option>
          {knownJobs.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </Select>
        <div className="inline-flex gap-0.5 rounded-md border border-border bg-panel p-0.5">
          {STATUS_PILLS.map((p) => (
            <button
              key={p.value || "all"}
              type="button"
              onClick={() => onStatusFilterChange(p.value)}
              className={cn(
                "rounded px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground",
                statusFilter === p.value && "bg-panel-2 text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
              <th className="px-3 py-2 font-medium">Job</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Démarré</th>
              <th className="px-3 py-2 font-medium">Durée</th>
              <th className="px-3 py-2 font-medium">Résumé</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className={cn("border-b border-border last:border-0", r.id === selectedRecordId && "bg-accent-soft")}>
                <td className="p-0">
                  <Link
                    to="/executions"
                    search={{ open: r.id }}
                    className="block px-3 py-2 text-xs font-medium text-accent hover:underline"
                  >
                    {r.job}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs",
                      r.status === "ok"
                        ? "text-ok"
                        : r.status === "error"
                          ? "text-error"
                          : r.status === "interrupted"
                            ? "text-warning"
                            : "text-accent"
                    )}
                  >
                    <StatusDot status={r.status} />
                    {r.status === "running" ? "en cours" : r.status === "interrupted" ? "interrompu" : r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted" title={new Date(r.startedAt).toLocaleString("fr-FR")}>
                  {fmtRelative(r.startedAtMs, now)}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-foreground">{fmtDuration(r.durationMs)}</td>
                <td className="max-w-md truncate px-3 py-2 text-xs text-muted" title={summarize(r)}>
                  {summarize(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-2">Aucune exécution pour l'instant.</div>}
      </div>
    </div>
  );
}

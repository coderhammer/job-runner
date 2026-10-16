import { Link } from "@tanstack/react-router";
import { fmtDuration, fmtRelative, summarize } from "../lib/format";
import { cn } from "@/lib/utils";
import { Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@spunto/design-system";
import { OptionSelect } from "./ui/option-select";
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
          className="w-full text-xs sm:w-auto sm:min-w-[200px] sm:max-w-xs sm:flex-1"
        />
        <OptionSelect
          aria-label="Filtrer par job"
          value={jobFilter}
          onValueChange={onJobFilterChange}
          options={[{ value: "", label: "Tous les jobs" }, ...knownJobs.map((j) => ({ value: j, label: j }))]}
          className="w-auto min-w-[160px] flex-1 sm:flex-none"
        />
        <div className="inline-flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
          {STATUS_PILLS.map((p) => (
            <button
              key={p.value || "all"}
              type="button"
              onClick={() => onStatusFilterChange(p.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                statusFilter === p.value && "bg-muted text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="text-[11px] uppercase tracking-wide">
              <TableHead>Job</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden sm:table-cell">Démarré</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead className="hidden md:table-cell">Résumé</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} data-state={r.id === selectedRecordId ? "selected" : undefined}>
                <TableCell className="w-full max-w-0 p-0 sm:w-auto sm:max-w-none">
                  <Link to="/executions" search={{ open: r.id }} className="block truncate p-2 font-medium text-primary hover:underline">
                    {r.job}
                    <span className="block text-[11px] font-normal text-muted-foreground sm:hidden">{fmtRelative(r.startedAtMs, now)}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      r.status === "ok"
                        ? "text-success"
                        : r.status === "error"
                          ? "text-destructive"
                          : r.status === "interrupted"
                            ? "text-warning"
                            : "text-primary"
                    )}
                  >
                    <StatusDot status={r.status} />
                    {r.status === "running" ? "en cours" : r.status === "interrupted" ? "interrompu" : r.status}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell" title={new Date(r.startedAt).toLocaleString("fr-FR")}>
                  {fmtRelative(r.startedAtMs, now)}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{fmtDuration(r.durationMs)}</TableCell>
                <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell" title={summarize(r)}>
                  {summarize(r)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-foreground">Aucune exécution pour l'instant.</div>}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useExecutions } from "../hooks/useExecutions";
import { useExecutionsInfinite } from "../hooks/useExecutionsInfinite";
import { useExecution } from "../hooks/useExecution";
import { useWorkflows } from "../hooks/useWorkflows";
import { useNow } from "../hooks/useNow";
import { summarize } from "../lib/format";
import type { JobRecord } from "../types";
import { ExecutionsTable, type ExecutionRow, type StatusFilter } from "../components/ExecutionsTable";
import { ExecutionSheetContent } from "../components/ExecutionSheetContent";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";

function toRow(record: JobRecord, now: number): ExecutionRow {
  return {
    id: record.id,
    job: record.job,
    status: record.status,
    startedAt: record.startedAt,
    startedAtMs: record.startedAtMs,
    durationMs: record.durationMs ?? Math.max(now - record.startedAtMs, 0),
    attributes: record.attributes,
  };
}

export function ExecutionsPage() {
  const now = useNow();
  const search = useSearch({ from: "/executions" });
  const navigate = useNavigate({ from: "/executions" });

  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [searchText, setSearchText] = useState("");

  // Jeu large non filtré, juste pour peupler le sélecteur de job (mêmes jobs
  // connus même quand un filtre restreint la table courante).
  const statsQuery = useExecutions({ limit: 200 });
  const tableQuery = useExecutionsInfinite({ job: jobFilter || undefined, status: statusFilter || undefined });
  const workflowsQuery = useWorkflows();

  const openId = search.open ?? null;
  const executionQuery = useExecution(openId);

  // Plus besoin de fusionner deux tableaux de formes différentes (exécutions
  // terminées + registre "running" séparé) : un job "en cours" est juste une
  // JobRecord avec status="running" (table `jobs` dédiée, voir spanStore.ts).
  const tableRecords = useMemo(() => tableQuery.data?.pages.flatMap((p) => p.items) ?? [], [tableQuery.data]);

  const knownJobs = useMemo(() => {
    const jobs = new Set<string>();
    for (const r of statsQuery.data ?? []) jobs.add(r.job);
    for (const r of tableRecords) jobs.add(r.job);
    return [...jobs].sort();
  }, [statsQuery.data, tableRecords]);

  const filteredRecords = useMemo(() => {
    const rows = tableRecords.map((r) => toRow(r, now));
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.job.toLowerCase().includes(q) || summarize(r).toLowerCase().includes(q));
  }, [tableRecords, searchText, now]);

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, open: undefined }) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Executions</h1>
        <p className="text-xs text-muted">Historique complet des exécutions, filtrable par job et par statut.</p>
      </div>

      <ExecutionsTable
        records={filteredRecords}
        knownJobs={knownJobs}
        jobFilter={jobFilter}
        onJobFilterChange={setJobFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        search={searchText}
        onSearchChange={setSearchText}
        selectedRecordId={openId}
        now={now}
      />

      {tableQuery.hasNextPage && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" disabled={tableQuery.isFetchingNextPage} onClick={() => tableQuery.fetchNextPage()}>
            {tableQuery.isFetchingNextPage ? "Chargement…" : "Charger plus"}
          </Button>
        </div>
      )}

      <Sheet open={openId !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="max-w-2xl">
          {executionQuery.data ? (
            <ExecutionSheetContent record={executionQuery.data} workflows={workflowsQuery.data ?? []} />
          ) : (
            <SheetHeader>
              <SheetTitle>Chargement…</SheetTitle>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

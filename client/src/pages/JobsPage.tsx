import { useNavigate, useSearch } from "@tanstack/react-router";
import { Sheet, SheetContent } from "@spunto/design-system";
import { useWorkflows } from "../hooks/useWorkflows";
import { useExecutions } from "../hooks/useExecutions";
import { useRunningExecutions } from "../hooks/useRunningExecutions";
import { useTriggerWorkflow } from "../hooks/useTriggerWorkflow";
import { useNow } from "../hooks/useNow";
import { runningForWorkflow, runsForWorkflow } from "../lib/workflowHealth";
import { JobsTable } from "../components/JobsTable";
import { JobSheetContent } from "../components/JobSheetContent";

export function JobsPage() {
  const now = useNow();
  const search = useSearch({ from: "/jobs" });
  const navigate = useNavigate({ from: "/jobs" });

  const workflowsQuery = useWorkflows();
  const statsQuery = useExecutions({ limit: 200 });
  const runningQuery = useRunningExecutions();
  const trigger = useTriggerWorkflow();

  async function handleTrigger(id: string, input: Record<string, string>) {
    await trigger.mutateAsync({ id, input });
  }

  const jobs = workflowsQuery.data ?? [];
  const stats = statsQuery.data ?? [];
  const running = runningQuery.data ?? [];
  const selectedJob = jobs.find((j) => j.id === search.open) ?? null;

  function closeSheet() {
    navigate({ search: (prev) => ({ ...prev, open: undefined }) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold">Jobs</h1>
        <p className="text-xs text-muted-foreground">Vue d'ensemble des workflows, de leur santé et de leur historique.</p>
      </div>

      <JobsTable
        rows={jobs.map((job) => ({
          job,
          runs: runsForWorkflow(stats, job.id),
          isRunning: runningForWorkflow(running, job.id).length > 0,
        }))}
        selectedJobId={selectedJob?.id ?? null}
        now={now}
      />

      <Sheet open={selectedJob !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="gap-0 sm:max-w-xl">
          {selectedJob && (
            <JobSheetContent
              job={selectedJob}
              runs={runsForWorkflow(stats, selectedJob.id)}
              running={runningForWorkflow(running, selectedJob.id)}
              now={now}
              onTrigger={handleTrigger}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

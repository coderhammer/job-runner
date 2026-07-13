import { useNavigate, useSearch } from "@tanstack/react-router";
import { useWorkflows } from "../hooks/useWorkflows";
import { useExecutions } from "../hooks/useExecutions";
import { useRunningExecutions } from "../hooks/useRunningExecutions";
import { useTriggerWorkflow } from "../hooks/useTriggerWorkflow";
import { useNow } from "../hooks/useNow";
import { runningForWorkflow, runsForWorkflow } from "../lib/workflowHealth";
import { JobCard } from "../components/JobCard";
import { JobSheetContent } from "../components/JobSheetContent";
import { Sheet, SheetContent } from "../components/ui/sheet";

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
        <h1 className="text-lg font-semibold">Jobs</h1>
        <p className="text-xs text-muted">Vue d'ensemble des workflows, de leur santé et de leur historique.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            runs={runsForWorkflow(stats, job.id)}
            isRunning={runningForWorkflow(running, job.id).length > 0}
            now={now}
          />
        ))}
      </div>

      <Sheet open={selectedJob !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent>
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

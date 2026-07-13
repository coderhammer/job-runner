import { cn } from "@/lib/utils";

export type Status = "ok" | "error" | "idle" | "running" | "interrupted";

const CLASSES: Record<Status, string> = {
  ok: "bg-ok",
  error: "bg-error",
  idle: "bg-muted-2",
  running: "bg-accent animate-pulse-accent",
  interrupted: "bg-warning",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("inline-block h-[7px] w-[7px] shrink-0 rounded-full", CLASSES[status], className)} />;
}

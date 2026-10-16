import { cn } from "@/lib/utils";

export type Status = "ok" | "error" | "idle" | "running" | "interrupted";

const CLASSES: Record<Status, string> = {
  ok: "bg-success",
  error: "bg-destructive",
  idle: "bg-muted-foreground/60",
  running: "bg-primary animate-pulse-primary",
  interrupted: "bg-warning",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("inline-block h-[7px] w-[7px] shrink-0 rounded-full", CLASSES[status], className)} />;
}

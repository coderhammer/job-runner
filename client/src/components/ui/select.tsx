import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 rounded-md border border-border bg-panel px-2 text-xs text-foreground focus:outline-none focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

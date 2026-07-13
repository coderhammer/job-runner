import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 rounded-md border border-border bg-panel px-2.5 text-xs text-foreground placeholder:text-muted-2 focus:outline-none focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

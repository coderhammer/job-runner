import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import type { JobRecord, SpanRecord } from "../types";
import { fmtDuration } from "../lib/format";
import { buildTree, countDescendants, expandAncestors, markLongestPath, spanKind, type SpanNode } from "../lib/waterfall";
import { Button, Spinner } from "@spunto/design-system";
import { cn } from "@/lib/utils";

// Couleur = nature du span (identité, pas statut), en tokens du design system Spunto.
// Pas l'échelle build/ship/run seule : ses trois oranges sont trop proches pour
// distinguer trois natures côte à côte — http passe donc sur `info` (bleu).
const KIND_BAR: Record<string, string> = {
  job: "bg-run",
  http: "bg-info",
  custom: "bg-build",
};

const KIND_SWATCH: Record<string, string> = KIND_BAR;

interface TraceWaterfallProps {
  job: JobRecord | undefined;
  spans: SpanRecord[] | undefined;
  isLoading: boolean;
  onSelectSpan: (span: SpanNode) => void;
  selectedSpanId?: string | null;
  // Fin provisoire pour les spans encore "running" (endedAtMs: null) — sans ça,
  // Math.max(...endedAtMs) produit NaN dès qu'un span est en cours.
  now: number;
}

export function TraceWaterfall({ job, spans, isLoading, onSelectSpan, selectedSpanId, now }: TraceWaterfallProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => (job ? buildTree(job, spans ?? []) : null), [job, spans]);

  // Par défaut : chemin le plus long déplié, tout le reste replié. Le premier
  // span en erreur est sélectionné et son chemin déplié de force, même hors
  // du chemin le plus long — voir CLAUDE.md sur la lisibilité du waterfall.
  useEffect(() => {
    if (!tree) return;
    const nodes = [...tree.byId.values()];
    const longest = new Set<string>();
    for (const root of tree.roots) markLongestPath(root, longest, now);
    const collapsed = new Set(nodes.filter((n) => n.children.length && !longest.has(n.id)).map((n) => n.id));
    const firstError = nodes.find((n) => n.status === "error");
    if (firstError) expandAncestors(firstError, collapsed);
    setCollapsedIds(collapsed);
    onSelectSpan(firstError ?? tree.roots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  const traceStart = useMemo(() => (tree ? Math.min(...[...tree.byId.values()].map((n) => n.startedAtMs)) : 0), [tree]);
  const totalMs = useMemo(() => {
    if (!tree) return 0.01;
    const end = Math.max(...[...tree.byId.values()].map((n) => n.endedAtMs ?? now));
    return Math.max(end - traceStart, 0.01);
  }, [tree, traceStart, now]);

  function toggleCollapse(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading)
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner /> chargement…
      </div>
    );
  if (!tree) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-[9px] w-[9px] rounded-sm", KIND_SWATCH.job)} /> Job
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-[9px] w-[9px] rounded-sm", KIND_SWATCH.http)} /> Appel HTTP
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-[9px] w-[9px] rounded-sm", KIND_SWATCH.custom)} /> Étape custom
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => setCollapsedIds(new Set())}>
            Tout déplier
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCollapsedIds(new Set([...tree.byId.values()].filter((n) => n.children.length).map((n) => n.id)))}
          >
            Tout replier
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <Rows
          nodes={tree.roots}
          depth={0}
          collapsedIds={collapsedIds}
          onToggle={toggleCollapse}
          onSelect={onSelectSpan}
          selectedSpanId={selectedSpanId}
          traceStart={traceStart}
          totalMs={totalMs}
          now={now}
        />
      </div>
    </div>
  );
}

interface RowsProps {
  nodes: SpanNode[];
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: SpanNode) => void;
  selectedSpanId?: string | null;
  traceStart: number;
  totalMs: number;
  now: number;
}

function Rows(props: RowsProps) {
  return (
    <>
      {props.nodes.map((node) => (
        <Row key={node.id} {...props} node={node} />
      ))}
    </>
  );
}

function Row({ node, depth, collapsedIds, onToggle, onSelect, selectedSpanId, traceStart, totalMs, now }: RowsProps & { node: SpanNode }) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = hasChildren && collapsedIds.has(node.id);
  const offsetPct = ((node.startedAtMs - traceStart) / totalMs) * 100;
  // durationMs est null tant que le span tourne : durée live = now - startedAtMs.
  const liveDurationMs = node.durationMs ?? Math.max(now - node.startedAtMs, 0);
  const widthPct = Math.max((liveDurationMs / totalMs) * 100, 0.4);
  const kind = spanKind(node, depth);

  const httpMethod = node.attributes?.["http.request.method"];
  const host = node.attributes?.["server.address"];
  const statusCode = node.attributes?.["http.response.status_code"];

  const tooltip =
    node.status === "error"
      ? `${node.name} — ${fmtDuration(liveDurationMs)} — ${node.statusMessage || "erreur"}`
      : node.status === "interrupted"
        ? `${node.name} — ${fmtDuration(liveDurationMs)} — interrompu`
        : `${node.name} — ${fmtDuration(liveDurationMs)}${node.status === "running" ? " (en cours)" : ""}`;

  return (
    <Fragment>
      <div
        className={cn(
          "grid cursor-pointer grid-cols-[minmax(0,240px)_1fr_56px] items-center gap-2.5 rounded-md py-[3px] hover:bg-muted/60",
          node.id === selectedSpanId && "bg-primary/12 hover:bg-primary/12"
        )}
        onClick={() => onSelect(node)}
      >
        <span
          className={cn(
            "flex items-center overflow-hidden text-ellipsis whitespace-nowrap text-xs",
            depth === 0 ? "font-semibold" : "text-muted-foreground",
            node.status === "error" && "text-destructive"
          )}
          style={{ paddingLeft: depth * 14 }}
        >
          <span
            className={cn("flex w-3.5 shrink-0 items-center justify-center text-muted-foreground/70", hasChildren && "cursor-pointer hover:text-primary")}
            onClick={(e) => {
              if (!hasChildren) return;
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {hasChildren ? (isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
          </span>
          {node.status === "error" && <TriangleAlert className="mr-1 h-3 w-3 shrink-0 text-destructive" />}
          {httpMethod && host ? (
            <>
              <span className="mr-1.5 font-semibold text-foreground">{String(httpMethod)}</span>
              <span className="truncate text-muted-foreground">{String(host)}</span>
            </>
          ) : (
            <span className="truncate">{node.name}</span>
          )}
          {statusCode !== undefined && (
            <span className={cn("ml-1.5 rounded px-1 font-mono text-[10px]", Number(statusCode) >= 400 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
              {String(statusCode)}
            </span>
          )}
          {isCollapsed && <span className="ml-1 text-muted-foreground/70">+{countDescendants(node)}</span>}
        </span>
        <span className="relative h-[18px] rounded-md border border-border bg-muted/40">
          <span
            className={cn(
              "absolute top-[1px] bottom-[1px] min-w-[3px] rounded-sm transition-[filter]",
              KIND_BAR[kind],
              node.status === "error" && "ring-2 ring-inset ring-destructive",
              node.status === "running" && "animate-pulse-primary",
              node.status === "interrupted" && "opacity-40 [background-image:repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.25)_2px,rgba(0,0,0,0.25)_4px)]"
            )}
            style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
            title={tooltip}
          />
        </span>
        <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">{fmtDuration(liveDurationMs)}</span>
      </div>
      {hasChildren && !isCollapsed && (
        <Rows
          nodes={node.children}
          depth={depth + 1}
          collapsedIds={collapsedIds}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedSpanId={selectedSpanId}
          traceStart={traceStart}
          totalMs={totalMs}
          now={now}
        />
      )}
    </Fragment>
  );
}

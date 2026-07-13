import type { JobRecord, SpanRecord, LogLine } from "../types";

export interface SpanNode {
  id: string;
  name: string;
  parentSpanId: string | null;
  status: "running" | "ok" | "error" | "interrupted";
  statusMessage?: string;
  startedAtMs: number;
  endedAtMs: number | null;
  durationMs: number | null;
  attributes: Record<string, string | number | boolean>;
  error: { type?: string; message?: string; stacktrace?: string } | null;
  logs?: LogLine[];
  children: SpanNode[];
  parent: SpanNode | null;
}

function jobToNode(job: JobRecord): SpanNode {
  return {
    id: job.id,
    name: job.job,
    parentSpanId: null,
    status: job.status,
    statusMessage: job.statusMessage,
    startedAtMs: job.startedAtMs,
    endedAtMs: job.endedAtMs,
    durationMs: job.durationMs,
    attributes: job.attributes,
    error: job.error,
    logs: job.logs,
    children: [],
    parent: null,
  };
}

function spanToNode(span: SpanRecord): SpanNode {
  return {
    id: span.id,
    name: span.name,
    parentSpanId: span.parentSpanId,
    status: span.status,
    statusMessage: span.statusMessage,
    startedAtMs: span.startedAtMs,
    endedAtMs: span.endedAtMs,
    durationMs: span.durationMs,
    attributes: span.attributes,
    error: span.error,
    logs: span.logs,
    children: [],
    parent: null,
  };
}

// Le job est la racine synthétique du waterfall (`roots` a toujours exactement
// un élément) — ses sous-spans (parentSpanId===null) deviennent ses enfants
// directs, les autres se rattachent à leur parent réel dans `spans`.
export function buildTree(job: JobRecord, spans: SpanRecord[]): { roots: SpanNode[]; byId: Map<string, SpanNode> } {
  const root = jobToNode(job);
  const byId = new Map<string, SpanNode>([[root.id, root], ...spans.map((s): [string, SpanNode] => [s.id, spanToNode(s)])]);
  for (const node of byId.values()) {
    if (node === root) continue;
    const parent = node.parentSpanId ? byId.get(node.parentSpanId) : root;
    if (parent) {
      node.parent = parent;
      parent.children.push(node);
    }
  }
  for (const node of byId.values()) node.children.sort((a, b) => a.startedAtMs - b.startedAtMs);
  return { roots: [root], byId };
}

// "Chemin le plus long" = à chaque étage, l'enfant qui termine le plus tard — celui qui
// détermine réellement quand le parent peut continuer (contrairement à la durée brute d'un
// span, qui peut être trompeuse quand des étapes tournent en parallèle via Promise.all).
// `now` sert de fin provisoire pour un span encore "running" (endedAtMs: null).
export function markLongestPath(node: SpanNode, marked: Set<string>, now: number): void {
  marked.add(node.id);
  if (!node.children.length) return;
  const next = node.children.reduce((a, b) => ((b.endedAtMs ?? now) > (a.endedAtMs ?? now) ? b : a));
  markLongestPath(next, marked, now);
}

export function countDescendants(node: SpanNode): number {
  let count = 0;
  for (const child of node.children) count += 1 + countDescendants(child);
  return count;
}

export function expandAncestors(node: SpanNode, collapsedIds: Set<string>): void {
  for (let p = node.parent; p; p = p.parent) collapsedIds.delete(p.id);
}

export type SpanKind = "job" | "http" | "custom";

// Identité du span, indépendante de son statut : job (racine synthétique — un run de
// workflow), appel HTTP (auto-instrumenté, porte un attribut http.request.method),
// ou étape custom (tout withChildSpan manuel : ssh-exec, compute-positions...).
export function spanKind(node: SpanNode, depth: number): SpanKind {
  if (depth === 0) return "job";
  if (node.attributes && node.attributes["http.request.method"]) return "http";
  return "custom";
}

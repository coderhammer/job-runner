import { matchesWorkflow } from "./workflowMatch.js";
function rowError(row) {
    return row.error_type || row.error_message || row.error_stacktrace
        ? { type: row.error_type ?? undefined, message: row.error_message ?? undefined, stacktrace: row.error_stacktrace ?? undefined }
        : null;
}
function jobRowToRecord(row, logs) {
    return {
        id: row.id,
        traceId: row.trace_id,
        job: row.job,
        status: row.status,
        statusMessage: row.status_message ?? undefined,
        startedAt: new Date(row.started_at_ms).toISOString(),
        endedAt: row.ended_at_ms !== null ? new Date(row.ended_at_ms).toISOString() : null,
        startedAtMs: row.started_at_ms,
        endedAtMs: row.ended_at_ms,
        durationMs: row.duration_ms,
        attributes: JSON.parse(row.attributes),
        input: row.input_json ? JSON.parse(row.input_json) : null,
        error: rowError(row),
        ...(logs ? { logs } : {}),
    };
}
function spanRowToRecord(row, logs) {
    return {
        id: row.id,
        jobId: row.job_id,
        parentSpanId: row.parent_span_id,
        name: row.name,
        status: row.status,
        statusMessage: row.status_message ?? undefined,
        startedAt: new Date(row.started_at_ms).toISOString(),
        endedAt: row.ended_at_ms !== null ? new Date(row.ended_at_ms).toISOString() : null,
        startedAtMs: row.started_at_ms,
        endedAtMs: row.ended_at_ms,
        durationMs: row.duration_ms,
        attributes: JSON.parse(row.attributes),
        error: rowError(row),
        ...(logs ? { logs } : {}),
    };
}
function getLogsForJobs(db, jobIds) {
    const map = new Map();
    if (!jobIds.length)
        return map;
    const placeholders = jobIds.map(() => "?").join(",");
    const rows = db
        .prepare(`SELECT job_id, span_id, ts_ms, level, message FROM logs WHERE job_id IN (${placeholders}) ORDER BY ts_ms ASC`)
        .all(...jobIds);
    for (const r of rows) {
        if (!r.job_id)
            continue;
        const list = map.get(r.job_id) ?? [];
        list.push({ tsMs: r.ts_ms, level: r.level, message: r.message });
        map.set(r.job_id, list);
    }
    return map;
}
function getLogsForSpans(db, spanIds) {
    const map = new Map();
    if (!spanIds.length)
        return map;
    const placeholders = spanIds.map(() => "?").join(",");
    const rows = db
        .prepare(`SELECT job_id, span_id, ts_ms, level, message FROM logs WHERE span_id IN (${placeholders}) ORDER BY ts_ms ASC`)
        .all(...spanIds);
    for (const r of rows) {
        if (!r.span_id)
            continue;
        const list = map.get(r.span_id) ?? [];
        list.push({ tsMs: r.ts_ms, level: r.level, message: r.message });
        map.set(r.span_id, list);
    }
    return map;
}
export function insertJobStart(db, input) {
    db.prepare(`INSERT INTO jobs (id, trace_id, job, status, started_at_ms, attributes, input_json)
     VALUES (@id, @traceId, @job, 'running', @startedAtMs, @attributes, @inputJson)`).run({
        id: input.id,
        traceId: input.traceId,
        job: input.job,
        startedAtMs: input.startedAtMs,
        attributes: JSON.stringify(input.attributes),
        inputJson: input.input ? JSON.stringify(input.input) : null,
    });
    return {
        id: input.id,
        traceId: input.traceId,
        job: input.job,
        status: "running",
        startedAt: new Date(input.startedAtMs).toISOString(),
        endedAt: null,
        startedAtMs: input.startedAtMs,
        endedAtMs: null,
        durationMs: null,
        attributes: input.attributes,
        input: input.input ?? null,
        error: null,
    };
}
export function insertSpanStart(db, input) {
    db.prepare(`INSERT INTO spans (id, job_id, parent_span_id, name, status, started_at_ms, attributes)
     VALUES (@id, @jobId, @parentSpanId, @name, 'running', @startedAtMs, @attributes)`).run({
        id: input.id,
        jobId: input.jobId,
        parentSpanId: input.parentSpanId,
        name: input.name,
        startedAtMs: input.startedAtMs,
        attributes: JSON.stringify(input.attributes),
    });
    return {
        id: input.id,
        jobId: input.jobId,
        parentSpanId: input.parentSpanId,
        name: input.name,
        status: "running",
        startedAt: new Date(input.startedAtMs).toISOString(),
        endedAt: null,
        startedAtMs: input.startedAtMs,
        endedAtMs: null,
        durationMs: null,
        attributes: input.attributes,
        error: null,
    };
}
function endParams(input) {
    return {
        id: input.id,
        status: input.status,
        statusMessage: input.statusMessage ?? null,
        startedAtMs: input.startedAtMs,
        endedAtMs: input.endedAtMs,
        durationMs: input.durationMs,
        attributes: JSON.stringify(input.attributes),
        errorType: input.error?.type ?? null,
        errorMessage: input.error?.message ?? null,
        errorStacktrace: input.error?.stacktrace ?? null,
    };
}
// Retourne undefined si aucune ligne ne correspond : cas normal désormais pour un
// span jamais inséré à onStart (span orphelin, observé hors de tout contexte de
// job — voir telemetry.ts), pas une anomalie à faire remonter.
export function updateJobEnd(db, input) {
    const result = db
        .prepare(`UPDATE jobs SET
         status = @status, status_message = @statusMessage, started_at_ms = @startedAtMs,
         ended_at_ms = @endedAtMs, duration_ms = @durationMs, attributes = @attributes,
         error_type = @errorType, error_message = @errorMessage, error_stacktrace = @errorStacktrace
       WHERE id = @id`)
        .run(endParams(input));
    if (result.changes === 0)
        return undefined;
    return getJob(db, input.id);
}
export function updateSpanEnd(db, input) {
    const result = db
        .prepare(`UPDATE spans SET
         status = @status, status_message = @statusMessage, started_at_ms = @startedAtMs,
         ended_at_ms = @endedAtMs, duration_ms = @durationMs, attributes = @attributes,
         error_type = @errorType, error_message = @errorMessage, error_stacktrace = @errorStacktrace
       WHERE id = @id`)
        .run(endParams(input));
    if (result.changes === 0)
        return undefined;
    return getSpan(db, input.id);
}
function getSpan(db, id) {
    const row = db.prepare("SELECT * FROM spans WHERE id = ?").get(id);
    if (!row)
        return undefined;
    const logs = getLogsForSpans(db, [id]).get(id) ?? [];
    return spanRowToRecord(row, logs);
}
export function insertLog(db, entry) {
    db.prepare(`INSERT INTO logs (job_id, span_id, ts_ms, level, message) VALUES (?, ?, ?, ?, ?)`).run(entry.jobId ?? null, entry.spanId ?? null, entry.tsMs, entry.level, entry.message);
}
export function getJob(db, id) {
    const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    if (!row)
        return undefined;
    const logs = getLogsForJobs(db, [id]).get(id) ?? [];
    return jobRowToRecord(row, logs);
}
// Tous les sous-spans d'un job, triés chronologiquement — pour le waterfall
// (le job lui-même, racine synthétique du waterfall, se récupère via getJob).
export function getJobSpans(db, jobId) {
    const rows = db.prepare("SELECT * FROM spans WHERE job_id = ? ORDER BY started_at_ms ASC").all(jobId);
    const logsMap = getLogsForSpans(db, rows.map((r) => r.id));
    return rows.map((row) => spanRowToRecord(row, logsMap.get(row.id) ?? []));
}
function encodeCursor(startedAtMs, id) {
    return Buffer.from(`${startedAtMs}:${id}`).toString("base64url");
}
function decodeCursor(cursor) {
    const [msStr, id] = Buffer.from(cursor, "base64url").toString("utf8").split(":");
    return { startedAtMs: Number(msStr), id };
}
// Plus de filtre parent_span_id IS NULL à interpréter : `jobs` ne contient que
// des runs applicatifs par construction (voir telemetry.ts). Pagination par
// keyset sur (started_at_ms DESC, id DESC) — stable même avec des insertions
// concurrentes, contrairement à un offset/limit classique.
export function listJobs(db, opts = {}) {
    const limit = opts.limit ?? 50;
    const conditions = [];
    const params = [];
    if (opts.job) {
        conditions.push("job = ?");
        params.push(opts.job);
    }
    if (opts.status) {
        conditions.push("status = ?");
        params.push(opts.status);
    }
    if (opts.cursor) {
        const { startedAtMs, id } = decodeCursor(opts.cursor);
        conditions.push("(started_at_ms < ? OR (started_at_ms = ? AND id < ?))");
        params.push(startedAtMs, startedAtMs, id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(`SELECT * FROM jobs ${where} ORDER BY started_at_ms DESC, id DESC LIMIT ?`).all(...params, limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((row) => jobRowToRecord(row));
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.started_at_ms, last.id) : null;
    return { items, nextCursor };
}
// Appelé une fois au boot : tout job/span encore 'running' à ce moment-là ne peut
// être qu'orphelin (le process ne survit pas à un redémarrage) — jobs et spans
// vivent dans deux tables distinctes désormais, chacune reconciliée séparément.
export function reconcileInterruptedSpans(db) {
    const now = Date.now();
    const message = "Processus arrêté avant la fin (redémarrage ou crash)";
    const jobsResult = db
        .prepare(`UPDATE jobs SET status = 'interrupted', status_message = ?, ended_at_ms = ?, duration_ms = ? - started_at_ms
       WHERE status = 'running'`)
        .run(message, now, now);
    const spansResult = db
        .prepare(`UPDATE spans SET status = 'interrupted', status_message = ?, ended_at_ms = ?, duration_ms = ? - started_at_ms
       WHERE status = 'running'`)
        .run(message, now, now);
    return jobsResult.changes + spansResult.changes;
}
export function computeWorkflowStats(db, workflows, windowDays = 30) {
    const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const rows = db
        .prepare(`SELECT job, status, duration_ms FROM jobs WHERE started_at_ms >= ? AND status IN ('ok', 'error')`)
        .all(since);
    const stats = new Map();
    for (const workflow of workflows) {
        const runs = rows.filter((r) => matchesWorkflow(r.job, workflow.id));
        if (!runs.length) {
            stats.set(workflow.id, { windowDays, totalRuns: 0, successRate: null, avgDurationMs: null, p95DurationMs: null });
            continue;
        }
        const durations = runs.map((r) => r.duration_ms).sort((a, b) => a - b);
        const successCount = runs.filter((r) => r.status === "ok").length;
        const avgDurationMs = durations.reduce((a, b) => a + b, 0) / durations.length;
        const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
        stats.set(workflow.id, {
            windowDays,
            totalRuns: runs.length,
            successRate: successCount / runs.length,
            avgDurationMs,
            p95DurationMs: durations[p95Index],
        });
    }
    return stats;
}

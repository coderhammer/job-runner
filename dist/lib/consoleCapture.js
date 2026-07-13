import { format } from "node:util";
import { trace } from "@opentelemetry/api";
import { insertLog } from "./spanStore.js";
import { getJobContext } from "./jobContext.js";
const LEVELS = ["log", "info", "warn", "error"];
// Capture tout console.log/info/warn/error émis pendant qu'un span est actif
// (racine de job ou enfant) et l'attribue à son job/span, pour affichage dans le
// waterfall — sans toucher aux fichiers de src/jobs/*.ts. Repose sur
// trace.getActiveSpan(), qui résout le span actif à travers les `await` grâce à
// l'AsyncHooksContextManager déjà enregistré dans telemetry.ts.
export function installConsoleCapture(db) {
    const flag = console;
    if (flag.__automationsCaptureInstalled)
        return;
    flag.__automationsCaptureInstalled = true;
    for (const level of LEVELS) {
        const original = console[level].bind(console);
        console[level] = (...args) => {
            original(...args);
            const span = trace.getActiveSpan();
            if (!span)
                return;
            // Pas de jobContext = span observé hors de tout contexte de job (même cas
            // que le drop dans SpanStartTracker.onStart, voir telemetry.ts) : le log
            // n'a nulle part où s'attacher, on le laisse juste partir dans le vrai
            // console.* (ligne du dessus) sans tenter de l'insérer.
            const ctx = getJobContext(span);
            if (!ctx)
                return;
            try {
                const target = ctx.isJobRoot ? { jobId: ctx.jobId } : { spanId: span.spanContext().spanId };
                insertLog(db, { ...target, tsMs: Date.now(), level, message: format(...args) });
            }
            catch (err) {
                original("[consoleCapture] échec insertion log:", err);
            }
        };
    }
}

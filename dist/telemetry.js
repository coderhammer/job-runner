import { trace, context, SpanStatusCode } from "@opentelemetry/api";
import { BasicTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { db, dataDir } from "./db/client.js";
import { SqliteSpanExporter } from "./lib/sqliteSpanExporter.js";
import { insertJobStart, insertSpanStart, reconcileInterruptedSpans } from "./lib/spanStore.js";
import { publishSpanEvent } from "./lib/eventBus.js";
import { installConsoleCapture } from "./lib/consoleCapture.js";
import { triggerInputStorage } from "./lib/triggerInput.js";
import { setJobContext, getJobContext } from "./lib/jobContext.js";
export { dataDir };
// Réconciliation des jobs/spans restés 'running' depuis un boot précédent
// (crash/redémarrage) : sans effet une fois le process proprement relancé.
reconcileInterruptedSpans(db);
// Hook onStart, déclenché pour TOUT span démarré sur ce provider — y compris ceux
// créés par l'auto-instrumentation (UndiciInstrumentation) qui ne passent jamais
// par withSpan/withChildSpan. Un span racine de job (attribut "job.name", posé par
// withSpan) devient une ligne `jobs` ; un span dont le parent a déjà un jobContext
// devient une ligne `spans` rattachée au même job ; un span sans l'un ni l'autre
// (observé hors de tout contexte de job — ex: un fetch() lancé avant tout withSpan)
// n'est structurellement plus stockable (spans.job_id est NOT NULL) : on le drop
// avec un warning de diagnostic plutôt que de le laisser polluer /api/executions
// comme un faux job (bug d'origine de ce mécanisme).
class SpanStartTracker {
    onStart(span, parentContext) {
        const parentSpan = trace.getSpan(parentContext);
        const jobName = span.attributes["job.name"];
        const { traceId, spanId } = span.spanContext();
        // Approximatif (Date.now(), pas hrTime) : corrigé avec la valeur précise par
        // SqliteSpanExporter/updateJobEnd|updateSpanEnd une fois le span terminé.
        // Suffisant tant que le span est "running", où seul l'ordre relatif compte
        // pour l'affichage live.
        const startedAtMs = Date.now();
        const attributes = span.attributes;
        if (jobName) {
            setJobContext(span, { jobId: spanId, isJobRoot: true });
            const job = insertJobStart(db, {
                id: spanId,
                traceId,
                job: jobName,
                startedAtMs,
                attributes,
                input: triggerInputStorage.getStore() ?? null,
            });
            publishSpanEvent({ type: "job-started", job });
            return;
        }
        const parentCtx = parentSpan && getJobContext(parentSpan);
        if (parentCtx) {
            setJobContext(span, { jobId: parentCtx.jobId, isJobRoot: false });
            const record = insertSpanStart(db, {
                id: spanId,
                jobId: parentCtx.jobId,
                parentSpanId: parentCtx.isJobRoot ? null : parentSpan.spanContext().spanId,
                name: span.name,
                startedAtMs,
                attributes,
            });
            publishSpanEvent({ type: "span-started", span: record });
            return;
        }
        console.warn(`[telemetry] span "${span.name}" observé hors de tout contexte de job — ignoré`);
    }
    onEnd() { }
    shutdown() {
        return Promise.resolve();
    }
    forceFlush() {
        return Promise.resolve();
    }
}
// Nom de service exposé dans la ressource OTel. Configurable par le consommateur
// via OTEL_SERVICE_NAME (variable standard) — défaut générique `jobs`.
const serviceName = process.env.OTEL_SERVICE_NAME || "jobs";
const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    spanProcessors: [new SpanStartTracker(), new SimpleSpanProcessor(new SqliteSpanExporter(db))],
});
trace.setGlobalTracerProvider(provider);
// Context manager basé sur AsyncLocalStorage : nécessaire pour que le span actif
// traverse les `await` et que l'auto-instrumentation (fetch/undici ci-dessous) et
// la capture de logs (consoleCapture) retrouvent le bon span sans qu'on ait à le
// leur passer à la main.
context.setGlobalContextManager(new AsyncHooksContextManager().enable());
// Auto-instrumente tous les appels `fetch` sortants (undici est le client HTTP
// derrière le fetch natif de Node) : un span par requête HTTP, avec méthode,
// URL, status code et timing réel — sans avoir à wrapper chaque appel à la main.
registerInstrumentations({ instrumentations: [new UndiciInstrumentation()] });
installConsoleCapture(db);
const tracer = trace.getTracer("job-runner");
async function runSpan(span, fn) {
    // On active le span dans le contexte courant pendant l'exécution de `fn` : c'est
    // ce qui permet aux spans créés par l'auto-instrumentation (ou par un withChildSpan
    // imbriqué) de se rattacher automatiquement à `span` comme parent.
    return context.with(trace.setSpan(context.active(), span), async () => {
        try {
            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (err) {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
            throw err;
        }
        finally {
            span.end();
        }
    });
}
// Un job = un span racine, identifié par l'attribut "job.name" (voir
// SpanStartTracker ci-dessus). La ligne SQLite est insérée en 'running' dès le
// démarrage (SpanStartTracker.onStart, avant `fn`) et mise à jour à la fin par
// SqliteSpanExporter (à span.end()) — un seul cycle de vie, plus besoin d'un
// registre séparé pour afficher un statut "en cours" en temps réel (les clients
// SSE reçoivent l'event job-started immédiatement).
export async function withSpan(jobName, attributes, fn) {
    const span = tracer.startSpan(jobName, { attributes: { "job.name": jobName, ...attributes } });
    return runSpan(span, fn);
}
// Sous-étape d'un job (appel réseau, exec SSH...), rattachée explicitement au
// span parent — pas de context propagation implicite, on passe le span à la main.
export async function withChildSpan(parent, name, attributes, fn) {
    const parentContext = trace.setSpan(context.active(), parent);
    const span = tracer.startSpan(name, { attributes }, parentContext);
    return runSpan(span, fn);
}

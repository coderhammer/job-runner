// Associe chaque span OTel actif à son job — clé large (object) plutôt que le
// type Span de l'API : les points d'accès (telemetry.ts, consoleCapture.ts)
// reçoivent le Span concret du SDK ou celui de l'API selon le point d'import,
// mais c'est la même instance à l'exécution. Module séparé de telemetry.ts pour
// éviter un import circulaire avec consoleCapture.ts (que telemetry.ts installe).
const jobContextBySpan = new WeakMap();
export function setJobContext(span, ctx) {
    jobContextBySpan.set(span, ctx);
}
export function getJobContext(span) {
    return jobContextBySpan.get(span);
}

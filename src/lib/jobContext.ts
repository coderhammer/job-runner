export interface JobContext {
  jobId: string;
  isJobRoot: boolean;
}

// Associe chaque span OTel actif à son job — clé large (object) plutôt que le
// type Span de l'API : les points d'accès (telemetry.ts, consoleCapture.ts)
// reçoivent le Span concret du SDK ou celui de l'API selon le point d'import,
// mais c'est la même instance à l'exécution. Module séparé de telemetry.ts pour
// éviter un import circulaire avec consoleCapture.ts (que telemetry.ts installe).
const jobContextBySpan = new WeakMap<object, JobContext>();

export function setJobContext(span: object, ctx: JobContext): void {
  jobContextBySpan.set(span, ctx);
}

export function getJobContext(span: object): JobContext | undefined {
  return jobContextBySpan.get(span);
}

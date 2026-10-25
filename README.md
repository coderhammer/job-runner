# @hammerbot/job-runner

Déclare des **jobs** (cron ou webhook), obtiens gratuitement : exécution planifiée,
télémétrie OpenTelemetry (span par job + sous-étapes, persistés en SQLite), un flux
temps réel (SSE) et un **dashboard web complet** — sans écrire une ligne de serveur,
de base de données ni de front.

Extrait de [`coderhammer/automations`](https://github.com/coderhammer/automations),
qui en est désormais le premier consommateur.

## Quickstart

```ts
// index.ts — tout le service tient ici
import "dotenv/config";
import { start } from "@hammerbot/job-runner";
import { workflows } from "./workflows.js";
import { myWebhookHandler } from "./jobs/myWebhook.js";

start({
  workflows,
  webhooks: [{ path: "/webhooks/my-source", handler: myWebhookHandler }],
});
```

```ts
// workflows.ts — le manifest : déclare tes jobs
import type { WorkflowDefinition } from "@hammerbot/job-runner";
import { runDailyReport } from "./jobs/dailyReport.js";

export const workflows: WorkflowDefinition[] = [
  {
    id: "daily-report",
    name: "Rapport quotidien",
    description: "Envoie le rapport de la veille.",
    schedule: "0 8 * * *", // cron (fuseau TZ, défaut Europe/Paris)
    trigger: "cron",
    inputs: [],
    run: () => runDailyReport(),
  },
];
```

C'est tout. `GET /` sert le dashboard, `GET /healthz` le health check, `GET /api/*`
l'API d'exécutions, `POST /api/workflows/:id/trigger` un déclenchement manuel.

## Configuration (variables d'env)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | port HTTP |
| `ACTIVATE_CRONS` | *(off)* | `true` pour planifier réellement les crons (laisser off en dev pour éviter les effets de bord en double avec la prod) |
| `TZ` | `Europe/Paris` | fuseau des crons |
| `DATA_DIR` | `./.data` | dossier du fichier SQLite (monter un volume en prod) |
| `DB_FILENAME` | `jobs.db` | nom du fichier SQLite. **Pour migrer un service existant, pointer sur le fichier déjà présent sur le volume** (ex. `automations.db`) pour conserver l'historique |
| `OTEL_SERVICE_NAME` | `jobs` | nom de service dans la ressource OpenTelemetry |

## Instrumenter un job

Un job = **un span racine** (`withSpan`) + **un span enfant par étape externe** (`withChildSpan`).

```ts
import { withSpan, withChildSpan } from "@hammerbot/job-runner";

export async function runDailyReport(): Promise<void> {
  await withSpan("daily-report", {}, async (span) => {
    const data = await withChildSpan(span, "fetch-data", {}, fetchData);
    await withChildSpan(span, "post-report", {}, async (postSpan) => {
      const webhookUrl = process.env.REPORT_WEBHOOK_URL;
      if (!webhookUrl) throw new Error("REPORT_WEBHOOK_URL manquant");
      postSpan.setAttribute("report.webhook_host", new URL(webhookUrl).host);
      await postReport(webhookUrl, format(data));
    });
  });
}
```

Règles (issues d'incidents réels, à respecter pour un waterfall lisible) :

- **Le waterfall ne doit pas avoir de trou** : tout temps non trivial (même un calcul
  CPU d'agrégation/formatage entre deux appels) mérite son `withChildSpan`, sinon la
  barre racine dépasse la somme de ses enfants — illisible.
- **Ne jamais valider une précondition de config avant d'ouvrir le span qui en a
  besoin.** Une vérif en tête de fonction fait échouer le span racine « à l'aveugle » ;
  mets-la dans le `withChildSpan` concerné (cf. exemple ci-dessus).
- Les appels `fetch()` sortants sont **auto-instrumentés** (undici) et se rattachent au
  span actif — pas besoin de les wrapper à la main, mais garde un `withChildSpan` autour
  de la logique métier qui les entoure.
- **Handlers de webhook** : ne jamais laisser une fonction en tête d'un handler `async`
  (ex. `verifySignature`) throw sans `try/catch` — un throw synchrone dans un handler
  Express async **crashe le process**.

## Installation

Publié sur npm (public) :

```bash
npm i @hammerbot/job-runner
```

Le dashboard prébuildé, les migrations et le serveur compilé sont inclus dans le paquet
(`dist/`, généré au packaging par `prepack`), donc **aucune étape de build côté
consommateur** — un `npm ci` suffit.

### Publier une nouvelle version

Bumper `version` dans `package.json` dans la PR : au merge sur `main`, la CI
(`.github/workflows/publish.yml`) publie sur npm si cette version n'existe pas encore
(sinon no-op). Auth par **npm Trusted Publishing** (OIDC) — pas de token à faire
tourner ; réglage unique côté npmjs.com décrit en tête du workflow.

## Développer le dashboard

L'UI est construite sur le design system Spunto ([`@spunto/design-system`](https://design.spunto.net)) :
tokens/polices importés dans `client/src/index.css`, primitives (`Button`, `Card`, `Sheet`,
`Table`, `Select`, `Alert`…) importées directement depuis le paquet — pas de copie locale
dans `client/src/components/ui/` (n'y restent que `StatusDot` et le raccourci `OptionSelect`).
Thème sombre via la classe `dark` sur `<html>`. Le paquet est une devDependency : il est
compilé dans `dist/client` au build, un consommateur ne l'installe jamais.

`npm run dev:client` lance Vite (HMR) en proxifiant `/api` vers un serveur consommateur
tournant sur `:3000`. `npm run build` régénère `dist/` (tsc + Vite + migrations).

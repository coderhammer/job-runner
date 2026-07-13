# @coderhammer/job-runner

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
import { start } from "@coderhammer/job-runner";
import { workflows } from "./workflows.js";
import { myWebhookHandler } from "./jobs/myWebhook.js";

start({
  workflows,
  webhooks: [{ path: "/webhooks/my-source", handler: myWebhookHandler }],
});
```

```ts
// workflows.ts — le manifest : déclare tes jobs
import type { WorkflowDefinition } from "@coderhammer/job-runner";
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
import { withSpan, withChildSpan } from "@coderhammer/job-runner";

export async function runDailyReport(): Promise<void> {
  await withSpan("daily-report", {}, async (span) => {
    const data = await withChildSpan(span, "fetch-data", {}, fetchData);
    await withChildSpan(span, "post-slack", {}, async (postSpan) => {
      const channel = process.env.SLACK_CHANNEL;
      if (!channel) throw new Error("SLACK_CHANNEL manquant");
      postSpan.setAttribute("slack.channel", channel);
      await postSlackMessage(channel, format(data));
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

## Modèle de consommation (première implémentation)

Le paquet n'est **pas encore publié sur un registre npm**. En attendant, il se consomme
par **dépendance git** avec le `dist/` **commité** dans ce repo :

```json
{ "dependencies": { "@coderhammer/job-runner": "git+ssh://git@github.com/coderhammer/job-runner.git#<sha>" } }
```

Le dashboard prébuildé, les migrations et le serveur compilé voyagent dans `dist/`, donc
aucune étape de build côté consommateur.

> **Suivi prévu** : publier sur GitHub Packages (registre npm privé) pour remplacer la
> dépendance git par une version sémantique, et brancher une CI de publication. Voir la
> PR de migration d'`automations` pour les implications côté Docker/CI (auth du repo privé
> au `npm ci`).

## Développer le dashboard

`npm run dev:client` lance Vite (HMR) en proxifiant `/api` vers un serveur consommateur
tournant sur `:3000`. `npm run build` régénère `dist/` (tsc + Vite + migrations).

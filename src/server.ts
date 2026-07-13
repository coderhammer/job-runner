import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import express from "express";
import cron from "node-cron";
// Importer telemetry en premier (effet de bord au chargement : enregistre le
// provider OTel, le context manager, l'auto-instrumentation fetch et la capture
// console). Doit être évalué avant tout withSpan/withChildSpan appelé par les jobs.
import "./telemetry.js";
import { db } from "./db/client.js";
import { listJobs, getJob, getJobSpans, computeWorkflowStats } from "./lib/spanStore.js";
import { subscribeSpanEvents, type SpanEvent } from "./lib/eventBus.js";
import { triggerInputStorage } from "./lib/triggerInput.js";
import { getWorkflow, type WorkflowDefinition, type WebhookDefinition } from "./lib/workflow.js";
import { resolveWorkflowForJob } from "./lib/workflowMatch.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerConfig {
  /** Manifest des jobs (cron + webhook). C'est la seule chose qu'un consommateur déclare. */
  workflows: WorkflowDefinition[];
  /** Routes webhook entrantes (Notion, GitHub, Stripe…). Handlers fournis par le consommateur. */
  webhooks?: WebhookDefinition[];
  /**
   * Chemin du build du dashboard à servir. Par défaut le dashboard embarqué dans
   * ce paquet (dist/client). À surcharger seulement pour un dashboard custom.
   */
  clientDistPath?: string;
}

/**
 * Construit l'application Express (API d'exécutions, dashboard, SSE, trigger,
 * retry, webhooks) sans démarrer l'écoute ni les crons. Utile pour tester ou
 * composer. Pour un service clé en main, préférer `start()`.
 */
export function createServer(config: ServerConfig): express.Express {
  const { workflows, webhooks = [], clientDistPath } = config;
  const app = express();

  // Conserve le corps brut de la requête pour la vérification de signature des
  // webhooks (HMAC) — ex. Notion (X-Notion-Signature), GitHub (X-Hub-Signature-256).
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  app.get("/healthz", (_req, res) => res.status(200).send("ok"));

  // Webhooks déclaratifs : montés tels quels. La vérification de signature et le
  // mapping payload → action vivent dans le handler du consommateur (voir
  // WebhookDefinition et le rappel anti-crash sur les throws synchrones).
  for (const wh of webhooks) {
    app.post(wh.path, wh.handler);
  }

  const STATUSES = new Set(["ok", "error", "running", "interrupted"]);

  app.get("/api/executions", (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const job = typeof req.query.job === "string" ? req.query.job : undefined;
    const status =
      typeof req.query.status === "string" && STATUSES.has(req.query.status)
        ? (req.query.status as "ok" | "error" | "running" | "interrupted")
        : undefined;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    res.json(listJobs(db, { limit, job, status, cursor }));
  });

  app.get("/api/executions/:id", (req, res) => {
    const job = getJob(db, req.params.id);
    if (!job) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(job);
  });

  // Sous-étapes (spans) d'un job — le job lui-même (racine du waterfall côté
  // dashboard) se récupère via GET /api/executions/:id ci-dessus.
  app.get("/api/executions/:id/spans", (req, res) => {
    res.json(getJobSpans(db, req.params.id));
  });

  app.get("/api/workflows", (_req, res) => {
    const stats = computeWorkflowStats(db, workflows);
    res.json(
      workflows.map(({ id, name, description, schedule, trigger, inputs }) => ({
        id,
        name,
        description,
        schedule,
        trigger,
        inputs,
        stats: stats.get(id),
      }))
    );
  });

  app.post("/api/workflows/:id/trigger", (req, res) => {
    const workflow = getWorkflow(workflows, req.params.id);
    if (!workflow) {
      res.status(404).json({ error: "workflow inconnu" });
      return;
    }

    const input = (req.body ?? {}) as Record<string, string>;
    // Répond tout de suite : certains workflows peuvent prendre plusieurs minutes.
    // L'exécution apparaît dans /api/executions une fois terminée (et en direct
    // dès son démarrage via /api/events).
    res.status(202).json({ status: "started" });
    triggerInputStorage.run(input, () => {
      workflow.run(input).catch((err) => console.error(`[workflow:${workflow.id}]`, err));
    });
  });

  app.post("/api/executions/:id/retry", (req, res) => {
    const record = getJob(db, req.params.id);
    if (!record) {
      res.status(404).json({ error: "exécution introuvable" });
      return;
    }
    if (record.status === "running") {
      res.status(409).json({ error: "déjà en cours" });
      return;
    }
    const workflow = resolveWorkflowForJob(workflows, record.job);
    if (!workflow) {
      res.status(404).json({ error: "workflow correspondant introuvable" });
      return;
    }
    const input = record.input ?? {};
    res.status(202).json({ status: "started" });
    triggerInputStorage.run(input, () => {
      workflow.run(input).catch((err) => console.error(`[retry:${workflow.id}]`, err));
    });
  });

  // Flux d'événements serveur→client (SSE) : remplace le polling — un job-started/
  // job-finished/span-started/span-finished est publié à chaque insertion/mise à
  // jour en base. Tous les clients connectés reçoivent tous les événements, le
  // filtrage pertinent se fait côté dashboard (volume négligeable à cette échelle).
  app.get("/api/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":ok\n\n");

    const listener = (event: SpanEvent) => {
      const payload = "job" in event ? event.job : event.span;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    const unsubscribe = subscribeSpanEvents(listener);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  // Dashboard embarqué (build Vite), servi tel quel. Chemin par défaut : le build
  // livré dans ce paquet (dist/client, à côté de ce module compilé).
  const clientDist = clientDistPath ?? join(__dirname, "client");
  app.use(express.static(clientDist));

  // Fallback SPA : le dashboard fait du vrai routing client (/jobs, /executions),
  // donc un accès direct/refresh sur ces URLs doit servir index.html plutôt que
  // 404. Ne s'applique qu'aux routes non-API / non-webhook, déjà gérées au-dessus.
  app.get(/^\/(?!api|webhooks).*/, (_req, res) => res.sendFile(join(clientDist, "index.html")));

  return app;
}

/**
 * Démarre un service complet : monte l'app, écoute sur le port, et planifie les
 * crons déclarés dans le manifest (uniquement si ACTIVATE_CRONS=true). C'est le
 * point d'entrée « clé en main » — un index.ts de consommateur tient en 3 lignes.
 */
export function start(config: ServerConfig): Server {
  // Backstop de dernier recours contre les exceptions qui s'échappent au niveau
  // process (throw dans un callback de timer/EventEmitter, promesse rejetée non
  // rattrapée) : sans handler, Node tue le process. On log bruyamment SANS quitter
  // — ce service porte crons + webhooks, le garder en vie vaut mieux qu'un
  // redémarrage qui perd le contexte. Ce n'est pas une excuse pour ne pas corriger
  // les causes à la source.
  process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandledRejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[process] uncaughtException (process maintenu en vie):", err);
  });

  const app = createServer(config);
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => console.log(`Serveur démarré sur le port ${port}`));

  const timezone = process.env.TZ || "Europe/Paris";

  // Les CRONs ne tournent que si ACTIVATE_CRONS=true (ex. prod). Par défaut
  // désactivés (ex. dev), pour éviter les exécutions/effets de bord (Slack, SSH…)
  // en double avec un déploiement de prod. Le planning est déclaré une seule fois,
  // dans le manifest workflows — aucune autre modif de code pour ajouter un cron.
  if (process.env.ACTIVATE_CRONS === "true") {
    for (const workflow of config.workflows) {
      if (workflow.trigger !== "cron" || !workflow.schedule) continue;
      cron.schedule(
        workflow.schedule,
        () => {
          triggerInputStorage.run({}, () => {
            workflow.run({}).catch((err) => console.error(`[${workflow.id}]`, err));
          });
        },
        { timezone }
      );
    }
  } else {
    console.log("CRONs désactivés (ACTIVATE_CRONS != true)");
  }

  return server;
}

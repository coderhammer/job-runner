import type { Server } from "node:http";
import express from "express";
import "./telemetry.js";
import { type WorkflowDefinition, type WebhookDefinition } from "./lib/workflow.js";
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
export declare function createServer(config: ServerConfig): express.Express;
/**
 * Démarre un service complet : monte l'app, écoute sur le port, et planifie les
 * crons déclarés dans le manifest (uniquement si ACTIVATE_CRONS=true). C'est le
 * point d'entrée « clé en main » — un index.ts de consommateur tient en 3 lignes.
 */
export declare function start(config: ServerConfig): Server;

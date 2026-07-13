import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate.js";

export const dataDir = process.env.DATA_DIR || process.cwd() + "/.data";
mkdirSync(dataDir, { recursive: true });

// Nom du fichier SQLite. Configurable par le consommateur via DB_FILENAME —
// important lors d'une migration depuis un service existant : pointer sur le
// fichier déjà présent sur le volume (ex. DB_FILENAME=automations.db) pour
// conserver l'historique. Défaut générique `jobs.db`.
export const dbFilePath = join(dataDir, process.env.DB_FILENAME || "jobs.db");

// Type annoté explicitement : sans ça, `declaration: true` échoue en TS4023
// (le type par défaut de better-sqlite3 n'est pas nommable dans le .d.ts généré).
export const db: Database.Database = new Database(dbFilePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

migrate(db);

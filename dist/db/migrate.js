import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
// Runner de migrations minimal : chaque fichier .sql sous migrations/ est appliqué
// une seule fois, dans l'ordre lexical (préfixe numérique), dans sa propre transaction.
// `_migrations` est créée inline (pas via un fichier numéroté) pour éviter le problème
// de l'œuf-et-la-poule (il faut bien une table pour savoir quoi appliquer).
export function migrate(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at_ms INTEGER NOT NULL
    )
  `);
    const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map((r) => r.name));
    const files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    for (const file of files) {
        if (applied.has(file))
            continue;
        const sql = readFileSync(join(migrationsDir, file), "utf8");
        db.transaction(() => {
            db.exec(sql);
            db.prepare("INSERT INTO _migrations (name, applied_at_ms) VALUES (?, ?)").run(file, Date.now());
        })();
    }
}

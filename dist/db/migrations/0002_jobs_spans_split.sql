-- Sépare l'ancienne table `spans` (qui mélangeait racines de job et sous-étapes,
-- distinguées uniquement par `parent_span_id IS NULL`) en deux tables : `jobs`
-- (source de vérité applicative — un run = une ligne) et `spans` (sous-étapes,
-- FK obligatoire vers `jobs`). Voir CLAUDE.md / discussion : un span technique
-- observé hors de tout contexte de job (ex: fetch() hors withSpan) ne peut plus
-- s'insérer nulle part — il n'y a plus de notion de "span racine" ambiguë.
--
-- Les deux anciennes tables sont renommées AVANT de recréer `spans`/`logs` sous
-- leur nom final (plutôt que via une table `_new` intermédiaire) : les noms
-- d'index sont globaux en SQLite (pas scopés par table), donc créer un
-- `idx_logs_span_id` pendant que l'ancienne table `logs` (avec son propre index
-- du même nom, posé par 0001_init.sql) existe encore fait échouer la migration
-- avec "index idx_logs_span_id already exists" — repro le 2026-07-08 en testant
-- cette migration sur une DB fraîche avant de la committer. `ALTER TABLE RENAME`
-- ne renomme PAS les index existants (ils gardent leur nom d'origine, juste
-- rattachés à la table renommée) : il faut donc aussi les DROP explicitement
-- avant de recréer des index de même nom sur les nouvelles tables — deuxième
-- piège trouvé en re-testant après le premier fix.
ALTER TABLE spans RENAME TO spans_old;
ALTER TABLE logs RENAME TO logs_old;
DROP INDEX idx_spans_trace_id;
DROP INDEX idx_spans_root_started;
DROP INDEX idx_spans_job_root;
DROP INDEX idx_spans_status_root;
DROP INDEX idx_logs_span_id;

CREATE TABLE jobs (
  id               TEXT PRIMARY KEY,
  trace_id         TEXT NOT NULL,
  job              TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('running', 'ok', 'error', 'interrupted')),
  status_message   TEXT NULL,
  started_at_ms    REAL NOT NULL,
  ended_at_ms      REAL NULL,
  duration_ms      REAL NULL,
  attributes       TEXT NOT NULL DEFAULT '{}',
  input_json       TEXT NULL,
  error_type       TEXT NULL,
  error_message    TEXT NULL,
  error_stacktrace TEXT NULL
);
CREATE INDEX idx_jobs_started ON jobs(started_at_ms DESC);
CREATE INDEX idx_jobs_job_started ON jobs(job, started_at_ms DESC);
CREATE INDEX idx_jobs_status_started ON jobs(status, started_at_ms DESC);

CREATE TABLE spans (
  id               TEXT PRIMARY KEY,
  job_id           TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  parent_span_id   TEXT NULL REFERENCES spans(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('running', 'ok', 'error', 'interrupted')),
  status_message   TEXT NULL,
  started_at_ms    REAL NOT NULL,
  ended_at_ms      REAL NULL,
  duration_ms      REAL NULL,
  attributes       TEXT NOT NULL DEFAULT '{}',
  error_type       TEXT NULL,
  error_message    TEXT NULL,
  error_stacktrace TEXT NULL
);
CREATE INDEX idx_spans_job_id ON spans(job_id, started_at_ms ASC);

CREATE TABLE logs (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  TEXT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  span_id TEXT NULL REFERENCES spans(id) ON DELETE CASCADE,
  ts_ms   REAL NOT NULL,
  level   TEXT NOT NULL CHECK (level IN ('log', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  CHECK ((job_id IS NULL) != (span_id IS NULL))
);
CREATE INDEX idx_logs_job_id ON logs(job_id, ts_ms);
CREATE INDEX idx_logs_span_id ON logs(span_id, ts_ms);

-- Anciennes racines (parent_span_id IS NULL) -> jobs
INSERT INTO jobs (id, trace_id, job, status, status_message, started_at_ms, ended_at_ms, duration_ms, attributes, input_json, error_type, error_message, error_stacktrace)
SELECT id, trace_id, job, status, status_message, started_at_ms, ended_at_ms, duration_ms, attributes, input_json, error_type, error_message, error_stacktrace
FROM spans_old
WHERE parent_span_id IS NULL;

-- Anciens sous-spans -> spans, rattachés au job via la racine de leur trace ;
-- un sous-span dont le parent était la racine elle-même devient un enfant direct
-- du job (parent_span_id NULL), les autres gardent leur parent_span_id tel quel.
INSERT INTO spans (id, job_id, parent_span_id, name, status, status_message, started_at_ms, ended_at_ms, duration_ms, attributes, error_type, error_message, error_stacktrace)
SELECT s.id,
       root.id,
       CASE WHEN s.parent_span_id = root.id THEN NULL ELSE s.parent_span_id END,
       s.name, s.status, s.status_message, s.started_at_ms, s.ended_at_ms, s.duration_ms, s.attributes,
       s.error_type, s.error_message, s.error_stacktrace
FROM spans_old s
JOIN spans_old root ON root.trace_id = s.trace_id AND root.parent_span_id IS NULL
WHERE s.parent_span_id IS NOT NULL;

-- logs : un log attaché à une ancienne racine devient un log de job, sinon reste
-- un log de span.
INSERT INTO logs (job_id, span_id, ts_ms, level, message)
SELECT
  CASE WHEN root.id IS NOT NULL AND l.span_id = root.id THEN root.id ELSE NULL END,
  CASE WHEN root.id IS NOT NULL AND l.span_id = root.id THEN NULL ELSE l.span_id END,
  l.ts_ms, l.level, l.message
FROM logs_old l
LEFT JOIN spans_old root ON root.id = l.span_id AND root.parent_span_id IS NULL;

DROP TABLE logs_old;
DROP TABLE spans_old;

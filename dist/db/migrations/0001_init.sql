CREATE TABLE spans (
  id               TEXT PRIMARY KEY,
  trace_id         TEXT NOT NULL,
  parent_span_id   TEXT NULL REFERENCES spans(id) ON DELETE CASCADE,
  job              TEXT NOT NULL,
  name             TEXT NOT NULL,
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

CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_root_started ON spans(started_at_ms DESC) WHERE parent_span_id IS NULL;
CREATE INDEX idx_spans_job_root ON spans(job, started_at_ms DESC) WHERE parent_span_id IS NULL;
CREATE INDEX idx_spans_status_root ON spans(status, started_at_ms DESC) WHERE parent_span_id IS NULL;

CREATE TABLE logs (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  span_id TEXT NOT NULL REFERENCES spans(id) ON DELETE CASCADE,
  ts_ms   REAL NOT NULL,
  level   TEXT NOT NULL CHECK (level IN ('log', 'info', 'warn', 'error')),
  message TEXT NOT NULL
);
CREATE INDEX idx_logs_span_id ON logs(span_id, ts_ms);

CREATE TABLE _meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

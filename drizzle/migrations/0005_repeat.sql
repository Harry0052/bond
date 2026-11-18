ALTER TABLE users ADD COLUMN reminder_opt_in INTEGER NOT NULL DEFAULT 0;

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  body_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX templates_owner_idx ON templates(owner_id, created_at);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  commitment_id TEXT NOT NULL REFERENCES commitments(id),
  bond_id TEXT NOT NULL REFERENCES bonds(id),
  kind TEXT NOT NULL,
  due_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, commitment_id, kind, due_on)
);

CREATE INDEX reminders_user_idx ON reminders(user_id, created_at);

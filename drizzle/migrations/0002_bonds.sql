CREATE TABLE bonds (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  share_token_hash TEXT NOT NULL UNIQUE,
  share_nonce TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX bonds_creator_idempotency_idx ON bonds(creator_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX bonds_creator_idx ON bonds(creator_id, created_at);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  bond_id TEXT NOT NULL REFERENCES bonds(id),
  user_id TEXT REFERENCES users(id),
  invited_name TEXT NOT NULL,
  invitation_status TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX members_bond_idx ON members(bond_id, invitation_status);

CREATE INDEX members_user_idx ON members(user_id, invitation_status);

CREATE UNIQUE INDEX members_bond_user_idx ON members(bond_id, user_id) WHERE user_id IS NOT NULL;

CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  bond_id TEXT NOT NULL REFERENCES bonds(id),
  assigned_member_id TEXT REFERENCES members(id),
  title TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX commitments_bond_idx ON commitments(bond_id, due_at);

CREATE TABLE bond_events (
  id TEXT PRIMARY KEY,
  bond_id TEXT NOT NULL REFERENCES bonds(id),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX bond_events_bond_idx ON bond_events(bond_id, created_at);

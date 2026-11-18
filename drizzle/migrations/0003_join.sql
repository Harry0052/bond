CREATE TABLE acceptances (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL REFERENCES commitments(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (commitment_id, member_id, revision)
);

CREATE TABLE vote_questions (
  id TEXT PRIMARY KEY,
  bond_id TEXT NOT NULL REFERENCES bonds(id),
  prompt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  bond_id TEXT NOT NULL REFERENCES bonds(id),
  question_id TEXT NOT NULL REFERENCES vote_questions(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  vote TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (question_id, member_id)
);

CREATE INDEX decisions_bond_idx ON decisions(bond_id, created_at);

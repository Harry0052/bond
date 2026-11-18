ALTER TABLE commitments ADD COLUMN completed_at TEXT;
ALTER TABLE commitments ADD COLUMN completed_by TEXT REFERENCES users(id);

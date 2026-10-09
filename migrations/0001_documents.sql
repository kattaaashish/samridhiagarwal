-- Every piece of site content is one row: a JSON document in the same shape as seed/content.json
-- ({ _id, _type, ...fields }). `draft` holds unpublished edits; `published` is what the site shows.
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  draft TEXT,
  published TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);
CREATE INDEX documents_type ON documents (type);

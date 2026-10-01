-- Additive profile storage. Existing users, roles, and content are preserved.
CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id),whatsapp TEXT NOT NULL DEFAULT '',photo BLOB,updated_at TEXT NOT NULL);

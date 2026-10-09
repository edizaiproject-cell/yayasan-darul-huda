-- SQLite schema; runtime applies CREATE IF NOT EXISTS idempotently.
PRAGMA foreign_keys=ON;
CREATE TABLE academic_calendars (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE academics (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE agendas (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE announcements (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT,entity TEXT,entity_id TEXT,details TEXT,created_at TEXT NOT NULL);

CREATE TABLE business_units (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE donation_accounts (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE donation_programs (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,account_id TEXT REFERENCES donation_accounts(id));

CREATE TABLE donation_receipts(transaction_id TEXT PRIMARY KEY REFERENCES donation_transactions(id),receipt_number TEXT UNIQUE NOT NULL,receipt_generated_at TEXT NOT NULL,token TEXT UNIQUE NOT NULL,snapshot TEXT NOT NULL);

CREATE TABLE donation_sequences(day TEXT PRIMARY KEY,value INTEGER NOT NULL);

CREATE TABLE donation_transactions (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,program_id TEXT REFERENCES donation_programs(id), donor_id TEXT REFERENCES donors(id));

CREATE TABLE donation_updates (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,program_id TEXT REFERENCES donation_programs(id));

CREATE TABLE donor_phones(phone TEXT PRIMARY KEY,donor_id TEXT NOT NULL REFERENCES donors(id));

CREATE TABLE donors(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,source TEXT NOT NULL,profile TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,merged_into TEXT REFERENCES donors(id));

CREATE TABLE education_units (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE footer_links (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE galleries (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,unit_id TEXT REFERENCES education_units(id));

CREATE TABLE hero_slides (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE home_sections (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE library_items (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE login_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,until_at INTEGER NOT NULL);

CREATE TABLE media (id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT UNIQUE NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,private INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL, file_hash TEXT, width INTEGER, height INTEGER);

CREATE TABLE media_aliases(old_url TEXT PRIMARY KEY,media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE);

CREATE TABLE media_cleanup(url TEXT PRIMARY KEY,file_hash TEXT NOT NULL,canonical_url TEXT NOT NULL);

CREATE TABLE menu_items (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE pages (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE permissions (code TEXT PRIMARY KEY);

CREATE TABLE post_categories (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE posts (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,category_id TEXT REFERENCES post_categories(id));

CREATE TABLE program_highlights (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE registrations (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE role_permissions (role_id TEXT REFERENCES roles(id),permission TEXT REFERENCES permissions(code),PRIMARY KEY(role_id,permission));

CREATE TABLE roles (id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL);

CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);

CREATE TABLE sessions (token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires_at INTEGER NOT NULL);

CREATE TABLE site_settings (id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);

CREATE TABLE user_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id),whatsapp TEXT NOT NULL DEFAULT '',photo BLOB,updated_at TEXT NOT NULL);

CREATE TABLE users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL,role_id TEXT REFERENCES roles(id),active INTEGER NOT NULL DEFAULT 1,must_change INTEGER DEFAULT 1,created_at TEXT NOT NULL);

CREATE INDEX idx_academic_calendars_status ON academic_calendars(status,sort_order);

CREATE INDEX idx_academics_status ON academics(status,sort_order);

CREATE INDEX idx_agendas_status ON agendas(status,sort_order);

CREATE INDEX idx_announcements_status ON announcements(status,sort_order);

CREATE INDEX idx_business_units_status ON business_units(status,sort_order);

CREATE INDEX idx_donation_accounts_status ON donation_accounts(status,sort_order);

CREATE UNIQUE INDEX idx_donation_code ON donation_transactions(json_extract(data,'$.transaction_code'));

CREATE INDEX idx_donation_date ON donation_transactions(json_extract(data,'$.date'));

CREATE INDEX idx_donation_programs_status ON donation_programs(status,sort_order);

CREATE UNIQUE INDEX idx_donation_submission ON donation_transactions(json_extract(data,'$.submission_key')) WHERE json_extract(data,'$.submission_key') IS NOT NULL;

CREATE INDEX idx_donation_transactions_status ON donation_transactions(status,sort_order);

CREATE INDEX idx_donation_updates_status ON donation_updates(status,sort_order);

CREATE INDEX idx_donor_phone_owner ON donor_phones(donor_id);

CREATE INDEX idx_donor_registered ON donors(created_at);

CREATE INDEX idx_education_units_status ON education_units(status,sort_order);

CREATE INDEX idx_footer_links_status ON footer_links(status,sort_order);

CREATE INDEX idx_galleries_status ON galleries(status,sort_order);

CREATE INDEX idx_hero_slides_status ON hero_slides(status,sort_order);

CREATE INDEX idx_home_sections_status ON home_sections(status,sort_order);

CREATE INDEX idx_library_items_status ON library_items(status,sort_order);

CREATE INDEX idx_media_hash ON media(private,file_hash);

CREATE INDEX idx_menu_items_status ON menu_items(status,sort_order);

CREATE INDEX idx_pages_status ON pages(status,sort_order);

CREATE INDEX idx_post_categories_status ON post_categories(status,sort_order);

CREATE INDEX idx_posts_status ON posts(status,sort_order);

CREATE INDEX idx_program_highlights_status ON program_highlights(status,sort_order);

CREATE INDEX idx_registrations_status ON registrations(status,sort_order);

CREATE INDEX idx_site_settings_status ON site_settings(status,sort_order);

CREATE INDEX idx_transaction_donor ON donation_transactions(donor_id);

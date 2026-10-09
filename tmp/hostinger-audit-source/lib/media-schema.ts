import type {DatabaseSync} from 'node:sqlite';
export function initializeMedia(db:DatabaseSync){
 const columns=new Set(db.prepare('PRAGMA table_info(media)').all().map((r:any)=>r.name));
 for(const [name,type] of [['file_hash','TEXT'],['width','INTEGER'],['height','INTEGER']])if(!columns.has(name))db.exec(`ALTER TABLE media ADD COLUMN ${name} ${type}`);
 db.exec(`CREATE INDEX IF NOT EXISTS idx_media_hash ON media(private,file_hash);
 CREATE TABLE IF NOT EXISTS media_aliases(old_url TEXT PRIMARY KEY,media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS media_cleanup(url TEXT PRIMARY KEY,file_hash TEXT NOT NULL,canonical_url TEXT NOT NULL);`);
}

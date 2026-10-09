import { writeFileSync } from 'node:fs';
import { db } from '../lib/database.ts';
const rows=db.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC,name").all() as {sql:string}[];
writeFileSync('migrations/001_initial.sql','-- SQLite schema; runtime applies CREATE IF NOT EXISTS idempotently.\nPRAGMA foreign_keys=ON;\n'+rows.map(r=>r.sql+';').join('\n\n')+'\n');
console.log('Schema migration exported.');

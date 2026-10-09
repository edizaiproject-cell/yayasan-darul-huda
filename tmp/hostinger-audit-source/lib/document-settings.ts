import {db,records,audit,atomic} from './database.ts';
import {normalizeDocumentSettings} from './document-template.ts';
export function documentProfile(){const p=records('site_settings',true)[0]||{};return {name:p.name||'',logo:p.logo||'',address:p.address||'',phone:p.phone||p.whatsapp||'',email:p.email||'',website:p.website||''};}
export function getDocumentSettings(){const row=db.prepare('SELECT data FROM document_settings WHERE id=1').get() as any;return normalizeDocumentSettings(row?JSON.parse(row.data):{},records('site_settings',true)[0]||{});}
export function saveDocumentSettings(input:any,actor:string){const value=normalizeDocumentSettings(input,records('site_settings',true)[0]||{});return atomic(()=>{db.prepare('INSERT INTO document_settings VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify(value));audit(actor,'update','document_settings','1',{after:value});return value;});}
export function pdfInstitution(){return {...(records('site_settings',true)[0]||{}),documentSettings:getDocumentSettings()};}

import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {db} from './database.ts';
export function servePublicMedia(file:string){
 if(!/^[a-f0-9-]{36}\.(webp|png|jpg|pdf|doc|docx|xlsx)$/.test(file))return new Response('Tidak ditemukan',{status:404});
 const alias=db.prepare('SELECT m.url FROM media_aliases a JOIN media m ON m.id=a.media_id WHERE a.old_url=? AND m.private=0').get('/uploads/'+file) as any;
 if(alias)return new Response(null,{status:308,headers:{Location:alias.url}});
 const media=db.prepare('SELECT * FROM media WHERE url=? AND private=0').get('/uploads/'+file) as any,path=resolve('public/uploads',file);
 if(!media||!existsSync(path))return new Response('Tidak ditemukan',{status:404});
 return new Response(readFileSync(path),{headers:{'Content-Type':media.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable',...(!media.mime.startsWith('image/')?{'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(media.title)}`}:{})}});
}

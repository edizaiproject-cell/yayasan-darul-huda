import sharp from 'sharp';
import {readFileSync,existsSync} from 'node:fs';
import {db} from './database.ts';
import {mediaPath} from './media-service.ts';
import {mediaPresets,type MediaPurpose} from './media-presets.ts';
const cache=new Map<string,Buffer>();let cacheSize=0;
export async function serveMediaImage(query:URLSearchParams){
 const src=query.get('src')||'',purpose=query.get('purpose') as MediaPurpose,p=mediaPresets[purpose];
 if(!/^\/(media|uploads)\/[\w.-]+$/.test(src)||!p||!p.width)return new Response('Gambar tidak valid',{status:400});
 const row=(db.prepare('SELECT * FROM media WHERE url=? AND private=0').get(src)||db.prepare('SELECT m.* FROM media_aliases a JOIN media m ON m.id=a.media_id WHERE a.old_url=? AND m.private=0').get(src)) as any;
 if(!row?.mime.startsWith('image/')||!existsSync(mediaPath(row.url)))return new Response('Tidak ditemukan',{status:404});
 const key=row.id+'?'+query.toString();let output=cache.get(key);
 if(!output){
  let image=sharp(readFileSync(mediaPath(row.url)),{limitInputPixels:40000000}).rotate();const {info,data}=await image.toBuffer({resolveWithObject:true});image=sharp(data);
  if(['x','y','w','h'].some(k=>query.has(k))){
   if(purpose==='qr'||purpose==='logo'||purpose==='article')return new Response('Crop tidak tersedia',{status:400});
   const [x,y,w,h]=['x','y','w','h'].map(k=>Number(query.get(k)));
   if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>1.00002||y+h>1.00002)return new Response('Crop tidak valid',{status:400});
   const left=Math.min(info.width-1,Math.round(x*info.width)),top=Math.min(info.height-1,Math.round(y*info.height));
   image=image.extract({left,top,width:Math.max(1,Math.min(info.width-left,Math.round(w*info.width))),height:Math.max(1,Math.min(info.height-top,Math.round(h*info.height)))});
  }
  output=await image.resize({width:p.width,withoutEnlargement:true}).webp(purpose==='logo'||purpose==='qr'?{lossless:true}:{quality:88}).toBuffer();
  if(output.length<32*1024*1024){while(cacheSize+output.length>32*1024*1024&&cache.size){const first=cache.keys().next().value!;cacheSize-=cache.get(first)!.length;cache.delete(first);}cache.set(key,output);cacheSize+=output.length;}
 }
 return new Response(new Uint8Array(output),{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
}

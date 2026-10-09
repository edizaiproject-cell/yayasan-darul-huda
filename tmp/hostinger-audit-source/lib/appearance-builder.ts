import {appearanceDefaults,type AppearanceRow as Row} from './appearance.ts';

export const customSections=['custom','cta','statistik','testimoni','video','cards'];
export const heroEffects=[['fade','Fade'],['slide','Slide'],['split','Split'],['zoom','Zoom lembut'],['reveal','Reveal'],['random','Random terkontrol']];
export function moveAppearance(rows:Row[],id:string,target:string){
 const from=rows.findIndex(r=>r.id===id),to=rows.findIndex(r=>r.id===target);
 if(from<0||to<0||from===to)return rows;
 const next=[...rows];next.splice(to,0,next.splice(from,1)[0]);return next.map((r,i)=>({...r,sort_order:i}));
}
export function appearanceChanges(before:Row[],after:Row[]){
 const clean=(r:Row)=>JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>!['updated_at','created_at','sort_order'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));
 return after.filter(r=>!before.some(b=>b.id===r.id&&clean(b)===clean(r))).length+before.filter(b=>!after.some(r=>r.id===b.id)).length+(before.map(r=>r.id).join()===after.map(r=>r.id).join()?0:1);
}
export function visibleHeroes(rows:Row[],now=Date.now()){
 return rows.filter(r=>r.status==='published'&&r.showOnHome!==false&&(!r.startsAt||Date.parse(r.startsAt)<=now)&&(!r.endsAt||Date.parse(r.endsAt)>now));
}
export function heroFallback(settings:Row={}){return appearanceDefaults('hero_slides',{id:'hero-fallback',title:settings.name||'Darul Huda',summary:settings.description||'Pendidikan untuk semua kalangan.',image:settings.heroImage||'/media/image2.png',alt:settings.name||'Darul Huda',status:'published',primaryType:'none',secondaryType:'none'});}
export function heroEffect(value:string,serial:number):string {return ({slide:'slide',split:'split',zoom:'zoom',reveal:'diagonal',fade:'fade'} as Record<string,string>)[value]||['panels','diagonal','zoom','split','curtain'][serial%5];}
export function gallerySelection(section:Row,feed:any[]){return feed.filter(p=>!section.albumId||p.id.startsWith('gallery-'+section.albumId+'-')).slice(0,section.limit||10);}

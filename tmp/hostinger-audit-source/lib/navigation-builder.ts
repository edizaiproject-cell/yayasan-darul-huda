import {validateAppearanceCollection,type AppearanceRow as Row} from './appearance.ts';
export function moveMenu(rows:Row[],id:string,target:string,where:'before'|'after'|'inside'|'root'='before'){
 if(id===target)return rows;
 const item=rows.find(r=>r.id===id),destination=rows.find(r=>r.id===target);
 if(!item||where!=='root'&&!destination)return rows;
 const next=rows.filter(r=>r.id!==id).map(r=>({...r}));
 const moved={...item,parentId:where==='root'?'':where==='inside'?target:destination?.parentId||''};
 const index=where==='root'?next.length:next.findIndex(r=>r.id===target)+(where==='before'?0:1);
 next.splice(index,0,moved);validateAppearanceCollection('menu_items',next);return next;
}
export function menuChanges(before:Row[],after:Row[]){
 const signature=(r:Row,list:Row[])=>JSON.stringify({...r,sort_order:undefined,position:list.filter(x=>(x.parentId||'')===(r.parentId||'')).findIndex(x=>x.id===r.id)});
 return after.filter(r=>{const old=before.find(x=>x.id===r.id);return !old||signature(old,before)!==signature(r,after)}).length+before.filter(r=>!after.some(x=>x.id===r.id)).length;
}
export function matchingMenuIds(rows:Row[],query:string,filter:string,incomplete:Set<string>){
 const q=query.trim().toLocaleLowerCase('id'),shown=new Set<string>();
 for(const r of rows){const parent=rows.find(x=>x.id===r.parentId);if(![r.title,r.url,parent?.title].some(s=>String(s||'').toLocaleLowerCase('id').includes(q)))continue;
  if(filter==='active'&&r.status!=='published'||filter==='hidden'&&r.status==='published'||filter==='incomplete'&&!incomplete.has(r.id)||filter==='parent'&&r.parentId||filter==='child'&&!r.parentId)continue;
  let node:Row|undefined=r;const visited=new Set();while(node&&!visited.has(node.id)){shown.add(node.id);visited.add(node.id);node=rows.find(x=>x.id===node!.parentId)}
 }return shown;
}

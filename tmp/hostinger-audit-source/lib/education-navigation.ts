type Row=Record<string,any>;
// Unit detail links use the same published collection as the listing and detail routes.
export function visibleEducationMenu(items:Row[],units:Row[]){
 const urls=new Set(units.map(unit=>'/pendidikan/'+unit.slug));
 return items.filter(item=>!String(item.url||'').startsWith('/pendidikan/')||urls.has(String(item.url).split(/[?#]/)[0]));
}
export function educationSubmenu(items:Row[]){
 const parent=items.find(r=>(r.parentId!==undefined?!r.parentId:!r.parent)&&(r.title==='Pendidikan'||r.url==='/pendidikan'));
 if(!parent)return null;
 const children=items.filter(r=>r.parentId!==undefined?r.parentId===parent.id:r.parent===parent.title);
 const existing=children.find(r=>r.url==='/pendidikan');
 return {...existing,title:'Unit Pendidikan',slug:existing?.slug||'pendidikan-unit-pendidikan',url:'/pendidikan',parent:parent.title,parentId:parent.id,targetType:'internal',status:'published',sort_order:Math.min(0,...children.map(r=>Number(r.sort_order)||0))-1};
}

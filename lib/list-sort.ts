export function parseSort(value='') {const [key,direction]=value.split(':');return {key:key==='sort_order'?'':key,direction:direction==='desc'?'desc' as const:'asc' as const};}
export function nextSort(value:string,key:string){const current=parseSort(value);return current.key!==key?key+':asc':current.direction==='asc'?key+':desc':'';}
const collator=new Intl.Collator('id',{numeric:true,sensitivity:'base'});
export function sortRows<T>(rows:T[],sort:string,value:(row:T,key:string)=>unknown=(row,key)=>(row as any)[key]):T[]{
 const {key,direction}=parseSort(sort);if(!key)return rows;
 return [...rows].sort((a,b)=>{const x=value(a,key),y=value(b,key);if(x==null||x==='')return y==null||y===''?0:1;if(y==null||y==='')return -1;const n=typeof x==='number'&&typeof y==='number'?x-y:collator.compare(String(x),String(y));return direction==='desc'?-n:n;});
}
/** Only server-owned expressions can become SQL; unrecognized input restores the default. */
export function sqlSort(q:URLSearchParams,allowed:Record<string,string|string[]>,fallback:string){const {key,direction}=parseSort(q.get('sort')||'');const expression=Object.hasOwn(allowed,key)?allowed[key]:null;const dir=q.get('direction')==='desc'||(!q.has('direction')&&direction==='desc')?'DESC':'ASC';return expression?(Array.isArray(expression)?expression:[expression]).map(e=>e+' '+dir).join(','):fallback;}

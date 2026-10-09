'use client';
import {useSearchParams} from 'next/navigation';
import {ListToolbar} from './list-toolbar';
import {matchesListSearch} from '../lib/list-search';
import {useEffect,useState,type ReactNode} from 'react';
import {publicSearchPolicy} from '../lib/public-search-policy';
type Row=Record<string,any>;
export function FilterChips({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){return <div className="public-filter-chips" role="group" aria-label={label}>{options.map(o=><button type="button" key={o.value} aria-pressed={value===o.value} onClick={()=>onChange(o.value)}>{o.label}</button>)}</div>}
export function PublicCollection({kind,title,items,options,children}:{kind:string;title:string;items:Row[];options:{value:string;label:string}[];children:(items:Row[])=>ReactNode}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(1);
 const params=useSearchParams(),linkedCategory=params?.get('category')||'';
 useEffect(()=>{setCategory(options.some(o=>o.value===linkedCategory)?linkedCategory:'');setPage(1)},[linkedCategory,kind]);
 const policy=publicSearchPolicy(kind,items.length,options.length),reset=()=>{setQuery('');setCategory('');setStatus('');setPage(1)};
 const matches=items.filter(r=>matchesListSearch({...r,categoryLabel:options.find(o=>o.value===(r.categoryId||r.category||r.level))?.label},query)&&(!category||(r.categoryId||r.category||r.level)===category)&&(!status||r.status===status));
 const pages=policy.paginate?Math.ceil(matches.length/policy.pageSize):1,current=Math.min(page,Math.max(1,pages)),visible=policy.paginate?matches.slice((current-1)*policy.pageSize,current*policy.pageSize):matches,filtered=!!(query||category||status);
 return <>{(policy.search||policy.categories||policy.statuses)&&<div className="public-discovery">
 <ListToolbar query={query} onQuery={q=>{setQuery(q);setPage(1)}} placeholder={'Cari '+title.toLowerCase()+', kategori, penulis, tanggal...'} values={{category,status}} onFilters={v=>{setCategory(v.category||'');setStatus(v.status||'');setPage(1)}} fields={[...(policy.categories?[{key:'category',label:'Kategori',options:options.map(o=>[o.value,o.label] as [string,string])}]:[]),...(policy.statuses?[{key:'status',label:'Status',options:[['active','Aktif'],['achieved','Tercapai'],['completed','Selesai'],['closed','Ditutup']] as [string,string][]}]:[])]}/>
 {filtered&&matches.length>0&&<div className="public-filter-feedback"><span role="status">{matches.length} hasil</span><button type="button" onClick={reset}>Reset Filter</button></div>}
 </div>}
 {visible.length?children(visible):<div className="empty"><h3>{filtered?'Tidak ada '+title.toLowerCase()+' yang sesuai dengan pencarian.':'Belum ada '+title.toLowerCase()+'.'}</h3><p>{filtered?'Coba kata kunci atau kategori lain.':'Informasi akan tersedia setelah diterbitkan oleh pengelola Ma’had.'}</p>{filtered&&<button type="button" onClick={reset}>Reset Filter</button>}</div>}
 {pages>1&&<nav className="pagination" aria-label={'Halaman '+title}>{Array.from({length:pages},(_,i)=><button type="button" key={i} aria-current={current===i+1?'page':undefined} className={current===i+1?'selected':''} onClick={()=>setPage(i+1)}>{i+1}</button>)}</nav>}</>;
}

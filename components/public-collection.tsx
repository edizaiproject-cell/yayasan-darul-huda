'use client';
import {useState,type ReactNode} from 'react';
import {publicSearchPolicy} from '../lib/public-search-policy';
type Row=Record<string,any>;
export function FilterChips({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){return <div className="public-filter-chips" role="group" aria-label={label}>{options.map(o=><button type="button" key={o.value} aria-pressed={value===o.value} onClick={()=>onChange(o.value)}>{o.label}</button>)}</div>}
export function PublicCollection({kind,title,items,options,children}:{kind:string;title:string;items:Row[];options:{value:string;label:string}[];children:(items:Row[])=>ReactNode}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(1);
 const policy=publicSearchPolicy(kind,items.length,options.length),reset=()=>{setQuery('');setCategory('');setStatus('');setPage(1)};
 const matches=items.filter(r=>(r.title+' '+(r.author||'')+' '+(r.summary||'')).toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id'))&&(!category||(r.categoryId||r.category||r.level)===category)&&(!status||r.status===status));
 const pages=policy.paginate?Math.ceil(matches.length/policy.pageSize):1,current=Math.min(page,Math.max(1,pages)),visible=policy.paginate?matches.slice((current-1)*policy.pageSize,current*policy.pageSize):matches,filtered=!!(query||category||status);
 return <>{(policy.search||policy.categories||policy.statuses)&&<div className="public-discovery">
 {policy.search&&<div className="public-search-toolbar"><label>Cari {title.toLowerCase()}<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Judul atau kata kunci…"/></label>{policy.categories&&kind!=='galeri'&&<label>Kategori<select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="">Semua kategori</option>{options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></label>}</div>}
 {policy.categories&&(!policy.search||kind==='galeri')&&<FilterChips label="Kategori" value={category} options={[{value:'',label:'Semua'},...options]} onChange={v=>{setCategory(v);setPage(1)}}/>}
 {policy.statuses&&<FilterChips label="Status program donasi" value={status} options={[{value:'',label:'Semua status'},{value:'active',label:'Aktif'},{value:'achieved',label:'Tercapai'},{value:'completed',label:'Selesai'},{value:'closed',label:'Ditutup'}]} onChange={v=>{setStatus(v);setPage(1)}}/>}
 {filtered&&matches.length>0&&<div className="public-filter-feedback"><span role="status">{matches.length} hasil</span><button type="button" onClick={reset}>Reset Filter</button></div>}
 </div>}
 {visible.length?children(visible):<div className="empty"><h3>{filtered?'Tidak ada '+title.toLowerCase()+' yang sesuai dengan pencarian.':'Belum ada '+title.toLowerCase()+'.'}</h3><p>{filtered?'Coba kata kunci atau kategori lain.':'Informasi akan tersedia setelah diterbitkan oleh pengelola Ma’had.'}</p>{filtered&&<button type="button" onClick={reset}>Reset Filter</button>}</div>}
 {pages>1&&<nav className="pagination" aria-label={'Halaman '+title}>{Array.from({length:pages},(_,i)=><button type="button" key={i} aria-current={current===i+1?'page':undefined} className={current===i+1?'selected':''} onClick={()=>setPage(i+1)}>{i+1}</button>)}</nav>}</>;
}

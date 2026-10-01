'use client';
import Link from 'next/link';
import {useState} from 'react';
import {AdminIcon} from './admin-icons';
import {imagePosition} from '../lib/media-presets';
type Row=Record<string,any>;

const icons:Record<string,string>={tentang:'book',sejarah:'clock','struktur-organisasi':'people'};
function ProfileIcon({slug}:{slug:string}){
 if(slug==='visi-misi')return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
 return <AdminIcon name={icons[slug]||(slug==='usaha'?'Lembaga':slug==='akademik'?'book':'Informasi')}/>;
}
export function ProfileMenu({pages,active}:{pages:Row[];active:string}){
 const [open,setOpen]=useState(false);
 const links=[...pages.filter(r=>r.showMenu!==false).map(r=>({slug:r.slug,title:r.title,url:'/profil/'+r.slug})),{slug:'usaha',title:'Usaha Ma’had',url:'/usaha'},{slug:'akademik',title:'Akademik & Kurikulum',url:'/akademik'}];
 return <aside className="profile-menu">
  <p className="profile-menu-label">JELAJAHI MA’HAD</p>
  <button type="button" className="profile-menu-toggle" aria-expanded={open} aria-controls="profile-navigation" onClick={()=>setOpen(!open)}><span>{links.find(r=>r.slug===active)?.title||'Halaman profil'}</span><AdminIcon name={open?'close':'menu'}/></button>
  <nav id="profile-navigation" aria-label="Halaman profil" className={open?'is-open':''}>
   {links.map((r,index)=><Link key={r.url} href={r.url} className={'profile-menu-tile tone-'+index%3+(r.slug===active?' selected':'')} aria-current={r.slug===active?'page':undefined} onClick={()=>setOpen(false)}><span className="profile-menu-icon"><ProfileIcon slug={r.slug}/></span><span>{r.title}</span><span className="profile-menu-arrow"><AdminIcon name={r.slug===active?'check':'chevron'}/></span></Link>)}
  </nav>
 </aside>;
}
export function ProfileVisual({item,fallback}:{item:Row;fallback?:Row}){
 const image=item.image||fallback?.image;
 if(!image)return <div className="profile-visual-placeholder" aria-hidden="true"><AdminIcon name="quran"/><span>Ma’had Al-Qur’an Darul Huda</span></div>;
 const organization=item.slug==='struktur-organisasi'&&!!item.image;
 return <figure className={'profile-visual'+(organization?' is-organization':'')}><img src={image} alt={item.image?(item.alt||item.title):(fallback?.alt||'Ma’had Al-Qur’an Darul Huda')} style={{objectPosition:imagePosition(image)}} loading="lazy"/>{!item.image&&<figcaption>Ma’had Al-Qur’an Darul Huda</figcaption>}</figure>;
}

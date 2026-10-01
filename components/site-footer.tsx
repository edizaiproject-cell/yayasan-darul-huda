'use client';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {AdminIcon} from './admin-icons';
import {SocialIcon} from './social-icon';
import {contactSocials,contactWhatsapp,contactUrl} from '../lib/contact';
type Row=Record<string,any>;
function FooterIcon({kind}:{kind:string}){
 if(kind==='whatsapp')return <SocialIcon platform="whatsapp"/>;
 const paths:Record<string,string>={address:'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',email:'M3 5h18v14H3z M3 6l9 7 9-7',phone:'m5 3 4 1 1 5-3 2c2 3 3 4 6 6l2-3 5 1 1 4c0 2-2 3-4 2C9 19 5 15 3 7 2 5 3 3 5 3Z'};
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]||paths.address}/></svg>;
}
export function SiteFooter({rows,settings:s,managed=false,contactVisible=true}:{rows:Row[];settings:Row;managed?:boolean;contactVisible?:boolean}){
 const active=rows.filter(r=>!r.status||r.status==='published');
 const config=active.find(r=>r.kind==='settings')||{};
 const contact={...s,...Object.fromEntries(['address','email','phone','whatsapp','maps'].filter(k=>config[k]).map(k=>[k,config[k]]))};
 const links=active.filter(r=>!r.kind||r.kind==='link');
 const groups=[...(links.some(r=>!r.groupId)?[{id:'',title:'Jelajahi'}]:[]),...active.filter(r=>r.kind==='group')];
 const socials=active.filter(r=>r.kind==='social').map((r):Row=>({...r,url:r.useCentral?(r.platform==='whatsapp'?contactWhatsapp(s):contactUrl(s[r.platform])):contactUrl(r.url)})).filter(r=>r.url);
 const central=[...contactSocials(s).map(r=>({id:'central-'+r.platform,platform:r.platform,title:r.label,url:r.href,newTab:true})),...(contactWhatsapp(s)?[{id:'central-whatsapp',platform:'whatsapp',title:'WhatsApp',url:contactWhatsapp(s),newTab:true}]:[])];
 const visibleSocials=[...socials,...(managed?[]:central.filter(r=>!socials.some(a=>a.platform===r.platform)))];
 const showContact=contactVisible&&config.showContact!==false;
 const columns=['minmax(0,1.25fr)',...groups.map(()=>'minmax(0,.8fr)'),...(showContact?['minmax(0,1.35fr)']:[]),...(visibleSocials.length?['minmax(0,.65fr)']:[])].join(' ');
 return <footer className="managed-footer"><div className="container managed-footer-grid" style={{'--footer-columns':columns} as CSSProperties}>
  <div className="footer-identity"><Link href="/" className="brand"><span className="footer-logo-panel"><img src={s.logo||'/media/image1.png'} alt="Logo Darul Huda"/></span><span><small>MA’HAD AL-QUR’AN</small><strong>{s.shortName||'DARUL HUDA'}</strong></span></Link><p>{s.footer||s.description}</p></div>
  {groups.map(g=><div className="footer-links" key={g.id}><h3>{g.title}</h3>{links.filter(r=>(r.groupId||'')===g.id).map(r=><Link className="footer-link-row" key={r.id} href={r.url||'/'} target={r.newTab?'_blank':undefined} rel={r.newTab?'noopener noreferrer':undefined}><AdminIcon name={String(r.url).startsWith('/profil')?'book':String(r.url).startsWith('/pendidikan')?'Lembaga':String(r.url).startsWith('/donasi')?'Donasi':String(r.url).startsWith('/kontak')?'people':'chevron'}/><span>{r.title}{r.newTab?' ↗':''}</span></Link>)}</div>)}
  {showContact&&<div className="footer-contact"><h3>Kontak</h3>{contact.address&&(contact.maps?<a className="footer-link-row" href={contact.maps} target="_blank" rel="noopener noreferrer"><FooterIcon kind="address"/><span>{contact.address}</span></a>:<p className="footer-link-row"><FooterIcon kind="address"/><span>{contact.address}</span></p>)}{contact.email&&<a className="footer-link-row" href={'mailto:'+contact.email}><FooterIcon kind="email"/><span>{contact.email}</span></a>}{contact.phone&&<a className="footer-link-row" href={'tel:'+String(contact.phone).replace(/[^\d+]/g,'')}><FooterIcon kind="phone"/><span>{contact.phone}</span></a>}{contactWhatsapp(contact)&&<a className="footer-link-row" href={contactWhatsapp(contact)}><FooterIcon kind="whatsapp"/><span>WhatsApp ↗</span></a>}{contact.maps&&<a className="footer-link-row" href={contact.maps} target="_blank" rel="noopener noreferrer"><FooterIcon kind="address"/><span>Google Maps ↗</span></a>}</div>}
  {visibleSocials.length>0&&<div className="footer-social-block"><h3>Media Sosial</h3><div className="footer-socials">{visibleSocials.map(r=><a key={r.id} href={r.url} aria-label={r.title||r.platform} title={r.title||r.platform} target={r.newTab?'_blank':undefined} rel="noopener noreferrer"><SocialIcon platform={r.platform==='x'?'twitter':r.platform||'lainnya'}/></a>)}</div></div>}
 </div><div className="container footer-bottom"><span>{s.copyright||`© ${new Date().getFullYear()} ${s.name||'Ma’had Al-Qur’an Darul Huda'}.`}</span><Link href="/admin"><AdminIcon name="Sistem"/>Portal Admin <span aria-hidden="true">↗</span></Link></div></footer>;
}

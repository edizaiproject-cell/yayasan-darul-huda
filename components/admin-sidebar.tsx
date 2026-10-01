'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {AdminIcon} from './admin-icons';

const groups:[string,[string,string][]][]=[
 ['Konten',[['posts','Berita & Wawasan'],['post_categories','Kategori Berita'],['galleries','Album Galeri'],['library_items','Pustaka']]],
 ['Lembaga',[['pages','Profil & Halaman'],['education_units','Unit Pendidikan'],['program_highlights','Program Unggulan'],['academics','Akademik & Kurikulum'],['business_units','Usaha Ma’had']]],
 ['Informasi',[['registrations','Pendaftaran'],['announcements','Pengumuman'],['agendas','Agenda'],['academic_calendars','Kalender Pendidikan']]],
 ['Donasi',[['donation_programs','Program Donasi'],['donation_transactions','Transaksi Donasi'],['donors','Daftar Donatur'],['donation_updates','Perkembangan Donasi'],['donation_accounts','Rekening Donasi']]],
 ['Tampilan',[['hero_slides','Hero Beranda'],['home_sections','Susunan Beranda'],['menu_items','Menu Navigasi'],['footer_links','Tautan Footer']]],
 ['Sistem',[['media','Media Library'],['site_settings','Pengaturan Website'],['users','Pengguna'],['roles','Hak Akses'],['audit','Audit Log'],['password','Ganti Kata Sandi']]]
];
export function UserAvatar({user}:{user:Record<string,any>}){return <span className="user-avatar">{user.avatar_url?<img src={user.avatar_url} alt={'Foto '+user.name}/>:<span aria-label={'Inisial '+user.name}>{String(user.name||'Admin').trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</span>}</span>}

export function SidebarSection({title,items,active,open,onToggle,onNavigate}:{title:string;items:[string,string][];active:string;open:boolean;onToggle:()=>void;onNavigate:(name:string)=>void}){
 const selected=items.some(([id])=>id===active),id='sidebar-'+title.toLowerCase();
 return <section className={'sidebar-section '+(selected?'has-active':'')}>
  <button className={'sidebar-main '+(open?'is-open':'')} aria-expanded={open} aria-controls={id} onClick={onToggle} title={title}><AdminIcon name={title}/><span className="nav-label">{title}</span><span className={'nav-chevron '+(open?'rotated':'')}><AdminIcon name="chevron"/></span></button>
  <div id={id} className={'sidebar-submenu '+(open?'expanded':'')} inert={!open} aria-hidden={!open}><div><div className="submenu-items">{items.map(([name,label])=><button key={name} aria-current={active===name?'page':undefined} className={active===name?'selected':''} onClick={()=>onNavigate(name)}>{label}</button>)}</div></div></div>
 </section>
}

export function AdminSidebar({user,active,allowed,navigate,logout,drawer,closeDrawer,collapsed,setCollapsed}:{user:Record<string,any>;active:string;allowed:(name:string)=>boolean;navigate:(name:string)=>void;logout:()=>void;drawer:boolean;closeDrawer:()=>void;collapsed:boolean;setCollapsed:(v:boolean)=>void}){
 const [opened,setOpened]=useState(''),[account,setAccount]=useState(false);
 const sidebar=useRef<HTMLElement>(null),accountRef=useRef<HTMLDivElement>(null),profileButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{setOpened(groups.find(([,items])=>items.some(([name])=>name===active))?.[0]||'')},[active]);
 useEffect(()=>{if(!account)return;accountRef.current?.querySelector<HTMLButtonElement>('.account-popover button')?.focus();const click=(e:PointerEvent)=>{if(!accountRef.current?.contains(e.target as Node))setAccount(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setAccount(false);profileButton.current?.focus()}};document.addEventListener('pointerdown',click);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',click);document.removeEventListener('keydown',key)}},[account]);
 useEffect(()=>{if(!drawer)return;const previous=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';sidebar.current?.querySelector<HTMLButtonElement>('.drawer-close')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeDrawer()}if(e.key==='Tab'){const nodes=Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]).filter(el=>!el.closest('[inert]')&&el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()}},[drawer,closeDrawer]);
 return <><aside ref={sidebar} id="admin-navigation" aria-label="Navigasi admin" className={'admin-sidebar '+(drawer?'open':'')}>
  <div className="sidebar-header"><Link className="brand" href="/" title="Website Darul Huda"><img src="/media/image1.png" alt="Logo Darul Huda"/><span className="nav-label"><small>PORTAL PENGELOLA</small><strong>DARUL HUDA</strong></span></Link><button className="sidebar-collapse" aria-label={collapsed?'Perluas sidebar':'Ringkas sidebar'} onClick={()=>{setCollapsed(!collapsed);setAccount(false)}}><AdminIcon name={collapsed?'menu':'collapse'}/></button><button className="drawer-close" aria-label="Tutup menu admin" onClick={closeDrawer}><AdminIcon name="close"/></button></div>
  <nav className="sidebar-navigation" aria-label="Menu dashboard"><button title="Dashboard" className={'sidebar-main '+(active==='dashboard'?'selected':'')} aria-current={active==='dashboard'?'page':undefined} onClick={()=>navigate('dashboard')}><AdminIcon name="dashboard"/><span className="nav-label">Dashboard</span></button>{groups.map(([title,items])=>{const visible=items.filter(([name])=>name==='password'||allowed(name));return visible.length?<SidebarSection key={title} title={title} items={visible} active={active} open={!collapsed&&opened===title} onToggle={()=>{if(collapsed){setCollapsed(false);setOpened(title)}else setOpened(opened===title?'':title)}} onNavigate={navigate}/>:null})}</nav>
  <div className="sidebar-account" ref={accountRef}>{account&&<div className="account-popover" id="account-options"><strong>Akun Saya</strong>{[['profile','Profil Saya'],['photo','Ganti Foto'],['password','Ganti Kata Sandi'],['profile','Pengaturan Akun']].map(([name,label])=><button key={label} onClick={()=>{setAccount(false);navigate(name)}}>{label}</button>)}<hr/><button className="danger-text" onClick={logout}>Keluar</button></div>}<button ref={profileButton} className="account-trigger" aria-label={'Akun '+user.name} aria-expanded={account} aria-controls="account-options" title={user.name+' · '+user.role_id} onClick={()=>setAccount(!account)}><UserAvatar user={user}/><span className="account-name nav-label"><strong>{user.name}</strong><small>{user.role_id}</small></span><span className="nav-label"><AdminIcon name="more"/></span></button></div>
 </aside>{drawer&&<button className="sidebar-backdrop" aria-label="Tutup panel navigasi" onClick={closeDrawer}/>}</>
}


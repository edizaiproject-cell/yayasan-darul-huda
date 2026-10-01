import {modules} from './modules.ts';
import {informationVisible,informationInstant} from './information-schema.ts';
import type {DashboardTarget,DashboardData} from './dashboard-types.ts';
type Row=Record<string,any>;
export const adminGroups:Record<string,string>={posts:'Konten',post_categories:'Konten',galleries:'Konten',library_items:'Konten',pages:'Lembaga',education_units:'Lembaga',program_highlights:'Lembaga',academics:'Lembaga',business_units:'Lembaga',registrations:'Informasi',announcements:'Informasi',agendas:'Informasi',academic_calendars:'Informasi',donation_programs:'Donasi',donation_transactions:'Donasi',donation_updates:'Donasi',donation_accounts:'Donasi',donors:'Donasi',hero_slides:'Tampilan',home_sections:'Tampilan',menu_items:'Tampilan',footer_links:'Tampilan',media:'Sistem',site_settings:'Sistem',users:'Sistem',roles:'Sistem',audit:'Sistem',profile:'Akun',password:'Akun'};
export const adminStatus:Record<string,string>={published:'Dipublikasikan',draft:'Draft',scheduled:'Terjadwal',archived:'Arsip',active:'Aktif',achieved:'Target tercapai',completed:'Selesai',closed:'Ditutup',valid:'Valid',pending:'Menunggu',expired:'Berakhir'};
export function searchAdmin(data:Row,query:string,allowed:(module:string)=>boolean){
 const q=query.trim().toLocaleLowerCase('id-ID');if(!q)return [];
 return Object.entries(modules).filter(([module])=>allowed(module)&&!['donation_transactions','site_settings'].includes(module)).flatMap(([module,meta])=>(Array.isArray(data[module])?data[module]:[]).filter((r:Row)=>String(r.title||'').toLocaleLowerCase('id-ID').includes(q)).map((r:Row)=>({title:String(r.title),label:meta.title,status:r.status,target:{module,id:r.id} as DashboardTarget}))).sort((a,b)=>Number(b.title.toLowerCase().startsWith(q))-Number(a.title.toLowerCase().startsWith(q))||a.title.localeCompare(b.title,'id')).slice(0,15);
}
export function announcementState(row:Row,now=Date.now()){
 if(row.status!=='published')return row.status==='archived'?'expired':'draft';
 if(informationVisible('announcements',row,now))return 'active';
 const starts=informationInstant(row.startsAt);
 return starts>now?'scheduled':'expired';
}
export function dashboardView(data:Row,allowed:(module:string)=>boolean,now=Date.now()){
 const rows=(module:string):Row[]=>allowed(module)&&Array.isArray(data[module])?data[module]:[];
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),month=today.slice(0,7);
 const content=['posts','galleries','library_items'].flatMap(module=>rows(module).map((r):Row=>({...r,module}))).sort((a,b)=>String(b.updated_at||b.created_at).localeCompare(String(a.updated_at||a.created_at))).slice(0,5);
 const agendas=rows('agendas').filter(r=>r.status==='published'&&r.eventStatus!=='Dibatalkan'&&r.date>=today&&informationVisible('agendas',r,now)).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,3);
 const announcements=rows('announcements').map((r):Row=>({...r,displayStatus:announcementState(r,now)})).sort((a,b)=>Number(b.displayStatus==='active')-Number(a.displayStatus==='active')||String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,3);
 const totals=new Map((data.donationTotals||[]).map((r:Row)=>[r.id,r]));
 const programs=rows('donation_programs').filter(r=>['active','achieved'].includes(r.status)).sort((a,b)=>Number(!!b.priority)-Number(!!a.priority)||Number(!!b.urgent)-Number(!!a.urgent)||a.sort_order-b.sort_order).slice(0,3).map((r):Row=>{const total=Number((totals.get(r.id) as Row)?.total||0),target=Number(r.target||0);return {...r,total,target,percentage:target>0?Math.max(0,total/target*100):null};});
 return {content,agendas,announcements,programs,activeAnnouncements:rows('announcements').filter(r=>announcementState(r,now)==='active').length,units:rows('education_units').length,monthPosts:rows('posts').filter(r=>r.status==='published'&&Number.isFinite(informationInstant(r.publishAt||r.created_at))&&informationInstant(r.publishAt||r.created_at)<=now&&new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).format(informationInstant(r.publishAt||r.created_at))===month).length,achieved:rows('donation_programs').filter(r=>r.status==='achieved').length};
}
export function dashboardNotices(summary:DashboardData|undefined,data:Row,allowed:(module:string)=>boolean,now=Date.now()){
 const notices=(summary?.attention||[]).filter(r=>allowed(r.target.module));
 const expired=allowed('announcements')?(data.announcements||[]).filter((r:Row)=>r.status==='published'&&announcementState(r,now)==='expired').length:0;
 return [...notices,...(expired?[{label:'Pengumuman telah berakhir',value:expired,helper:'Tinjau atau arsipkan informasi yang tidak berlaku.',icon:'megaphone',target:{module:'announcements'}}]:[])];
}

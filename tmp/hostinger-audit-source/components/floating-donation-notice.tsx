'use client';
import {useEffect,useState} from 'react';
import {noticeSettings,noticeCycle,noticeMessage,type Notice} from '../lib/donation-notice';
import '../app/floating-donation-notice.css';
export function FloatingDonationNotice(){
 const [current,setCurrent]=useState<{item:Notice;variant:number}|null>(null),[leaving,setLeaving]=useState(false),[motion,setMotion]=useState(0),[position,setPosition]=useState('left'),[closed,setClosed]=useState(false),[offset,setOffset]=useState(24);
 useEffect(()=>{
  if(closed)return;try{if(sessionStorage.getItem('darul-huda-notice-closed'))return}catch{}
  let disposed=false,pool:Notice[]=[],queue:Notice[]=[],settings=noticeSettings(),last='',serial=0,paused=true,showing=false,exit=false,deadline=0,pollDue=0,pending=false;
  const controller=new AbortController();
  const visible=(el:Element)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(el).visibility!=='hidden'};
  async function refresh(){if(pending)return;pending=true;pollDue=Date.now()+90000;try{const response=await fetch('/api/donation-notifications',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();const result=await response.json();if(disposed)return;settings=result.settings;setPosition(settings.position);const next:Notice[]=result.items;const newer=next.find(n=>!pool.some(p=>p.id===n.id));pool=next;queue=newer?[]:queue.flatMap(n=>next.filter(p=>p.id===n.id));if(!settings.enabled||showing){setCurrent(null);showing=false;exit=false;deadline=Date.now()+settings.gap*1000;}}catch{pool=[];queue=[];setCurrent(null);showing=false;}finally{pending=false}}
  function tick(){const now=Date.now();const blocked=document.hidden||!!Array.from(document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"],.opening-splash,.donation-confirmation')).find(visible);
   if(blocked){if(!paused){setCurrent(null);showing=false;exit=false;}paused=true;return;}
   if(paused){paused=false;deadline=now+settings.gap*1000;}
   if(now>=pollDue)void refresh();
   let bottom=innerWidth<768?92:24;const width=innerWidth<768?innerWidth-24:360,left=innerWidth<768||settings.position==='left'?12:innerWidth-width-24;
   for(const el of document.querySelectorAll('.floating-whatsapp,[data-bottom-cta],.donation-sticky-cta,.mobile-bottom-nav')){const r=el.getBoundingClientRect();if(visible(el)&&r.left<left+width&&r.right>left&&['fixed','sticky'].includes(getComputedStyle(el).position))bottom=Math.max(bottom,innerHeight-r.top+12)}setOffset(bottom);
   if(!settings.enabled||!pool.length||now<deadline)return;
   if(showing&&!exit){setLeaving(true);exit=true;deadline=now+300;return;}
   if(showing){setCurrent(null);showing=false;exit=false;deadline=now+settings.gap*1000;return;}
   if(!queue.length)queue=noticeCycle(pool,settings.count,last);const item=queue.shift();if(!item)return;last=item.id;setMotion(serial%3);setLeaving(false);setCurrent({item,variant:settings.template==='rotate'?serial%3:Number(settings.template)-1});serial++;showing=true;deadline=now+settings.duration*1000;
  }
  const timer=setInterval(tick,250);const onVisibility=()=>tick();document.addEventListener('visibilitychange',onVisibility);tick();return()=>{disposed=true;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)};
 },[closed]);
 function close(){setClosed(true);setCurrent(null);try{sessionStorage.setItem('darul-huda-notice-closed','1')}catch{}}
 return <aside className={'floating-donation-notice '+position+(leaving?' is-leaving':'')} style={{bottom:offset}} aria-live="polite" aria-atomic="true">{current&&<div className={"donation-notice-card motion-"+motion}><span className="donation-notice-icon" aria-hidden="true">♡</span><div><small>AMANAH TERVERIFIKASI</small><p>{noticeMessage(current.item,current.variant)}</p></div><button type="button" onClick={close} aria-label="Tutup notifikasi donasi untuk sesi ini" title="Tutup notifikasi">×</button></div>}</aside>;
}

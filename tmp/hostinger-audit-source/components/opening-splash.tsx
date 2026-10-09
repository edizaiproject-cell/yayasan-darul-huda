'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import '../app/opening-splash.css';
const SESSION_KEY='darul-huda-opening-v3-seen';
let seenInRuntime=false;
export function OpeningSplash({enabled,logo,children}:{enabled:boolean;logo:string;children:ReactNode}){
 const [visible,setVisible]=useState(enabled),[running,setRunning]=useState(false),[revealed,setRevealed]=useState(false),[exiting,setExiting]=useState(false),[sound,setSound]=useState(false);
 const audioRef=useRef<HTMLAudioElement>(null),ringRef=useRef<SVGCircleElement>(null),progressRef=useRef<HTMLDivElement>(null),gradientId=useId();
 useEffect(()=>{if(!enabled){setVisible(false);return}let seen=seenInRuntime;try{seen=seen||sessionStorage.getItem(SESSION_KEY)==='1'}catch{}if(seen){setVisible(false);return}setVisible(true);setRunning(true)},[enabled]);
 useEffect(()=>{if(!revealed)return;const timer=setTimeout(()=>setRevealed(false),300);return()=>clearTimeout(timer)},[revealed]);
 const covering=enabled&&visible;
 useEffect(()=>{
  if(!covering||!running)return;const audio=audioRef.current;if(!audio)return;
  let cancelled=false,finishing=false,followingAudio=false,failed=false,frame=0;
  let exitTimer:ReturnType<typeof setTimeout>|undefined;
  let start=performance.now(),base=0,progress=0,lastTime=0,lastAdvance=start;
  const duration=()=>!failed&&Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:3;
  const draw=(value:number)=>{progress=Math.max(0,Math.min(1,value));ringRef.current?.setAttribute('stroke-dashoffset',String(100-progress*100));progressRef.current?.setAttribute('aria-valuenow',String(Math.round(progress*100)))};
  const finish=()=>{if(cancelled||finishing)return;finishing=true;draw(1);audio.pause();setSound(false);setExiting(true);exitTimer=setTimeout(()=>{seenInRuntime=true;try{sessionStorage.setItem(SESSION_KEY,'1')}catch{}document.documentElement.dataset.openingSeen='true';setRevealed(true);setVisible(false)},500)};
  const silent=()=>{followingAudio=false;base=progress;start=performance.now();setSound(false)};
  const error=()=>{failed=true;silent()};
  const playing=()=>{if(cancelled||finishing){audio.pause();return}failed=false;followingAudio=true;lastTime=audio.currentTime;lastAdvance=performance.now();draw(audio.currentTime/duration());setSound(!audio.muted)};
  const pause=()=>{if(!finishing)silent()};
  const hide=()=>{if(document.hidden)audio.pause()};
  const tick=(now:number)=>{if(cancelled||finishing)return;if(followingAudio){if(audio.currentTime!==lastTime){lastTime=audio.currentTime;lastAdvance=now}if(now-lastAdvance>3500){audio.pause();error()}else draw(Math.min(.995,audio.currentTime/duration()))}else{draw(Math.max(progress,base+(now-start)/(duration()*1000)));if(progress>=1){finish();return}}frame=requestAnimationFrame(tick)};
  audio.addEventListener('playing',playing);audio.addEventListener('ended',finish);audio.addEventListener('pause',pause);audio.addEventListener('error',error);document.addEventListener('visibilitychange',hide);
  audio.volume=.8;draw(0);frame=requestAnimationFrame(tick);void audio.play().catch(()=>{if(!cancelled&&!finishing){if(audio.error)error();else silent()}});
  return()=>{cancelled=true;cancelAnimationFrame(frame);clearTimeout(exitTimer);audio.removeEventListener('playing',playing);audio.removeEventListener('ended',finish);audio.removeEventListener('pause',pause);audio.removeEventListener('error',error);document.removeEventListener('visibilitychange',hide);audio.pause()};
 },[covering,running]);
 async function toggleSound(){const audio=audioRef.current;if(!audio||exiting)return;if(!audio.paused){audio.muted=!audio.muted;setSound(!audio.muted);return}try{audio.muted=false;await audio.play();if(audioRef.current!==audio)audio.pause()}catch{setSound(false)}}
 return <>{covering&&<div className={'opening-splash '+(running?'is-running ':'')+(exiting?'is-exiting':'')} role="status" aria-label="Selamat datang di Yayasan Darul Huda">
 <audio ref={audioRef} src="/media/splash-bismillah.mp3" preload="auto" aria-hidden="true"/>
 <button type="button" className="opening-sound" onClick={toggleSound} disabled={exiting} aria-label={sound?'Matikan suara pembuka':'Putar bacaan Bismillah'} aria-pressed={sound}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>{sound?<path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>:<path d="m16 9 6 6m0-6-6 6"/>}</svg><span>{sound?'Suara aktif':'Aktifkan suara'}</span></button>
 <div className="opening-brand"><div ref={progressRef} className="opening-progress" role="progressbar" aria-label="Memuat Darul Huda" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-live="off">
 <svg className="opening-ring" viewBox="0 0 300 300" aria-hidden="true"><defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0F6B4F"/><stop offset="40%" stopColor="#2D9B68"/><stop offset="75%" stopColor="#D9A62E"/><stop offset="100%" stopColor="#F1C85A"/></linearGradient></defs><circle className="opening-ring-track" cx="150" cy="150" r="145"/><circle ref={ringRef} className="opening-ring-value" cx="150" cy="150" r="145" pathLength="100" stroke={`url(#${gradientId})`} strokeDasharray="100" strokeDashoffset="100"/></svg>
 <div className="opening-emblem"><img src={logo} alt="Logo Darul Huda" width="1254" height="1254" fetchPriority="high"/></div></div>
 <div className="opening-identity"><img src={logo} alt="MA’HAD AL-QUR’AN DARUL HUDA" width="1254" height="1254"/></div></div></div>}
 <div className={'opening-content '+(covering?'is-covered':revealed?'is-revealed':'')} inert={covering&&running}>{children}</div></>;
}

'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

const SESSION_KEY='darul-huda-opening-v3-seen';
const FALLBACK_SECONDS=6.031111;
const EXIT_MS=600;
let seenInRuntime=false;

export function OpeningSplash({enabled,logo,children}:{enabled:boolean;logo:string;children:ReactNode}){
 const [visible,setVisible]=useState(enabled),[running,setRunning]=useState(false),[revealed,setRevealed]=useState(false);
 const [exiting,setExiting]=useState(false),[sound,setSound]=useState(false);
 const audioRef=useRef<HTMLAudioElement>(null);
 useEffect(()=>{
  if(!enabled){setVisible(false);return}
  let seen=seenInRuntime;
  try{seen=seen||sessionStorage.getItem(SESSION_KEY)==='1'}catch{}
  if(seen){setVisible(false);return}
  setVisible(true);setRunning(true);
 },[enabled]);
 useEffect(()=>{if(!revealed)return;const timer=setTimeout(()=>setRevealed(false),300);return()=>clearTimeout(timer)},[revealed]);
 const covering=enabled&&visible;
 useEffect(()=>{
  if(!covering||!running)return;
  const audio=audioRef.current;if(!audio)return;
  let cancelled=false,finishing=false,hasPlayed=false;
  let timer:ReturnType<typeof setTimeout>,exitTimer:ReturnType<typeof setTimeout>;
  const startedAt=performance.now();
  const duration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:FALLBACK_SECONDS;
  const finish=()=>{
   if(cancelled||finishing)return;
   finishing=true;clearTimeout(timer);audio.pause();setSound(false);setExiting(true);
   exitTimer=setTimeout(()=>{
    seenInRuntime=true;
    try{sessionStorage.setItem(SESSION_KEY,'1')}catch{}
    document.documentElement.dataset.openingSeen='true';
    setRevealed(true);setVisible(false);
   },EXIT_MS);
  };
  const schedule=(ms:number)=>{clearTimeout(timer);if(!finishing&&!cancelled)timer=setTimeout(finish,Math.max(0,ms))};
  // Silent opening follows the recording length; actual playback finishes on ended.
  const silent=()=>schedule(hasPlayed?(duration()-audio.currentTime)*1000:duration()*1000-(performance.now()-startedAt));
  const playing=()=>{if(cancelled||finishing){audio.pause();return}hasPlayed=true;setSound(!audio.muted);schedule((duration()-audio.currentTime)*1000+15000)};
  const metadata=()=>{if(audio.paused)silent()};
  const pause=()=>{setSound(false);if(!finishing)silent()};
  const hide=()=>{if(document.hidden)audio.pause()};
  audio.addEventListener('loadedmetadata',metadata);
  audio.addEventListener('playing',playing);
  audio.addEventListener('ended',finish);
  audio.addEventListener('pause',pause);
  audio.addEventListener('error',finish);
  document.addEventListener('visibilitychange',hide);
  audio.volume=.8;
  silent();
  void audio.play().catch(()=>{if(!cancelled&&!finishing){setSound(false);silent()}});
  return()=>{
   cancelled=true;clearTimeout(timer);clearTimeout(exitTimer);
   audio.removeEventListener('loadedmetadata',metadata);audio.removeEventListener('playing',playing);
   audio.removeEventListener('ended',finish);audio.removeEventListener('pause',pause);audio.removeEventListener('error',finish);
   document.removeEventListener('visibilitychange',hide);audio.pause();
  };
 },[covering,running]);
 async function toggleSound(){
  const audio=audioRef.current;if(!audio||exiting)return;
  if(!audio.paused){audio.muted=!audio.muted;setSound(!audio.muted);return}
  try{audio.muted=false;await audio.play();if(audioRef.current!==audio)audio.pause()}catch{setSound(false)}
 }
 return <>
  {covering&&<div className={'opening-splash '+(running?'is-running ':'')+(exiting?'is-exiting':'')} role="status" aria-label="Selamat datang di Yayasan Darul Huda">
   <audio ref={audioRef} src="/media/splash-bismillah.mp3" preload="auto" aria-hidden="true"/>
   <button type="button" className="opening-sound" onClick={toggleSound} disabled={exiting} aria-label={sound?'Matikan suara pembuka':'Putar bacaan Bismillah'} aria-pressed={sound}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>{sound?<path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>:<path d="m16 9 6 6m0-6-6 6"/>}</svg><span>{sound?'Suara aktif':'Aktifkan suara'}</span></button>
   <div className="opening-halo" aria-hidden="true"/>
   <div className="opening-brand"><img className="opening-logo" src={logo} alt="Logo Darul Huda" width="1254" height="1254" fetchPriority="high"/><span className="opening-rule" aria-hidden="true"/></div>
  </div>}
  <div className={'opening-content '+(covering?'is-covered':revealed?'is-revealed':'')} inert={covering&&running}>{children}</div>
 </>
}


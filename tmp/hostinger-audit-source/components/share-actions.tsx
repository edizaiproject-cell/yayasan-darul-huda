'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {SocialIcon} from './social-icon';
import {shareLinks} from '../lib/share-links';
import '../app/share-actions.css';

export function ShareActions({title}:{title:string}){
 const path=usePathname(),[url,setUrl]=useState(''),[native,setNative]=useState(false),[notice,setNotice]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),generation=useRef(0),sharing=useRef(false);
 useEffect(()=>{setUrl(window.location.href);setNative(typeof navigator.share==='function');setNotice('');generation.current++;return()=>{generation.current++;clearTimeout(timer.current)}},[path,title]);
 const feedback=(text:string)=>{clearTimeout(timer.current);setNotice(text);timer.current=setTimeout(()=>setNotice(''),1800)};
 const copy=async()=>{const version=generation.current;try{await navigator.clipboard.writeText(window.location.href);if(version===generation.current)feedback('Tautan disalin')}catch{if(version===generation.current)feedback('Gagal menyalin. Salin alamat dari browser.')}};
 const share=async()=>{if(sharing.current)return;sharing.current=true;const version=generation.current;try{await navigator.share({title,url:window.location.href})}catch(e){if((e as Error).name!=='AbortError'&&version===generation.current)feedback('Tidak dapat membuka menu berbagi.')}finally{sharing.current=false}};
 const copied=notice==='Tautan disalin';
 return <section className="share-actions" aria-label="Bagikan halaman"><div className="share-actions-line"><span className="share-label">Bagikan</span><div className="share-icon-strip" role="group" aria-label="Pilihan berbagi">
  {shareLinks(title,url).map(({platform,label,href})=><a className="social-circle" data-platform={platform} key={platform} href={url?href:undefined} aria-disabled={!url} aria-label={label} title={label} target={platform==='email'?undefined:'_blank'} rel={platform==='email'?undefined:'noopener noreferrer'}><SocialIcon platform={platform}/><span className="social-tooltip" aria-hidden="true">{label}</span></a>)}
  <button type="button" className="social-circle" data-platform="copy" onClick={copy} aria-label="Salin tautan" title={copied?'Tautan disalin':'Salin tautan'} data-copied={copied||undefined}><SocialIcon platform={copied?'check':'link'}/><span className="social-tooltip" aria-hidden="true">{copied?'Tautan disalin':'Salin tautan'}</span></button>
  {native&&<button type="button" className="social-circle" data-platform="share" onClick={share} aria-label="Bagikan lainnya" title="Bagikan lainnya"><SocialIcon platform="share"/><span className="social-tooltip" aria-hidden="true">Bagikan lainnya</span></button>}
 </div></div><div className="share-feedback" role="status" aria-live="polite">{notice}</div></section>;
}

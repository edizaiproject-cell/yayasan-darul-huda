'use client';
import {cardImagePosition} from '../lib/card-image';
import {CardImagePlaceholder} from './card-image-placeholder';
import Link from 'next/link';
import {type CSSProperties} from 'react';
import {imagePosition} from '../lib/media-presets';
import {money} from '../lib/modules';
import {ProgramAction} from './institution-public';

type Row=Record<string,any>;
function Illustration({theme}:{theme:string}){
 return <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="39" strokeDasharray="2 7" opacity=".3"/>{theme==='language'?<><path d="M22 28h38v29H42L30 68V57h-8zM66 40h12v31H65l-9 9V66"/><path d="M31 39h20M31 47h14M64 51h6M64 59h6"/></>:theme==='service'||theme==='donasi'?<><path d="M26 59h15l10 7h15a5 5 0 0 1 0 10H43L24 66M21 57l-5 14M51 49 37 35c-10-12 7-22 14-9 7-13 24-3 14 9z"/><path d="m65 65 13-10c7-4 10 3 5 7L68 75"/></>:theme==='pendidikan'?<><path d="m18 38 32-15 32 15-32 15zM30 46v21c12 10 28 10 40 0V46M81 39v24"/><path d="M44 75h12"/></>:<><path d="M50 33c-10-8-20-8-29-4v40c10-4 19-4 29 4 10-8 19-8 29-4V29c-9-4-19-4-29 4zM50 33v40M29 39c5-1 9 0 13 2M29 49c5-1 9 0 13 2M58 41c4-2 8-3 13-2M58 51c4-2 8-3 13-2"/></>}</svg>;
}
export function HomeVisualCards({items,kind,baseUrl}:{items:Row[];kind:string;baseUrl:string}){
 return <div className="visual-card-grid">{items.map((r,index)=>{
  const title=String(r.title||'');
  const theme=kind!=='program'?kind:/bahasa|ilmu/i.test(title)?'language':/akhlak|pengabdian/i.test(title)?'service':'quran';
  const percentage=r.target>0?Math.round((r.total||0)/r.target*100):null;
  return <div className="visual-card-reveal scroll-reveal-card" key={r.id} style={{'--card-delay':`${Math.min(index*140,700)}ms`} as CSSProperties}><article className={'visual-card visual-card--'+kind}>
   <div className="visual-card-left"><div className={'visual-card-art '+(['pendidikan','donasi'].includes(kind)?'card-image-circle ':'')+(!r.image?'is-illustration':'')}>{r.image?<img src={r.image} alt={r.alt||title} loading="lazy" style={{objectPosition:['pendidikan','donasi'].includes(kind)?cardImagePosition(r).css:imagePosition(r.image)}}/>:kind==='donasi'?<CardImagePlaceholder title={title}/>:<Illustration theme={theme}/>}</div>{kind!=='donasi'&&<h3>{title}</h3>}</div>
   <div className="visual-card-panel"><span className="visual-card-category">{r.category||r.level||({pendidikan:'Unit Pendidikan',program:'Program Unggulan',donasi:'Program Donasi'} as Row)[kind]}</span>
    {kind==='donasi'&&<h3 className="visual-card-donation-title">{title}</h3>}{r.summary&&<p className="visual-card-summary">{r.summary}</p>}
    {kind==='donasi'?<div className="visual-card-funding"><span>Dana terkumpul</span><strong>{money(r.total||0)}</strong>{percentage!==null?<><div className="visual-card-progress" role="progressbar" aria-label={'Pencapaian '+title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,percentage)} aria-valuetext={`${percentage}% dari target ${money(r.target)}`}><span style={{width:Math.min(100,percentage)+'%'}}/></div><div className="visual-card-target"><span>Target {money(r.target)}</span><b>{percentage}%</b></div></>:<span>Program tanpa target dana</span>}</div>:<div className="visual-card-meta">{(kind==='pendidikan'?[r.location,r.schedule]:[r.programStatus,r.schedule||r.period]).filter(Boolean).slice(0,2).map((value,i)=><span key={i}>{value}</span>)}</div>}
    <div className="visual-card-actions">{kind==='program'&&<div className="visual-card-secondary"><ProgramAction item={r}/></div>}<Link href={baseUrl+'/'+r.slug} className="visual-card-link" aria-label={(kind==='donasi'?'Dukung Program: ':'Selengkapnya: ')+title}>{kind==='donasi'?'Dukung Program':'Selengkapnya'} <span aria-hidden="true">↗</span></Link></div>
   </div>
  </article></div>;
 })}</div>;
}

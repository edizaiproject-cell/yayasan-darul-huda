'use client';
import Link from 'next/link';
import {useState, type CSSProperties} from 'react';
import {type HomeGalleryPhoto} from '../lib/home-gallery';
import {imagePosition, imageVariant} from '../lib/media-presets';

function thumbnail(image:string){
 if(image.startsWith('/api/media-image?')){
  const query=new URL(image,'http://local').searchParams;
  query.set('purpose','thumbnail');
  return '/api/media-image?'+query;
 }
 return (/^\/(media|uploads)\//.test(image))?imageVariant(image,'thumbnail'):image;
}

/** Repeated cards are presentation only; the first set supplies keyboard links. */
export function HomeGallery({items,autoScroll=true,speed="normal"}:{items:HomeGalleryPhoto[];autoScroll?:boolean;speed?:string}){
 const [paused,setPaused]=useState(false);
 if(!items.length)return <p className="muted">Belum ada konten yang sesuai untuk bagian ini.</p>;
 const repeats=Math.max(1,Math.ceil(12/items.length));
 const cards=Array.from({length:repeats},()=>items).flat();
 return <div className={'home-gallery scroll-reveal-card'+(!autoScroll||paused?' is-paused':'')}>
  <div className="home-gallery-viewport" role="region" aria-label="Foto galeri dan berita Darul Huda">
   <div className="home-gallery-track" style={{'--gallery-duration':`${cards.length*({slow:12,normal:7,fast:4}[speed]||7)}s`} as CSSProperties}>
    {[0,1].map(group=><div className="home-gallery-group" key={group} aria-hidden={group===1?true:undefined}>
     {cards.map((item,index)=>{
      const duplicate=group===1||index>=items.length;
      return <Link key={`${item.id}-${index}`} className={'home-gallery-card'+(duplicate?' is-copy':'')} href={item.href} aria-label={(item.source==='news'?'Baca berita ':'Lihat album ')+item.title} tabIndex={duplicate?-1:undefined} aria-hidden={duplicate?true:undefined}>
       {item.image?<img src={thumbnail(item.image)} alt={item.alt||item.title} style={{objectPosition:imagePosition(item.image)}} width={240} height={280} loading="lazy" decoding="async"/>:<span className="home-gallery-placeholder">Darul Huda</span>}
       <span className="home-gallery-caption">{item.category&&<small>{item.category}</small>}<strong>{item.title}</strong></span>
      </Link>;
     })}
    </div>)}
   </div>
  </div>
  {autoScroll&&<div className="home-gallery-controls"><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}><span aria-hidden="true">{paused?'▶':'Ⅱ'}</span>{paused?'Putar galeri':'Jeda galeri'}</button></div>}
 </div>;
}

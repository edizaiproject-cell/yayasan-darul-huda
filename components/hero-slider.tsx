'use client';
import {appearanceDefaults} from '../lib/appearance';
import {imagePosition} from '../lib/media-presets';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ButtonLink} from './ui/button';

type Slide=Record<string,any>;
const AUTOPLAY_DELAY=8000;

function ControlIcon({name}:{name:'previous'|'next'|'play'|'pause'}){
 return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='pause'?<><path d="M8 5v14M16 5v14" strokeWidth="3"/></>:name==='play'?<path d="m9 5 10 7-10 7Z" fill="currentColor" stroke="none"/>:<path d={name==='previous'?'m14 5-7 7 7 7':'m10 5 7 7-7 7'}/>}</svg>
}

function HeroContent({slide:r}:{slide:Slide}){
 return <div className="container hero-content"><p className="eyebrow light">{r.label}</p><h1>{r.title}</h1><p className="hero-summary">{r.summary}</p><div className="actions">{r.primaryText&&r.primaryUrl&&<ButtonLink href={r.primaryUrl} size="lg">{r.primaryText} ↗</ButtonLink>}{r.secondaryText&&r.secondaryUrl&&<ButtonLink href={r.secondaryUrl} variant="outline" size="lg">{r.secondaryText}</ButtonLink>}</div></div>
}

function HeroSlide({slide,active,first,position,count}:{slide:Slide;active:boolean;first:boolean;position:number;count:number}){
 return <div className={'hero-slide '+(active?'is-active':'')+' hero-text-'+(slide.textPosition||'left')+' hero-vertical-'+(slide.verticalPosition||'center')+' hero-overlay-'+(slide.overlay||'medium')+' hero-color-'+(slide.textColor==='auto'?(slide.overlay==='none'?'dark':'light'):slide.textColor||'light')} role="group" aria-roledescription="slide" aria-label={`${position} dari ${count}`} aria-hidden={!active} inert={!active}>
  <picture>{slide.mobileImage&&<source media="(max-width: 600px)" srcSet={slide.mobileImage}/>}<img src={slide.image} alt={slide.alt||slide.title} style={{'--hero-focus':slide.image?.includes('fx=')?imagePosition(slide.image):slide.focus||'center','--hero-mobile-focus':slide.mobileImage?.includes('fx=')?imagePosition(slide.mobileImage):slide.image?.includes('fx=')?imagePosition(slide.image):slide.focus||'center'} as CSSProperties} fetchPriority={first?'high':'auto'} loading={first?'eager':'lazy'}/></picture>
  <div className="hero-shade"/><HeroContent slide={slide}/>
 </div>
}

function HeroControls({count,index,playing,onSelect,onToggle}:{count:number;index:number;playing:boolean;onSelect:(index:number)=>void;onToggle:()=>void}){
 const indicators=useRef<HTMLDivElement>(null);
 useEffect(()=>{const list=indicators.current,active=list?.children[index] as HTMLElement|undefined;if(!list||!active)return;const left=active.offsetLeft;if(left<list.scrollLeft||left+active.offsetWidth>list.scrollLeft+list.clientWidth)list.scrollTo({left:left-(list.clientWidth-active.offsetWidth)/2,behavior:'instant'})},[index,count]);
 return <div className="hero-controls" role="group" aria-label="Kontrol hero slider">
  <button type="button" className="hero-control" aria-label="Slide sebelumnya" onClick={()=>onSelect((index+count-1)%count)}><ControlIcon name="previous"/></button>
  <div ref={indicators} className="hero-indicators" role="group" aria-label="Pilih slide">{Array.from({length:count},(_,i)=><button type="button" key={i} className={'hero-indicator '+(i===index?'is-active':'')} aria-current={i===index?'true':undefined} aria-label={`Tampilkan slide ${i+1}`} onClick={()=>onSelect(i)}><span/></button>)}</div>
  <button type="button" className="hero-control" aria-label="Slide berikutnya" onClick={()=>onSelect((index+1)%count)}><ControlIcon name="next"/></button>
  <button type="button" className="hero-control hero-autoplay" data-autoplay-toggle aria-label={playing?'Jeda putar otomatis':'Putar otomatis'} onClick={onToggle}><ControlIcon name={playing?'pause':'play'}/></button>
 </div>
}

export function HeroSlider({slides}:{slides:Slide[]}){
 slides=slides.filter(r=>r.showOnHome!==false).map(r=>appearanceDefaults('hero_slides',r)).sort((a,b)=>Number(!!b.primary)-Number(!!a.primary)||a.sort_order-b.sort_order);
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(true),[pageHidden,setPageHidden]=useState(false),[revision,setRevision]=useState(0);
 const count=slides.length,activeIndex=count?index%count:0;
 useEffect(()=>{const motion=window.matchMedia('(prefers-reduced-motion: reduce)');const preference=()=>{if(motion.matches)setPlaying(false)};preference();motion.addEventListener('change',preference);const visibility=()=>setPageHidden(document.hidden);visibility();document.addEventListener('visibilitychange',visibility);return()=>{motion.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility)}},[]);
 useEffect(()=>{if(!playing||pageHidden||count<2)return;const timer=setTimeout(()=>setIndex(i=>(i+1)%count),AUTOPLAY_DELAY);return()=>clearTimeout(timer)},[index,playing,pageHidden,count,revision]);
 if(!count)return null;
 const select=(next:number)=>{setIndex(next);setRevision(r=>r+1);setPlaying(false)};
 return <section className={'hero hero-slider '+(count>1?'has-controls':'')+' hero-height-'+(slides[activeIndex].height||'normal')} aria-label="Sorotan Darul Huda" aria-roledescription="carousel" onFocusCapture={e=>{if(!(e.target as HTMLElement).closest('[data-autoplay-toggle]'))setPlaying(false)}}>
  <div className="hero-slides">{slides.map((slide,i)=><HeroSlide key={slide.id||i} slide={slide} active={i===activeIndex} first={i===0} position={i+1} count={count}/>)}</div>
  {count>1&&<HeroControls count={count} index={activeIndex} playing={playing} onSelect={select} onToggle={()=>{setPlaying(p=>!p);setRevision(r=>r+1)}}/>}
  {count>1&&<span className="sr-only" aria-live={playing?'off':'polite'} aria-atomic="true">Slide {activeIndex+1} dari {count}: {slides[activeIndex].title}</span>}
 </section>
}

'use client';
import {heroEffect,heroFallback} from '../lib/appearance-builder';
import {appearanceDefaults} from '../lib/appearance';
import {imagePosition} from '../lib/media-presets';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {ButtonLink} from './ui/button';

type Slide=Record<string,any>;
const AUTOPLAY_DELAY=4000;
const EFFECTS=['panels','diagonal','zoom','split','curtain'] as const;
type Transition={from:number|null;effect:typeof EFFECTS[number]|'fade'|'slide';serial:number};

function ControlIcon({name}:{name:'previous'|'next'|'play'|'pause'}){
 return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='pause'?<><path d="M8 5v14M16 5v14" strokeWidth="3"/></>:name==='play'?<path d="m9 5 10 7-10 7Z" fill="currentColor" stroke="none"/>:<path d={name==='previous'?'m14 5-7 7 7 7':'m10 5 7 7-7 7'}/>}</svg>
}

function HeroContent({slide:r}:{slide:Slide}){
 return <div className="container hero-content"><p className="eyebrow light">{r.label}</p><h1>{r.title}</h1><p className="hero-summary">{r.summary}</p>{r.description&&<p className="hero-description">{r.description}</p>}<div className="actions">{r.primaryText&&r.primaryUrl&&<ButtonLink href={r.primaryUrl} size="lg">{r.primaryText} ↗</ButtonLink>}{r.secondaryText&&r.secondaryUrl&&<ButtonLink href={r.secondaryUrl} variant="outline" size="lg">{r.secondaryText}</ButtonLink>}</div></div>
}

function HeroImage({slide,first=false,decorative=false}:{slide:Slide;first?:boolean;decorative?:boolean}){return <picture>{slide.mobileImage&&<source media="(max-width: 600px)" srcSet={slide.mobileImage}/>}<img src={slide.image} alt={decorative?'':slide.alt||slide.title} style={{'--hero-focus':slide.image?.includes('fx=')?imagePosition(slide.image):slide.focus||'center','--hero-mobile-focus':slide.mobileImage?.includes('fx=')?imagePosition(slide.mobileImage):slide.image?.includes('fx=')?imagePosition(slide.image):slide.focus||'center'} as CSSProperties} fetchPriority={first?'high':'auto'} loading={first||decorative?'eager':'lazy'}/></picture>}

function HeroSlide({slide,active,first,position,count,transition,outgoing}:{slide:Slide;active:boolean;first:boolean;position:number;count:number;transition:Transition;outgoing?:Slide}){
 return <div className={'hero-slide '+(active?'is-active':'')+' hero-text-'+(slide.textPosition||'left')+' hero-vertical-'+(slide.verticalPosition||'center')+' hero-overlay-'+(slide.overlay||'medium')+' hero-color-'+(slide.textColor==='auto'?(slide.overlay==='none'?'dark':'light'):slide.textColor||'light')} role="group" aria-roledescription="slide" aria-label={`${position} dari ${count}`} aria-hidden={!active} inert={!active}>
  <HeroImage slide={slide} first={first}/>
  {active&&outgoing&&<div key={transition.serial} className="hero-transition" aria-hidden="true">{Array.from({length:transition.effect==='panels'?8:transition.effect==='split'?2:1},(_,i)=><div key={i} className="hero-transition-piece" style={{'--piece':i,'--pieces':transition.effect==='panels'?8:2,'--direction':i%2?-1:1} as CSSProperties}><HeroImage slide={outgoing} decorative/></div>)}{transition.effect==='curtain'&&<div className="hero-transition-curtain"/>}</div>}

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
 if(!slides.length)slides=[heroFallback()];
 slides=slides.filter(r=>r.showOnHome!==false).map(r=>appearanceDefaults('hero_slides',r)).sort((a,b)=>a.sort_order-b.sort_order);
 if(!slides.length)slides=[heroFallback()];
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(true),[pageHidden,setPageHidden]=useState(false),[revision,setRevision]=useState(0);
 const [transition,setTransition]=useState<Transition>({from:null,effect:'zoom',serial:0});
 const [lightweight,setLightweight]=useState(false),[covered,setCovered]=useState(true);
 const root=useRef<HTMLElement>(null),sequence=useRef(0);
 const count=slides.length,activeIndex=count?index%count:0;
 const move=useCallback((next:number)=>{if(next===activeIndex)return;const serial=sequence.current++;setTransition({from:activeIndex,effect:lightweight?'fade':heroEffect(slides[next]?.transition,serial) as Transition['effect'],serial:serial+1});setIndex(next)},[activeIndex,lightweight,slides]);
 useEffect(()=>{const motion=window.matchMedia('(prefers-reduced-motion: reduce)');const preference=()=>{if(motion.matches)setPlaying(false);const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;setLightweight(motion.matches||!!connection?.saveData||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4))};preference();motion.addEventListener('change',preference);const visibility=()=>setPageHidden(document.hidden);visibility();document.addEventListener('visibilitychange',visibility);return()=>{motion.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility)}},[]);
 useEffect(()=>{const opening=root.current?.closest('.opening-content');if(!opening){setCovered(false);return}const update=()=>setCovered(opening.classList.contains('is-covered'));update();const observer=new MutationObserver(update);observer.observe(opening,{attributes:true,attributeFilter:['class']});return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!playing||pageHidden||covered||count<2)return;const timer=setTimeout(()=>move((activeIndex+1)%count),(Number(slides[activeIndex]?.duration)||5)*1000);return()=>clearTimeout(timer)},[activeIndex,playing,pageHidden,covered,count,revision,move]);
 useEffect(()=>{if(transition.from===null)return;const timer=setTimeout(()=>setTransition(t=>({...t,from:null})),({fast:400,normal:650,slow:1100}[slides[activeIndex]?.transitionSpeed as string]||650)+60);return()=>clearTimeout(timer)},[transition.serial]);
 // Preload adjacent images only, using the appropriate mobile source.
 const nextSlide=slides[(activeIndex+1)%count],previousSlide=slides[(activeIndex+count-1)%count];
 useEffect(()=>{const mobile=window.matchMedia('(max-width: 600px)').matches;for(const slide of [nextSlide,previousSlide]){const src=mobile&&slide?.mobileImage?slide.mobileImage:slide?.image;if(src){const image=new Image();image.src=src;void image.decode().catch(()=>{})}}},[nextSlide?.image,nextSlide?.mobileImage,previousSlide?.image,previousSlide?.mobileImage]);
 if(!count)return null;
 const select=(next:number)=>{move(next);setRevision(r=>r+1);setPlaying(false)};
 return <section ref={root} style={{'--hero-crossfade':({fast:'400ms',normal:'650ms',slow:'1100ms'} as Record<string,string>)[slides[activeIndex]?.transitionSpeed]||'650ms'} as CSSProperties} data-transition={lightweight?'fade':transition.effect} className={'hero hero-slider '+(count>1?'has-controls':'')+' hero-height-'+(slides[activeIndex].height||'normal')} aria-label="Sorotan Darul Huda" aria-roledescription="carousel" onFocusCapture={e=>{if(!(e.target as HTMLElement).closest('[data-autoplay-toggle]'))setPlaying(false)}}>
  <div className="hero-slides">{slides.map((slide,i)=><HeroSlide key={slide.id||i} slide={slide} active={i===activeIndex} first={i===0} position={i+1} count={count} transition={transition} outgoing={transition.from===null?undefined:slides[transition.from]}/>)}</div>
  {count>1&&<HeroControls count={count} index={activeIndex} playing={playing} onSelect={select} onToggle={()=>{setPlaying(p=>!p);setRevision(r=>r+1)}}/>}
  {count>1&&<span className="sr-only" aria-live={playing?'off':'polite'} aria-atomic="true">Slide {activeIndex+1} dari {count}: {slides[activeIndex].title}</span>}
 </section>
}

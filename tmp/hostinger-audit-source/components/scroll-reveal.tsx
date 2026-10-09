'use client';
import {useEffect,useRef,type ReactNode} from 'react';

/** One observer for all homepage card groups; the inner card owns hover motion. */
export function ScrollRevealScope({children}:{children:ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const container=root.current,win=container?.ownerDocument.defaultView;
  if(!container||!win)return;
  const cards=Array.from(container.querySelectorAll<HTMLElement>('.scroll-reveal-card'));
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  let observer:IntersectionObserver|undefined;
  const reveal=(card:HTMLElement)=>{card.classList.add('is-visible');observer?.unobserve(card)};
  const revealAll=()=>{cards.forEach(reveal);observer?.disconnect()};
  if(reduced.matches||!('IntersectionObserver' in win)){revealAll();return}
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=.2)reveal(entry.target as HTMLElement);
  },{threshold:.2});
  cards.forEach(card=>{if(!card.classList.contains('is-visible')){card.dataset.revealReady='true';observer!.observe(card)}});
  // Keyboard navigation must never focus an invisible link.
  const focus=(event:FocusEvent)=>{const card=(event.target as HTMLElement).closest<HTMLElement>('.scroll-reveal-card');if(card){card.style.setProperty('--card-delay','0ms');reveal(card)}};
  const preference=()=>{if(reduced.matches)revealAll()};
  container.addEventListener('focusin',focus);reduced.addEventListener('change',preference);
  return()=>{observer?.disconnect();container.removeEventListener('focusin',focus);reduced.removeEventListener('change',preference);cards.forEach(card=>delete card.dataset.revealReady)};
 },[children]);
 return <div ref={root} className="scroll-reveal-scope">{children}</div>;
}

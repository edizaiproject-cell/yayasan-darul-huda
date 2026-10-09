 'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
export function FloatingForm({title,onClose,busy=false,children}:{title:string;onClose:()=>void;busy?:boolean;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const el=ref.current,previous=document.activeElement as HTMLElement|null;el?.showModal();return()=>{el?.close();previous?.focus()}},[]);
 return createPortal(<dialog ref={ref} className="floating-entry" aria-label={title} data-validation-skip onCancel={e=>{e.preventDefault();if(!busy)close.current()}}><div className="floating-entry-heading"><h2>{title}</h2><button type="button" disabled={busy} aria-label={'Tutup '+title} onClick={()=>close.current()}>×</button></div>{children}</dialog>,document.body);
}
